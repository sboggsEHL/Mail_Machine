import { Pool } from 'pg';
import { BatchJob, BatchJobLog, BatchJobProgress } from '../models';

/**
 * Repository for batch job operations
 */
export class BatchJobRepository {
  constructor(private pool: Pool) {}

  /**
   * Create a new batch job
   * @param job The batch job to create
   * @returns The created batch job with ID
   */
  async createJob(job: BatchJob): Promise<BatchJob> {
    const result = await this.pool.query(`
      INSERT INTO batch_jobs (
        status, criteria, total_records, processed_records,
        success_count, error_count, error_details, created_by,
        priority, parent_job_id, batch_number, batch_offset, 
        batch_size, is_parent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      job.status || 'PENDING',
      job.criteria,
      job.total_records || null,
      job.processed_records || 0,
      job.success_count || 0,
      job.error_count || 0,
      job.error_details || null,
      job.created_by,
      job.priority || 0,
      job.parent_job_id || null,
      job.batch_number || null,
      job.batch_offset || null,
      job.batch_size || null,
      job.is_parent || false
    ]);
    
    return result.rows[0];
  }

  /**
   * Create a parent job
   * @param job The batch job to create as a parent
   * @returns The created parent job with ID
   */
  async createParentJob(job: BatchJob): Promise<BatchJob> {
    const result = await this.pool.query(`
      INSERT INTO batch_jobs (
        status, criteria, total_records, processed_records,
        success_count, error_count, error_details, created_by,
        priority, is_parent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      job.status || 'PENDING',
      job.criteria,
      job.total_records || null,
      job.processed_records || 0,
      job.success_count || 0,
      job.error_count || 0,
      job.error_details || null,
      job.created_by,
      job.priority || 0,
      true // Always mark as a parent job
    ]);
    
    return result.rows[0];
  }

  /**
   * Create a child job that belongs to a parent job
   * @param parentJobId The ID of the parent job
   * @param job The batch job data
   * @param batchNumber The batch number for this child job
   * @param batchOffset The offset in the original list
   * @param batchSize The size of this batch
   * @returns The created child job with ID
   */
  async createChildJob(
    parentJobId: number, 
    job: BatchJob, 
    batchNumber: number,
    batchOffset: number,
    batchSize: number
  ): Promise<BatchJob> {
    const result = await this.pool.query(`
      INSERT INTO batch_jobs (
        status, criteria, total_records, processed_records,
        success_count, error_count, error_details, created_by,
        priority, parent_job_id, batch_number, batch_offset, batch_size, is_parent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      job.status || 'PENDING',
      job.criteria,
      job.total_records || batchSize, // Use batch size as total records
      job.processed_records || 0,
      job.success_count || 0,
      job.error_count || 0,
      job.error_details || null,
      job.created_by,
      job.priority || 0,
      parentJobId,
      batchNumber,
      batchOffset,
      batchSize,
      false // Not a parent job
    ]);
    
    return result.rows[0];
  }

  /**
   * Get a batch job by ID
   * @param jobId The job ID
   * @returns The batch job or null if not found
   */
  async getJobById(jobId: number): Promise<BatchJob | null> {
    const result = await this.pool.query(`
      SELECT * FROM batch_jobs
      WHERE job_id = $1
    `, [jobId]);
    
    return result.rows.length ? result.rows[0] : null;
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
    let whereClause = includeChildJobs ? '' : 'WHERE parent_job_id IS NULL';
    let params: any[] = [limit, offset];
    let paramIndex = 3;
    
    if (status) {
      whereClause = whereClause ? `${whereClause} AND status = $${paramIndex}` : `WHERE status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    const query = `
      SELECT * FROM batch_jobs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get all child jobs for a parent job
   * @param parentJobId The parent job ID
   * @returns Array of child batch jobs
   */
  async getChildJobs(parentJobId: number): Promise<BatchJob[]> {
    const result = await this.pool.query(`
      SELECT * FROM batch_jobs
      WHERE parent_job_id = $1
      ORDER BY batch_number ASC
    `, [parentJobId]);
    
    return result.rows;
  }

  /**
   * Get the count of child jobs by status for a parent job
   * @param parentJobId The parent job ID
   * @returns Count of jobs by status
   */
  async getChildJobStatusCounts(parentJobId: number): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
        COUNT(*) FILTER (WHERE status = 'PROCESSING') AS processing,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
        COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
        COUNT(*) AS total
      FROM batch_jobs
      WHERE parent_job_id = $1
    `, [parentJobId]);
    
    const counts = result.rows[0];
    return {
      pending: parseInt(counts.pending) || 0,
      processing: parseInt(counts.processing) || 0,
      completed: parseInt(counts.completed) || 0,
      failed: parseInt(counts.failed) || 0,
      total: parseInt(counts.total) || 0
    };
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
    let query = `
      UPDATE batch_jobs
      SET status = $2::VARCHAR
    `;
    
    const params: any[] = [jobId, status];
    
    if (status === 'COMPLETED') {
      query += `, completed_at = NOW()`;
    }
    
    if (status === 'FAILED' && errorDetails) {
      query += `, error_details = $3`;
      params.push(errorDetails);
    }
    
    query += `
      WHERE job_id = $1
      RETURNING *
    `;
    
    const result = await this.pool.query(query, params);
    return result.rows.length ? result.rows[0] : null;
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
    const result = await this.pool.query(`
      UPDATE batch_jobs
      SET 
        processed_records = $2,
        total_records = $3,
        success_count = $4,
        error_count = $5
      WHERE job_id = $1
      RETURNING *
    `, [jobId, processedRecords, totalRecords, successCount, errorCount]);
    
    return result.rows.length ? result.rows[0] : null;
  }

  /**
   * Update parent job progress based on child jobs
   * @param parentJobId The parent job ID
   * @returns The updated parent job
   */
  async updateParentJobProgress(parentJobId: number): Promise<BatchJob | null> {
    // Get all child jobs
    const childJobs = await this.getChildJobs(parentJobId);
    
    if (childJobs.length === 0) {
      return null;
    }
    
    // Calculate aggregate values
    const processedRecords = childJobs.reduce((sum, job) => sum + (job.processed_records || 0), 0);
    const totalRecords = childJobs.reduce((sum, job) => sum + (job.total_records || 0), 0);
    const successCount = childJobs.reduce((sum, job) => sum + (job.success_count || 0), 0);
    const errorCount = childJobs.reduce((sum, job) => sum + (job.error_count || 0), 0);
    
    // Update the parent job progress
    const result = await this.pool.query(`
      UPDATE batch_jobs
      SET 
        processed_records = $2,
        total_records = $3,
        success_count = $4,
        error_count = $5,
        updated_at = NOW()
      WHERE job_id = $1 AND is_parent = true
      RETURNING *
    `, [parentJobId, processedRecords, totalRecords, successCount, errorCount]);
    
    return result.rows.length ? result.rows[0] : null;
  }

  /**
   * Check and update parent job status based on child jobs
   * @param parentJobId The parent job ID
   * @returns The updated parent job or null if no update was made
   */
  async updateParentJobStatus(parentJobId: number): Promise<BatchJob | null> {
    // Get counts of child jobs by status
    const counts = await this.getChildJobStatusCounts(parentJobId);
    
    // Determine the new status for the parent job
    let newStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'PENDING';
    let errorDetails: string | null = null;
    
    if (counts.total === 0) {
      // No child jobs, keep as PENDING
      return null;
    } else if (counts.failed > 0) {
      // If any child jobs failed, the parent job is considered partial success
      newStatus = 'COMPLETED';
      errorDetails = `${counts.failed} out of ${counts.total} batch jobs failed`;
    } else if (counts.completed === counts.total) {
      // All child jobs completed
      newStatus = 'COMPLETED';
    } else if (counts.processing > 0) {
      // Some child jobs are still processing
      newStatus = 'PROCESSING';
    } else {
      // Otherwise, some child jobs are still pending
      newStatus = 'PENDING';
    }
    
    // Update the parent job status
    const result = await this.pool.query(`
      UPDATE batch_jobs
      SET 
        status = $2::VARCHAR,
        error_details = $3,
        updated_at = NOW(),
        completed_at = CASE WHEN $2 = 'COMPLETED' THEN NOW() ELSE completed_at END
      WHERE job_id = $1 AND is_parent = true
      RETURNING *
    `, [parentJobId, newStatus, errorDetails]);
    
    return result.rows.length ? result.rows[0] : null;
  }

  /**
   * Add a log entry for a job
   * @param log The log entry to add
   * @returns The created log entry with ID
   */
  async addJobLog(log: BatchJobLog): Promise<BatchJobLog> {
    const result = await this.pool.query(`
      INSERT INTO batch_job_logs (
        job_id, message, level
      ) VALUES ($1, $2, $3)
      RETURNING *
    `, [
      log.job_id,
      log.message,
      log.level || 'INFO'
    ]);
    
    return result.rows[0];
  }

  /**
   * Get logs for a job
   * @param jobId The job ID
   * @param limit Maximum number of logs to return
   * @param offset Offset for pagination
   * @returns Array of log entries
   */
  async getJobLogs(jobId: number, limit = 100, offset = 0): Promise<BatchJobLog[]> {
    const result = await this.pool.query(`
      SELECT * FROM batch_job_logs
      WHERE job_id = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `, [jobId, limit, offset]);
    
    return result.rows;
  }

  /**
   * Get the next pending job
   * @returns The next pending job or null if none
   */
  async getNextPendingJob(): Promise<BatchJob | null> {
    const result = await this.pool.query(`
      SELECT * FROM batch_jobs
      WHERE 
        status = 'PENDING' 
        AND (is_parent = false OR is_parent IS NULL)
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
    `);
    
    return result.rows.length ? result.rows[0] : null;
  }

  /**
   * Increment job attempt count
   * @param jobId The job ID
   * @returns The updated job
   */
  async incrementJobAttempt(jobId: number): Promise<BatchJob | null> {
    const result = await this.pool.query(`
      UPDATE batch_jobs
      SET attempts = COALESCE(attempts, 0) + 1
      WHERE job_id = $1
      RETURNING *
    `, [jobId]);
    
    return result.rows.length ? result.rows[0] : null;
  }
}
