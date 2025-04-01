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
exports.BatchJobService = void 0;
/**
 * Service for batch job operations
 */
class BatchJobService {
    constructor(batchJobRepository) {
        this.batchJobRepository = batchJobRepository;
    }
    /**
     * Create a new batch job
     * @param job The batch job to create
     * @returns The created batch job with ID
     */
    createJob(job) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.batchJobRepository.createJob(job);
        });
    }
    /**
     * Get a batch job by ID
     * @param jobId The job ID
     * @returns The batch job or null if not found
     */
    getJobById(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.batchJobRepository.getJobById(jobId);
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
            return this.batchJobRepository.getJobs(status, limit, offset);
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
            return this.batchJobRepository.updateJobStatus(jobId, status, errorDetails);
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
            return this.batchJobRepository.updateJobProgress(jobId, processedRecords, totalRecords, successCount, errorCount);
        });
    }
    /**
     * Add a log entry for a job
     * @param log The log entry to add
     * @returns The created log entry with ID
     */
    addJobLog(log) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.batchJobRepository.addJobLog(log);
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
            return this.batchJobRepository.getJobLogs(jobId, limit, offset);
        });
    }
    /**
     * Calculate job progress
     * @param job The batch job
     * @returns The job progress
     */
    calculateJobProgress(job) {
        const processedRecords = job.processed_records || 0;
        const totalRecords = job.total_records || 0;
        const successCount = job.success_count || 0;
        const errorCount = job.error_count || 0;
        let percentComplete = 0;
        if (totalRecords > 0) {
            percentComplete = Math.floor((processedRecords / totalRecords) * 100);
        }
        return {
            job_id: job.job_id,
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
    getNextPendingJob() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.batchJobRepository.getNextPendingJob();
        });
    }
    /**
     * Increment job attempt count
     * @param jobId The job ID
     * @returns The updated job
     */
    incrementJobAttempt(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.batchJobRepository.incrementJobAttempt(jobId);
        });
    }
    /**
     * Log job progress
     * @param jobId The job ID
     * @param message The log message
     * @param level The log level
     * @returns The created log entry
     */
    logJobProgress(jobId_1, message_1) {
        return __awaiter(this, arguments, void 0, function* (jobId, message, level = 'INFO') {
            return this.addJobLog({
                job_id: jobId,
                message,
                level
            });
        });
    }
}
exports.BatchJobService = BatchJobService;
