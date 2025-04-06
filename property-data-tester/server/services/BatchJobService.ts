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
   * @returns Array of batch jobs
   */
  async getJobs(status?: string, limit = 100, offset = 0): Promise<BatchJob[]> {
    return this.batchJobRepository.getJobs(status, limit, offset);
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
}
