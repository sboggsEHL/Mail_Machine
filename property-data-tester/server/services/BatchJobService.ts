import { BatchJob, BatchJobLog, BatchJobProgress } from '../models';
import { BatchJobRepository } from '../repositories/BatchJobRepository';
import { AppError, ERROR_CODES } from '../utils/errors';
import logger from '../utils/logger';
import { DnmService } from './DnmService';
import { dbPool } from '../config/database';

/**
 * Service for batch job operations
 */
export class BatchJobService {
  constructor(
    private batchJobRepository: BatchJobRepository,
    private dnmService: DnmService
  ) {}

  /**
   * Get leads for CSV, filtering out DNM entries by radar_id.
   * @param job The batch job
   * @returns Array of lead objects for CSV
   */
  async getLeadsForCsvWithDnmFilter(job: BatchJob): Promise<any[]> {
    const radarIds = job.criteria && Array.isArray(job.criteria.RadarID) ? job.criteria.RadarID : [];
    if (!radarIds.length) return [];
    // Filter out DNM radarIds
    const filteredRadarIds = await this.dnmService.filterOutDnmRadarIds(radarIds);
    if (!filteredRadarIds.length) return [];
    // Query complete_property_view for filtered radarIds
    const result = await dbPool.query(
      `SELECT
        property_address AS address,
        property_city AS city,
        property_state AS state,
        property_zip AS zip,
        loan_id,
        primary_owner_first_name AS first_name,
        primary_owner_last_name AS last_name,
        radar_id
      FROM public.complete_property_view
      WHERE radar_id = ANY($1)`,
      [filteredRadarIds]
    );
    return result.rows;
  }

  /**
   * Get both included and excluded (DNM) leads for a batch job.
   * @param job The batch job
   * @returns { includedLeads, dnmLeads, missingLeadsCount }
   */
  async getLeadsCsvPreview(job: BatchJob): Promise<{ includedLeads: any[]; dnmLeads: any[]; missingLeadsCount: number; totalRadarIds: number }> {
    const radarIds = job.criteria && Array.isArray(job.criteria.RadarID) ? job.criteria.RadarID : [];
    if (!radarIds.length) return { includedLeads: [], dnmLeads: [], missingLeadsCount: 0, totalRadarIds: 0 };
    // Get DNM radarIds
    const dnmRadarIds = await this.dnmService.getDnmRadarIds(radarIds);
    // Included = not in DNM, Excluded = in DNM
    const includedRadarIds = radarIds.filter(id => !dnmRadarIds.includes(id));
    // Query for included leads
    let includedLeads: any[] = [];
    if (includedRadarIds.length) {
      const result = await dbPool.query(
        `SELECT
          property_address AS address,
          property_city AS city,
          property_state AS state,
          property_zip AS zip,
          loan_id,
          primary_owner_first_name AS first_name,
          primary_owner_last_name AS last_name,
          radar_id
        FROM public.complete_property_view
        WHERE radar_id = ANY($1)`,
        [includedRadarIds]
      );
      includedLeads = result.rows;
    }
    // Query for DNM leads (for display)
    let dnmLeads: any[] = [];
    if (dnmRadarIds.length) {
      const result = await dbPool.query(
        `SELECT
          property_address AS address,
          property_city AS city,
          property_state AS state,
          property_zip AS zip,
          loan_id,
          primary_owner_first_name AS first_name,
          primary_owner_last_name AS last_name,
          radar_id
        FROM public.complete_property_view
        WHERE radar_id = ANY($1)`,
        [dnmRadarIds]
      );
      dnmLeads = result.rows;
    }
    // Calculate missing leads (radarIds not found in property view)
    const foundRadarIds = new Set([...includedLeads, ...dnmLeads].map((lead: any) => lead.radar_id));
    const missingLeadsCount = radarIds.filter(id => !foundRadarIds.has(id)).length;
    return { includedLeads, dnmLeads, missingLeadsCount, totalRadarIds: radarIds.length };
  }

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
