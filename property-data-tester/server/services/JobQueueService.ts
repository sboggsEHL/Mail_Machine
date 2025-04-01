import { BatchJob, BatchJobLog } from '../models';
import { BatchJobService } from './BatchJobService';
import { PropertyBatchService } from './PropertyBatchService';
import { Pool } from 'pg';

/**
 * Job queue service using PostgreSQL
 */
export class JobQueueService {
  private isProcessing = false;
  private pollInterval = 5000; // 5 seconds
  private maxConcurrentJobs = 5;
  private activeJobs = 0;
  private workerName = `worker-${Math.random().toString(36).substring(2, 10)}`;
  private intervalId: NodeJS.Timeout | null = null;
  
  constructor(
    private batchJobService: BatchJobService,
    private propertyService: PropertyBatchService,
    private pool?: Pool
  ) {
    // Start polling for jobs
    this.startPolling();
    console.log(`Job queue service initialized with worker ID: ${this.workerName}`);
  }

  /**
   * Add a job to the queue
   * @param jobData The job data
   * @param priority The job priority
   * @returns The created job
   */
  async addJob(
    jobData: { 
      criteria: Record<string, any>;
      batchSize?: number;
      jobId: number;
    },
    priority = 0
  ): Promise<BatchJob | null> {
    // Create or update job in database
    const job = await this.batchJobService.getJobById(jobData.jobId);
    
    if (job) {
      // Update existing job
      console.log(`Updating existing job ${jobData.jobId} to PENDING status`);
      return this.batchJobService.updateJobStatus(jobData.jobId, 'PENDING');
    } else {
      // Create new job
      console.log(`Creating new job with ID ${jobData.jobId} and priority ${priority}`);
      return this.batchJobService.createJob({
        job_id: jobData.jobId,
        status: 'PENDING',
        criteria: jobData.criteria,
        created_by: 'system',
        priority: priority
      });
    }
  }

  /**
   * Start polling for jobs
   */
  private startPolling() {
    this.intervalId = setInterval(async () => {
      if (!this.isProcessing && this.activeJobs < this.maxConcurrentJobs) {
        this.isProcessing = true;
        try {
          await this.processNextJob();
        } catch (error) {
          console.error('Error processing job:', error);
        } finally {
          this.isProcessing = false;
        }
      }
    }, this.pollInterval);
    
    console.log(`Started polling for jobs every ${this.pollInterval}ms`);
  }

  /**
   * Stop polling for jobs
   */
  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Stopped polling for jobs');
    }
  }

  /**
   * Process the next available job
   */
  private async processNextJob() {
    // Get and lock the next job
    const job = await this.acquireJob();
    
    if (!job) {
      return; // No jobs available
    }
    
    this.activeJobs++;
    console.log(`Processing job ${job.job_id} (${this.activeJobs} active jobs)`);
    
    try {
      // Process the job
      await this.processJob(job);
    } catch (error: any) {
      // Handle job failure
      console.error(`Job ${job.job_id} failed:`, error);
      await this.batchJobService.updateJobStatus(
        job.job_id!, 
        'FAILED', 
        error.message
      );
      await this.batchJobService.logJobProgress(
        job.job_id!, 
        `Job failed: ${error.message}`, 
        'ERROR'
      );
    } finally {
      // Release the job lock
      await this.releaseJob(job.job_id!);
      this.activeJobs--;
    }
  }

  /**
   * Acquire a job for processing
   * @returns The acquired job or null if none available
   */
  private async acquireJob(): Promise<BatchJob | null> {
    if (!this.pool) {
      // If pool is not provided, use the repository's getNextPendingJob method
      const job = await this.batchJobService.getNextPendingJob();
      
      if (job) {
        // Mark as processing
        await this.batchJobService.updateJobStatus(job.job_id!, 'PROCESSING');
        await this.batchJobService.incrementJobAttempt(job.job_id!);
        return job;
      }
      
      return null;
    }
    
    // Use a transaction to safely get and lock a job
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the next available job
      const result = await client.query(`
        UPDATE batch_jobs
        SET 
          status = 'PROCESSING',
          locked_at = NOW(),
          locked_by = $1,
          attempts = COALESCE(attempts, 0) + 1
        WHERE job_id = (
          SELECT job_id
          FROM batch_jobs
          WHERE 
            status = 'PENDING'
            AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
            AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '10 minutes')
          ORDER BY priority DESC, created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `, [this.workerName]);
      
      await client.query('COMMIT');
      
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error acquiring job:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Release a job lock
   * @param jobId The job ID
   */
  private async releaseJob(jobId: number): Promise<void> {
    if (!this.pool) {
      return;
    }
    
    try {
      await this.pool.query(`
        UPDATE batch_jobs
        SET locked_at = NULL, locked_by = NULL
        WHERE job_id = $1 AND locked_by = $2
      `, [jobId, this.workerName]);
      
      console.log(`Released lock on job ${jobId}`);
    } catch (error) {
      console.error(`Error releasing job ${jobId}:`, error);
    }
  }

  /**
   * Schedule a job for retry
   * @param jobId The job ID
   * @param delaySeconds Delay in seconds before retry
   */
  async scheduleRetry(jobId: number, delaySeconds: number): Promise<BatchJob | null> {
    if (!this.pool) {
      // Simple implementation without next_attempt_at
      return this.batchJobService.updateJobStatus(jobId, 'PENDING');
    }
    
    try {
      const result = await this.pool.query(`
        UPDATE batch_jobs
        SET 
          status = 'PENDING',
          locked_at = NULL,
          locked_by = NULL,
          next_attempt_at = NOW() + INTERVAL '${delaySeconds} seconds'
        WHERE job_id = $1
        RETURNING *
      `, [jobId]);
      
      console.log(`Scheduled job ${jobId} for retry in ${delaySeconds} seconds`);
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error(`Error scheduling retry for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Process a job
   * @param job The job to process
   */
  private async processJob(job: BatchJob): Promise<void> {
    try {
      const { criteria, job_id: jobId } = job;
      const batchSize = 400; // Default batch size
      
      // Update job status to PROCESSING
      await this.batchJobService.updateJobStatus(jobId!, 'PROCESSING');
      await this.batchJobService.logJobProgress(jobId!, 'Job started processing');
      
      // Get total count (could be an estimate)
      const totalCountResult = await this.propertyService.getEstimatedCount(criteria);
      const totalCount = totalCountResult.count || 0;
      
      // Update job with total count
      await this.batchJobService.updateJobProgress(jobId!, 0, totalCount, 0, 0);
      await this.batchJobService.logJobProgress(jobId!, `Estimated total records: ${totalCount}`);
      
      // Process in batches
      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;
      let hasMoreRecords = true;
      let startIndex = 0;
      
      while (hasMoreRecords) {
        // Fetch batch from PropertyRadar
        await this.batchJobService.logJobProgress(jobId!, `Fetching batch starting at index ${startIndex}`);
        
        const batchResult = await this.propertyService.getProperties(
          criteria,
          job.job_id?.toString() || 'batch-job',  // Use job_id as campaign ID
          batchSize,
          startIndex
        );
        
        // Process and store the batch
        const batchRecords = batchResult.properties || [];
        await this.batchJobService.logJobProgress(
          jobId!, 
          `Processing batch with ${batchRecords.length} records`
        );
        
        // Here you would process and store the records
        // For now, we'll just simulate success
        const batchSuccessCount = batchRecords.length;
        const batchErrorCount = 0;
        
        // Update counts
        processedCount += batchRecords.length;
        successCount += batchSuccessCount;
        errorCount += batchErrorCount;
        
        // Update progress
        await this.batchJobService.updateJobProgress(
          jobId!,
          processedCount,
          totalCount,
          successCount,
          errorCount
        );
        
        // Report progress
        const percentComplete = Math.floor((processedCount / totalCount) * 100);
        await this.batchJobService.logJobProgress(
          jobId!,
          `Processed ${processedCount} of ${totalCount} records (${percentComplete}%)`
        );
        
        // Check if we need to continue
        hasMoreRecords = batchResult.hasMore || false;
        startIndex += batchSize;
        
        // Add a small delay to avoid hitting rate limits
        if (hasMoreRecords) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Mark job as completed
      await this.batchJobService.updateJobStatus(jobId!, 'COMPLETED');
      await this.batchJobService.logJobProgress(
        jobId!,
        `Job completed. Processed ${processedCount} records with ${successCount} successes and ${errorCount} errors.`
      );
      
    } catch (error: any) {
      // Log error and update job status
      console.error(`Job ${job.job_id} failed:`, error);
      await this.batchJobService.updateJobStatus(job.job_id!, 'FAILED', error.message);
      await this.batchJobService.logJobProgress(job.job_id!, `Job failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @returns Queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      // Query the database for job counts by status
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'PENDING') AS waiting,
          COUNT(*) FILTER (WHERE status = 'PROCESSING') AS active,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
          COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
          COUNT(*) FILTER (WHERE status = 'PENDING' AND next_attempt_at > NOW()) AS delayed
        FROM batch_jobs
      `;
      
      if (!this.pool) {
        // Simplified implementation without direct pool access
        const jobs = await this.batchJobService.getJobs();
        
        const waiting = jobs.filter(j => j.status === 'PENDING').length;
        const active = jobs.filter(j => j.status === 'PROCESSING').length;
        const completed = jobs.filter(j => j.status === 'COMPLETED').length;
        const failed = jobs.filter(j => j.status === 'FAILED').length;
        const delayed = 0; // Can't determine without next_attempt_at
        
        return { waiting, active, completed, failed, delayed };
      }
      
      const result = await this.pool.query(query);
      const stats = result.rows[0];
      
      return {
        waiting: parseInt(stats.waiting) || 0,
        active: parseInt(stats.active) || 0,
        completed: parseInt(stats.completed) || 0,
        failed: parseInt(stats.failed) || 0,
        delayed: parseInt(stats.delayed) || 0
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0
      };
    }
  }

  /**
   * Clean completed and failed jobs
   * @returns Promise that resolves when the queue is cleaned
   */
  async cleanQueue(): Promise<void> {
    try {
      if (!this.pool) {
        console.log('Pool not available for cleaning queue');
        return;
      }
      
      // Delete completed and failed jobs older than 7 days
      await this.pool.query(`
        DELETE FROM batch_jobs
        WHERE 
          (status = 'COMPLETED' OR status = 'FAILED')
          AND updated_at < NOW() - INTERVAL '7 days'
      `);
      
      console.log('Cleaned queue of old completed and failed jobs');
    } catch (error) {
      console.error('Error cleaning queue:', error);
    }
  }
}