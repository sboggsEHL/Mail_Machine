import { BatchJob, BatchJobLog } from '../models';
import { BatchJobService } from './BatchJobService';
import { PropertyBatchService } from './PropertyBatchService';
import { PropertyPayloadService } from './PropertyPayloadService';
import { Pool } from 'pg';
import { AppError, ERROR_CODES } from '../utils/errors';
import logger from '../utils/logger';

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
    logger.info(`Job queue service initialized with worker ID: ${this.workerName}`);
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
      logger.info(`Updating existing job ${jobData.jobId} to PENDING status`);
      return this.batchJobService.updateJobStatus(jobData.jobId, 'PENDING');
    } else {
      // Create new job
      logger.info(`Creating new job with ID ${jobData.jobId} and priority ${priority}`);
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
          logger.error('Error processing job:', error);
        } finally {
          this.isProcessing = false;
        }
      }
    }, this.pollInterval);
    
    logger.info(`Started polling for jobs every ${this.pollInterval}ms`);
  }

  /**
   * Stop polling for jobs
   */
  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped polling for jobs');
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
    logger.info(`Processing job ${job.job_id} (${this.activeJobs} active jobs)`);
    
    try {
      // Process the job
      await this.processJob(job);
    } catch (error: any) {
      // Handle job failure
      logger.error(`Job ${job.job_id} failed:`, error);
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
      
      // If this is a child job, update the parent's progress even after failure
      if (job.parent_job_id) {
        await this.batchJobService.updateParentJobProgress(job.parent_job_id);
        await this.batchJobService.updateParentJobStatus(job.parent_job_id);
      }
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
      // IMPORTANT: We only select jobs with status 'PENDING' to prevent failed jobs from being automatically reprocessed
      // Failed jobs must be manually reset to 'PENDING' status if they need to be retried
      // Also filter out parent jobs (is_parent = true)
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
            AND (is_parent = false OR is_parent IS NULL)
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
      logger.error('Error acquiring job:', error);
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
      
      logger.info(`Released lock on job ${jobId}`);
    } catch (error) {
      logger.error(`Error releasing job ${jobId}:`, error);
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
      
      logger.info(`Scheduled job ${jobId} for retry in ${delaySeconds} seconds`);
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error scheduling retry for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Check for existing batches for a job
   * @param campaignId The campaign ID (job ID as string)
   * @returns Array of batch file statuses
   */
  private async checkExistingBatches(campaignId: string): Promise<any[]> {
    if (!this.pool) {
      return [];
    }
    
    try {
      const result = await this.pool.query(`
        SELECT * FROM batch_file_status
        WHERE campaign_id = $1
        ORDER BY batch_number ASC
      `, [campaignId]);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error checking existing batches for campaign ${campaignId}:`, error);
      return [];
    }
  }

  /**
   * Process a job
   * @param job The job to process
   */
  private async processJob(job: BatchJob): Promise<void> {
    try {
      // Check if this is a parent job - if so, just update its progress
      if (job.is_parent) {
        await this.batchJobService.logJobProgress(job.job_id!, 'Parent job - updating progress only');
        await this.batchJobService.updateParentJobProgress(job.job_id!);
        await this.batchJobService.updateParentJobStatus(job.job_id!);
        return;
      }

      const { criteria, job_id: jobId } = job;
      
      // Update job status to PROCESSING
      await this.batchJobService.updateJobStatus(jobId!, 'PROCESSING');
      await this.batchJobService.logJobProgress(jobId!, 'Job started processing');
      
      // Check if this is a child job
      if (job.parent_job_id) {
        await this.batchJobService.logJobProgress(
          jobId!,
          `Processing as child job for parent ${job.parent_job_id}, batch ${job.batch_number}`
        );
      }
      
      // For child jobs, use the batch-specific processing
      if (job.parent_job_id && job.batch_number && (job.batch_size !== undefined)) {
        // Process just this batch
        await this.processBatchJob(job);
      } else {
        // For backward compatibility, process as a regular job
        await this.processRegularJob(job);
      }
      
      // Mark job as completed
      await this.batchJobService.updateJobStatus(jobId!, 'COMPLETED');
      
      // If this is a child job, update the parent's progress
      if (job.parent_job_id) {
        await this.batchJobService.updateParentJobProgress(job.parent_job_id);
        await this.batchJobService.updateParentJobStatus(job.parent_job_id);
      }
      
    } catch (error: any) {
      // Log error and update job status
      logger.error(`Job ${job.job_id} failed:`, error);
      await this.batchJobService.updateJobStatus(job.job_id!, 'FAILED', error.message);
      await this.batchJobService.logJobProgress(job.job_id!, `Job failed: ${error.message}`, 'ERROR');
      
      // If this is a child job, update the parent's progress even after failure
      if (job.parent_job_id) {
        await this.batchJobService.updateParentJobProgress(job.parent_job_id);
        await this.batchJobService.updateParentJobStatus(job.parent_job_id);
      }
      
      throw error;
    }
  }
  
  /**
   * Process a batch job (child job)
   * @param job The batch job to process
   */
  private async processBatchJob(job: BatchJob): Promise<void> {
    try {
      const { criteria, job_id: jobId, batch_number: batchNumber } = job;
      
      // Get batch-specific IDs from criteria
      const batchRadarIds = criteria.RadarID;
      if (!batchRadarIds || !Array.isArray(batchRadarIds)) {
        throw new Error('Invalid batch criteria: RadarID array required');
      }
      
      await this.batchJobService.logJobProgress(
        jobId!,
        `Processing batch ${batchNumber} with ${batchRadarIds.length} properties`
      );
      
      // Update job with total count for this batch
      const totalCount = batchRadarIds.length;
      await this.batchJobService.updateJobProgress(jobId!, 0, totalCount, 0, 0);
      
      // Process and store the properties
      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;
      
      try {
        // Fetch full raw property data for each RadarID (main branch behavior)
        const providerCode = criteria.provider_code || this.propertyService.getProviderCode();
        const leadProviderFactory = require('./lead-providers/LeadProviderFactory').leadProviderFactory;
        const provider = leadProviderFactory.getProvider(providerCode);

        // Define fields to fetch (should match PropertyBatchService)
        const fields = [
          'RadarID', 'PType', 'Address', 'City', 'State', 'ZipFive', 'County', 'APN',
          'Owner', 'OwnerFirstName', 'OwnerLastName', 'OwnerSpouseFirstName', 'OwnershipType',
          'isSameMailingOrExempt', 'isMailVacant', 'PhoneAvailability', 'EmailAvailability',
          'AVM', 'AvailableEquity', 'EquityPercent', 'CLTV', 'TotalLoanBalance', 'NumberLoans',
          'FirstDate', 'FirstAmount', 'FirstRate', 'FirstRateType', 'FirstTermInYears',
          'FirstLoanType', 'FirstPurpose', 'FirstLenderOriginal', 'SecondDate', 'SecondAmount', 'SecondLoanType',
          'AnnualTaxes', 'EstimatedTaxRate',
          'LastTransferRecDate', 'LastTransferValue', 'LastTransferDownPaymentPercent', 'LastTransferSeller',
          'isListedForSale', 'ListingPrice', 'DaysOnMarket', 'inForeclosure', 'ForeclosureStage',
          'DefaultAmount', 'inTaxDelinquency', 'DelinquentAmount', 'DelinquentYear'
        ];

        const batchRawPayloads: any[] = [];
        for (const radarId of batchRadarIds) {
          try {
            if (!provider.fetchPropertyById) {
              throw new Error(`Provider ${providerCode} does not support fetching by ID.`);
            }
            const rawResponse = await provider.fetchPropertyById(radarId, fields);
            batchRawPayloads.push(rawResponse);
          } catch (error) {
            logger.error(`Error fetching property ${radarId}:`, error);
          }
        }

        // Save the full raw payloads to file (main branch behavior)
        try {
          const campaignId = jobId!.toString();
          const batchNum = job.batch_number || 1;
          const dbPool = this.pool || (this.propertyService as any).pool;
          if (dbPool) {
            const payloadService = new PropertyPayloadService(dbPool);
            await payloadService.savePropertyPayload(
              batchRawPayloads,
              campaignId,
              batchNum
            );
            logger.info(`Saved raw property payload for batch ${batchNum} to file system`);
          } else {
            logger.warn(`Could not save property payload - no database pool available`);
          }
        } catch (payloadError) {
          logger.error(`Error saving property payload to file: ${payloadError instanceof Error ? payloadError.message : String(payloadError)}`);
        }

        // Transform each raw property for DB save (main branch behavior)
        const propertiesWithCriteria = batchRawPayloads.map(raw => {
          let property = raw;
          
          // Handle nested structure where property is in raw.results[0]
          if (raw && raw.results && Array.isArray(raw.results) && raw.results.length > 0) {
            // Extract the actual property from the results array
            const propertyData = raw.results[0];
            
            if (provider.transformProperty) {
              // Transform the property data, not the wrapper
              const transformed = provider.transformProperty(propertyData);
              property = transformed && transformed.property ? transformed.property : propertyData;
            } else {
              property = propertyData;
            }
          } else if (provider.transformProperty) {
            // For non-nested structures, transform as before
            const transformed = provider.transformProperty(raw);
            property = transformed && transformed.property ? transformed.property : raw;
          }
          
          return {
            ...property,
            batchJobCriteria: criteria
          };
        });

        // Use the saveProperties method to save to database
        const savedProperties = await this.propertyService.saveProperties(
          providerCode,
          propertiesWithCriteria
        );
        
        processedCount = batchRadarIds.length;
        successCount = savedProperties.length;
        errorCount = batchRadarIds.length - savedProperties.length;
        
        await this.batchJobService.logJobProgress(
          jobId!,
          `Batch ${batchNumber}: Processed ${processedCount} properties with ${successCount} successes and ${errorCount} errors`
        );
      } catch (error) {
        logger.error('Error processing batch:', error);
        processedCount = batchRadarIds.length;
        successCount = 0;
        errorCount = batchRadarIds.length;
        
        await this.batchJobService.logJobProgress(
          jobId!,
          `Failed to process batch ${batchNumber}: ${error instanceof Error ? error.message : String(error)}`,
          'ERROR'
        );
        throw error;
      } finally {
        // Update progress
        await this.batchJobService.updateJobProgress(
          jobId!,
          processedCount,
          totalCount,
          successCount,
          errorCount
        );
      }
    } catch (error) {
      logger.error(`Error processing batch job ${job.job_id}:`, error);
      throw error;
    }
  }

  /**
   * Process a regular job (non-batch)
   * @param job The regular job to process
   */
  private async processRegularJob(job: BatchJob): Promise<void> {
    try {
      const { criteria, job_id: jobId } = job;
      const batchSize = 400; // Default batch size
      
      // Get total count (could be an estimate)
      const totalCountResult = await this.propertyService.getEstimatedCount(criteria);
      const totalCount = totalCountResult.count || 0;
      
      // Update job with total count
      await this.batchJobService.updateJobProgress(jobId!, 0, totalCount, 0, 0);
      await this.batchJobService.logJobProgress(jobId!, `Estimated total records: ${totalCount}`);
      
      // Check if this job has already processed batches
      // This prevents duplicate processing if a job is restarted
      const existingBatches = await this.checkExistingBatches(jobId!.toString());
      const processedBatchNumbers = existingBatches.map(b => b.batch_number);
      
      if (existingBatches.length > 0) {
        await this.batchJobService.logJobProgress(
          jobId!,
          `Found ${existingBatches.length} existing batches (${processedBatchNumbers.join(', ')}). Will not reprocess these batches.`,
          'WARNING'
        );
      }
      
      // Process in batches
      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;
      let hasMoreRecords = true;
      let startIndex = 0;
      let batchCount = 0;
      
      while (hasMoreRecords) {
        batchCount++;
        // Only log every 5 batches to reduce logging
        const shouldLog = batchCount % 5 === 0;
        
        // Fetch batch from PropertyRadar
        if (shouldLog) {
          await this.batchJobService.logJobProgress(jobId!, `Fetching batch ${batchCount} starting at index ${startIndex}`);
        }
        
        const batchResult = await this.propertyService.getProperties(
          criteria,
          job.job_id?.toString() || 'batch-job',  // Use job_id as campaign ID
          batchSize,
          startIndex
        );
        
        // Process and store the batch
        const batchRecords = batchResult.properties || [];
        
        // Process and store the records in the database
        let batchSuccessCount = 0;
        let batchErrorCount = 0;
        
        try {
          // Add batch job criteria to each property
          const propertiesWithCriteria = batchRecords.map(property => ({
            ...property,
            batchJobCriteria: criteria
          }));
          
          // Check if provider_id is in the criteria
          let providerCode = this.propertyService.getProviderCode();
          
          // Use the saveProperties method to save to database
          const savedProperties = await this.propertyService.saveProperties(
            providerCode,
            propertiesWithCriteria
          );
        
          batchSuccessCount = savedProperties.length;
          batchErrorCount = batchRecords.length - savedProperties.length;
          
          if (shouldLog) {
            await this.batchJobService.logJobProgress(
              jobId!,
              `Batch ${batchCount}: Saved ${batchSuccessCount} properties (${batchErrorCount} errors)`
            );
          }
        } catch (error) {
          logger.error('Error saving batch to database:', error);
          batchSuccessCount = 0;
          batchErrorCount = batchRecords.length;
          
          await this.batchJobService.logJobProgress(
            jobId!,
            `Failed to save batch ${batchCount} to database: ${error instanceof Error ? error.message : String(error)}`,
            'ERROR'
          );
        }
        
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
        
        // Report progress only every 5 batches or at the end
        const percentComplete = Math.floor((processedCount / totalCount) * 100);
        if (shouldLog || !batchResult.hasMore) {
          await this.batchJobService.logJobProgress(
            jobId!,
            `Processed ${processedCount} of ${totalCount} records (${percentComplete}%)`
          );
        }
        
        // Check if we need to continue
        hasMoreRecords = batchResult.hasMore || false;
        startIndex += batchSize;
        
        // Add a small delay to avoid hitting rate limits
        if (hasMoreRecords) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Final log
      await this.batchJobService.logJobProgress(
        jobId!,
        `Job completed. Processed ${processedCount} records with ${successCount} successes and ${errorCount} errors.`
      );
    } catch (error: any) {
      // Log error and update job status
      logger.error(`Job ${job.job_id} failed:`, error);
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
    parentJobs: number;
    childJobs: number;
  }> {
    try {
      // Query the database for job counts by status
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'PENDING') AS waiting,
          COUNT(*) FILTER (WHERE status = 'PROCESSING') AS active,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
          COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
          COUNT(*) FILTER (WHERE status = 'PENDING' AND next_attempt_at > NOW()) AS delayed,
          COUNT(*) FILTER (WHERE is_parent = true) AS parentJobs,
          COUNT(*) FILTER (WHERE parent_job_id IS NOT NULL) AS childJobs
        FROM batch_jobs
      `;
      
      if (!this.pool) {
        // Simplified implementation without direct pool access
        // Must include child jobs here to get accurate stats
        const jobs = await this.batchJobService.getJobs(undefined, undefined, undefined, true);
        
        const waiting = jobs.filter(j => j.status === 'PENDING').length;
        const active = jobs.filter(j => j.status === 'PROCESSING').length;
        const completed = jobs.filter(j => j.status === 'COMPLETED').length;
        const failed = jobs.filter(j => j.status === 'FAILED').length;
        const delayed = 0; // Can't determine without next_attempt_at
        const parentJobs = jobs.filter(j => j.is_parent === true).length;
        const childJobs = jobs.filter(j => j.parent_job_id !== undefined).length;
        
        return { waiting, active, completed, failed, delayed, parentJobs, childJobs };
      }
      
      const result = await this.pool.query(query);
      const stats = result.rows[0];
      
      return {
        waiting: parseInt(stats.waiting) || 0,
        active: parseInt(stats.active) || 0,
        completed: parseInt(stats.completed) || 0,
        failed: parseInt(stats.failed) || 0,
        delayed: parseInt(stats.delayed) || 0,
        parentJobs: parseInt(stats.parentjobs) || 0,
        childJobs: parseInt(stats.childjobs) || 0
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        parentJobs: 0,
        childJobs: 0
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
        logger.info('Pool not available for cleaning queue');
        return;
      }
      
      // Delete completed and failed jobs older than 7 days
      await this.pool.query(`
        DELETE FROM batch_jobs
        WHERE 
          (status = 'COMPLETED' OR status = 'FAILED')
          AND updated_at < NOW() - INTERVAL '7 days'
      `);
      
      logger.info('Cleaned queue of old completed and failed jobs');
    } catch (error) {
      logger.error('Error cleaning queue:', error);
    }
  }
}
