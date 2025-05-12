import { BatchJob, BatchJobLog, BatchJobProgress } from '../models';
import { BatchJobRepository } from '../repositories/BatchJobRepository';
import { AppError, ERROR_CODES } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Service for batch job operations
 */
export class BatchJobService {
  constructor(private batchJobRepository: BatchJobRepository) {}

  /**
   * Create a new batch job
   * @param job The batch job to create
   * @returns The created batch job with ID
   */
  async createJob(job: BatchJob): Promise<BatchJob> {
    return this.batchJobRepository.createJob(job);
  }

  /**
   * Create a parent job for a list
   * @param job The batch job data
   * @returns The created parent job
   */
  async createParentJob(job: BatchJob): Promise<BatchJob> {
    return this.batchJobRepository.createParentJob(job);
  }

  /**
   * Create a child job for a parent job
   * @param parentJobId The parent job ID
   * @param job The batch job data
   * @param batchNumber The batch number
   * @param batchOffset The offset in the original list
   * @param batchSize The size of this batch
   * @returns The created child job
   */
  async createChildJob(
    parentJobId: number,
    job: BatchJob,
    batchNumber: number,
    batchOffset: number,
    batchSize: number
  ): Promise<BatchJob> {
    return this.batchJobRepository.createChildJob(
      parentJobId,
      job,
      batchNumber,
      batchOffset,
      batchSize
    );
  }

  /**
   * Create child jobs from a list of RadarIDs
   * @param parentJobId The parent job ID
   * @param criteria The criteria with the RadarIDs to split
   * @param batchSize The size of each batch
   * @param createdBy Who created the jobs
   * @returns Array of created child jobs
   */
  async createChildJobsFromList(
    parentJobId: number,
    criteria: Record<string, any>,
    batchSize: number = 400,
    createdBy: string = 'system'
  ): Promise<BatchJob[]> {
    // Extract the RadarIDs from the criteria
    if (!criteria.RadarID || !Array.isArray(criteria.RadarID)) {
      throw new AppError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid criteria: RadarID array is required',
        400
      );
    }
    
    const radarIds = criteria.RadarID;
    const totalRecords = radarIds.length;
    
    // Log the batch creation process
    await this.logJobProgress(
      parentJobId,
      `Creating child jobs for ${totalRecords} properties with batch size ${batchSize}`
    );
    
    const childJobs: BatchJob[] = [];
    
    // Split the list into batches
    for (let offset = 0; offset < totalRecords; offset += batchSize) {
      const batchNumber = Math.floor(offset / batchSize) + 1;
      const batchRadarIds = radarIds.slice(offset, offset + batchSize);
      const actualBatchSize = batchRadarIds.length;
      
      // Create a new criteria object with just this batch's RadarIDs
      const batchCriteria = { ...criteria, RadarID: batchRadarIds };
      
      // Create a child job for this batch
      const childJob = await this.createChildJob(
        parentJobId,
        {
          status: 'PENDING',
          criteria: batchCriteria,
          total_records: actualBatchSize,
          processed_records: 0,
          created_by: createdBy,
          priority: criteria.priority || 0
        },
        batchNumber,
        offset,
        actualBatchSize
      );
      
      childJobs.push(childJob);
      
      // Log the creation of this batch job
      await this.logJobProgress(
        parentJobId,
        `Created child job ${childJob.job_id} for batch ${batchNumber} with ${actualBatchSize} properties`
      );
    }
    
    // Log completion of batch creation
    await this.logJobProgress(
      parentJobId,
      `Created ${childJobs.length} child jobs for parent job ${parentJobId}`
    );
    
    return childJobs;
  }

  /**
   * Get a batch job by ID
   * @param jobId The job ID
   * @returns The batch job or null if not found
   */
  async getJobById(jobId: number): Promise<BatchJob> {
    const job = await this.batchJobRepository.getJobById(jobId);
    if (!job) {
      throw new AppError(
        ERROR_CODES.BATCH_JOB_NOT_FOUND,
        `Batch job with ID ${jobId} not found`,
        404
      );
    }
    return job;
  }

  /**
   * Get all batch jobs with optional filtering
   * @param status Optional status filter
   * @param limit Maximum number of jobs to return
   * @param offset Offset for pagination
   * @param includeChildJobs Whether to include child jobs or only parent/standalone jobs
   * @returns Array of batch jobs
   */
  async getJobs(status?: string, limit = 100, offset = 0, includeChildJobs = false): Promise<BatchJob[]> {
    return this.batchJobRepository.getJobs(status, limit, offset, includeChildJobs);
  }

  /**
   * Get all child jobs for a parent job
   * @param parentJobId The parent job ID
   * @returns Array of child jobs
   */
  async getChildJobs(parentJobId: number): Promise<BatchJob[]> {
    return this.batchJobRepository.getChildJobs(parentJobId);
  }

  /**
   * Update job status
   * @param jobId The job ID
   * @param status The new status
   * @param errorDetails Optional error details if status is FAILED
   * @returns The updated job
   */
  async updateJobStatus(
    jobId: number, 
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    errorDetails?: string
  ): Promise<BatchJob | null> {
    return this.batchJobRepository.updateJobStatus(jobId, status, errorDetails);
  }

  /**
   * Update job progress
   * @param jobId The job ID
   * @param processedRecords Number of processed records
   * @param totalRecords Total number of records
   * @param successCount Number of successfully processed records
   * @param errorCount Number of records with errors
   * @returns The updated job
   */
  async updateJobProgress(
    jobId: number,
    processedRecords: number,
    totalRecords: number,
    successCount: number,
    errorCount: number
  ): Promise<BatchJob | null> {
    return this.batchJobRepository.updateJobProgress(
      jobId, 
      processedRecords, 
      totalRecords, 
      successCount, 
      errorCount
    );
  }

  /**
   * Update parent job progress based on child jobs
   * @param parentJobId The parent job ID
   * @returns The updated parent job
   */
  async updateParentJobProgress(parentJobId: number): Promise<BatchJob | null> {
    return this.batchJobRepository.updateParentJobProgress(parentJobId);
  }

  /**
   * Check and update parent job status based on child jobs
   * @param parentJobId The parent job ID
   * @returns The updated parent job or null if no update needed
   */
  async updateParentJobStatus(parentJobId: number): Promise<BatchJob | null> {
    const statusCounts = await this.batchJobRepository.getChildJobStatusCounts(parentJobId);
    
    // Log the current status of child jobs
    await this.logJobProgress(
      parentJobId,
      `Child jobs status: ${statusCounts.completed} completed, ${statusCounts.failed} failed, ${statusCounts.processing} processing, ${statusCounts.pending} pending out of ${statusCounts.total} total`
    );
    
    const updatedParentJob = await this.batchJobRepository.updateParentJobStatus(parentJobId);
    
    if (updatedParentJob && updatedParentJob.status === 'COMPLETED') {
      // If the parent job was just completed, log it
      const errorCount = updatedParentJob.error_count || 0;
      await this.logJobProgress(
        parentJobId,
        `All child jobs processed. Job completed with ${updatedParentJob.success_count || 0} successes and ${errorCount} errors.`,
        errorCount > 0 ? 'WARNING' : 'INFO'
      );
    }
    
    return updatedParentJob;
  }

  /**
   * Add a log entry for a job
   * @param log The log entry to add
   * @returns The created log entry with ID
   */
  async addJobLog(log: BatchJobLog): Promise<BatchJobLog> {
    return this.batchJobRepository.addJobLog(log);
  }

  /**
   * Get logs for a job
   * @param jobId The job ID
   * @param limit Maximum number of logs to return
   * @param offset Offset for pagination
   * @returns Array of log entries
   */
  async getJobLogs(jobId: number, limit = 100, offset = 0): Promise<BatchJobLog[]> {
    return this.batchJobRepository.getJobLogs(jobId, limit, offset);
  }

  /**
   * Calculate job progress
   * @param job The batch job
   * @returns The job progress
   */
  calculateJobProgress(job: BatchJob): BatchJobProgress {
    const processedRecords = job.processed_records || 0;
    const totalRecords = job.total_records || 0;
    const successCount = job.success_count || 0;
    const errorCount = job.error_count || 0;
    
    let percentComplete = 0;
    if (totalRecords > 0) {
      percentComplete = Math.floor((processedRecords / totalRecords) * 100);
    }
    
    return {
      job_id: job.job_id!,
      processed_records: processedRecords,
      total_records: totalRecords,
      success_count: successCount,
      error_count: errorCount,
      percent_complete: percentComplete
    };
  }

  /**
   * Get the next pending job
   * @returns The next pending job or null if none
   */
  async getNextPendingJob(): Promise<BatchJob | null> {
    return this.batchJobRepository.getNextPendingJob();
  }

  /**
   * Increment job attempt count
   * @param jobId The job ID
   * @returns The updated job
   */
  async incrementJobAttempt(jobId: number): Promise<BatchJob | null> {
    return this.batchJobRepository.incrementJobAttempt(jobId);
  }

  /**
   * Log job progress
   * @param jobId The job ID
   * @param message The log message
   * @param level The log level
   * @returns The created log entry
   */
  async logJobProgress(
    jobId: number, 
    message: string, 
    level: 'INFO' | 'WARNING' | 'ERROR' = 'INFO'
  ): Promise<BatchJobLog> {
    return this.addJobLog({
      job_id: jobId,
      message,
      level
    });
  }

  /**
   * Check if a job is a parent job
   * @param jobId The job ID
   * @returns True if the job is a parent job
   */
  async isParentJob(jobId: number): Promise<boolean> {
    const job = await this.getJobById(jobId);
    return job.is_parent === true;
  }

  /**
   * Process a specific batch of a list based on batch information
   * @param job The child job containing batch information
   * @param propertyService The property batch service to use for processing
   * @returns The result of processing the batch
   */
  async processBatch(job: BatchJob, propertyService: any): Promise<{
    processedCount: number;
    successCount: number;
    errorCount: number;
  }> {
    if ((!job.batch_offset && job.batch_offset !== 0) || !job.batch_size) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Missing batch information in job',
        400
      );
    }
    
    // Extract batch-specific RadarIDs from the job criteria
    const batchRadarIds = job.criteria.RadarID;
    
    if (!batchRadarIds || !Array.isArray(batchRadarIds)) {
      throw new AppError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid batch criteria: RadarID array is required',
        400
      );
    }
    
    // Log the start of batch processing
    await this.logJobProgress(
      job.job_id!,
      `Processing batch ${job.batch_number} with ${batchRadarIds.length} properties`
    );
    
    try {
      // Call the property service to process just this batch
      // This is a simplified implementation that would need to be adapted to your actual property service
      const processResult = await propertyService.processProperties(batchRadarIds, job.criteria);
      
      // Update this job's progress
      await this.updateJobProgress(
        job.job_id!,
        batchRadarIds.length,
        batchRadarIds.length,
        processResult.successCount,
        processResult.errorCount
      );
      
      // Log completion of this batch
      await this.logJobProgress(
        job.job_id!,
        `Completed batch ${job.batch_number}: Processed ${batchRadarIds.length} properties with ${processResult.successCount} successes and ${processResult.errorCount} errors`
      );
      
      return {
        processedCount: batchRadarIds.length,
        successCount: processResult.successCount,
        errorCount: processResult.errorCount
      };
    } catch (error) {
      // Log the error
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logJobProgress(
        job.job_id!,
        `Error processing batch ${job.batch_number}: ${errorMessage}`,
        'ERROR'
      );
      
      // Update job progress to show all as errors
      await this.updateJobProgress(
        job.job_id!,
        batchRadarIds.length,
        batchRadarIds.length,
        0,
        batchRadarIds.length
      );
      
      return {
        processedCount: batchRadarIds.length,
        successCount: 0,
        errorCount: batchRadarIds.length
      };
    }
  }
}
