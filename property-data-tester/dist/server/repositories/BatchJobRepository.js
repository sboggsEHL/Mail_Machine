"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchJobRepository = void 0;
/**
 * Repository for batch job operations
 */
class BatchJobRepository {
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Create a new batch job
     * @param job The batch job to create
     * @returns The created batch job with ID
     */
    createJob(job) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.pool.query(`
      INSERT INTO batch_jobs (
        status, criteria, total_records, processed_records,
        success_count, error_count, error_details, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
                job.status || 'PENDING',
                job.criteria,
                job.total_records || null,
                job.processed_records || 0,
                job.success_count || 0,
                job.error_count || 0,
                job.error_details || null,
                job.created_by
            ]);
            return result.rows[0];
        });
    }
    /**
     * Get a batch job by ID
     * @param jobId The job ID
     * @returns The batch job or null if not found
     */
    getJobById(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.pool.query(`
      SELECT * FROM batch_jobs
      WHERE job_id = $1
    `, [jobId]);
            return result.rows.length ? result.rows[0] : null;
        });
    }
    /**
     * Get all batch jobs with optional filtering
     * @param status Optional status filter
     * @param limit Maximum number of jobs to return
     * @param offset Offset for pagination
     * @returns Array of batch jobs
     */
    getJobs(status_1) {
        return __awaiter(this, arguments, void 0, function* (status, limit = 100, offset = 0) {
            let query = `
      SELECT * FROM batch_jobs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
            let params = [limit, offset];
            if (status) {
                query = `
        SELECT * FROM batch_jobs
        WHERE status = $3
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
                params.push(status);
            }
            const result = yield this.pool.query(query, params);
            return result.rows;
        });
    }
    /**
     * Update job status
     * @param jobId The job ID
     * @param status The new status
     * @param errorDetails Optional error details if status is FAILED
     * @returns The updated job
     */
    updateJobStatus(jobId, status, errorDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = `
      UPDATE batch_jobs
      SET status = $2
    `;
            const params = [jobId, status];
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
            const result = yield this.pool.query(query, params);
            return result.rows.length ? result.rows[0] : null;
        });
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
    updateJobProgress(jobId, processedRecords, totalRecords, successCount, errorCount) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.pool.query(`
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
        });
    }
    /**
     * Add a log entry for a job
     * @param log The log entry to add
     * @returns The created log entry with ID
     */
    addJobLog(log) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.pool.query(`
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
        });
    }
    /**
     * Get logs for a job
     * @param jobId The job ID
     * @param limit Maximum number of logs to return
     * @param offset Offset for pagination
     * @returns Array of log entries
     */
    getJobLogs(jobId_1) {
        return __awaiter(this, arguments, void 0, function* (jobId, limit = 100, offset = 0) {
            const result = yield this.pool.query(`
      SELECT * FROM batch_job_logs
      WHERE job_id = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `, [jobId, limit, offset]);
            return result.rows;
        });
    }
    /**
     * Get the next pending job
     * @returns The next pending job or null if none
     */
    getNextPendingJob() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.pool.query(`
      SELECT * FROM batch_jobs
      WHERE status = 'PENDING'
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
    `);
            return result.rows.length ? result.rows[0] : null;
        });
    }
    /**
     * Increment job attempt count
     * @param jobId The job ID
     * @returns The updated job
     */
    incrementJobAttempt(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.pool.query(`
      UPDATE batch_jobs
      SET attempts = COALESCE(attempts, 0) + 1
      WHERE job_id = $1
      RETURNING *
    `, [jobId]);
            return result.rows.length ? result.rows[0] : null;
        });
    }
}
exports.BatchJobRepository = BatchJobRepository;
