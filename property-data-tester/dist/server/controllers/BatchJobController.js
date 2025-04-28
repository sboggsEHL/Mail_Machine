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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchJobController = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Controller for batch job operations
 */
class BatchJobController {
    constructor(batchJobService, jobQueueService) {
        this.batchJobService = batchJobService;
        this.jobQueueService = jobQueueService;
    }
    /**
     * Create a new batch job
     * @param req Express request
     * @param res Express response
     */
    createJob(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { criteria, priority = 0 } = req.body;
                // Get username from session if available
                let username = 'system';
                if (req.session && 'user' in req.session && req.session.user && typeof req.session.user === 'object' && 'username' in req.session.user) {
                    username = req.session.user.username;
                }
                // Create job record in database
                const job = {
                    status: 'PENDING',
                    criteria,
                    created_by: username
                };
                const createdJob = yield this.batchJobService.createJob(job);
                if (!createdJob.job_id) {
                    throw new errors_1.AppError(errors_1.ERROR_CODES.SYSTEM_UNEXPECTED_ERROR, 'Failed to create job record', 500);
                }
                // Add job to queue
                yield this.jobQueueService.addJob({
                    criteria,
                    batchSize: 400,
                    jobId: createdJob.job_id
                }, priority);
                res.status(201).json({
                    success: true,
                    job: createdJob
                });
            }
            catch (error) {
                logger_1.default.error('Error creating batch job:', error);
                if (error instanceof errors_1.AppError) {
                    throw error;
                }
                throw new errors_1.AppError(errors_1.ERROR_CODES.SYSTEM_UNEXPECTED_ERROR, 'An unexpected error occurred while creating batch job', 500, error);
            }
        });
    }
    /**
     * Get a batch job by ID
     * @param req Express request
     * @param res Express response
     */
    getJobById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const jobId = parseInt(req.params.id);
                if (isNaN(jobId)) {
                    throw new errors_1.AppError(errors_1.ERROR_CODES.VALIDATION_ERROR, 'Invalid job ID', 400);
                }
                const job = yield this.batchJobService.getJobById(jobId);
                if (!job) {
                    throw new errors_1.AppError(errors_1.ERROR_CODES.BATCH_JOB_NOT_FOUND, `Job with ID ${jobId} not found`, 404);
                }
                res.json({
                    success: true,
                    job
                });
            }
            catch (error) {
                logger_1.default.error('Error getting batch job:', error);
                if (error instanceof errors_1.AppError) {
                    throw error;
                }
                throw new errors_1.AppError(errors_1.ERROR_CODES.SYSTEM_UNEXPECTED_ERROR, 'An unexpected error occurred while getting batch job', 500, error);
            }
        });
    }
    /**
     * Get all batch jobs
     * @param req Express request
     * @param res Express response
     */
    getJobs(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const status = req.query.status;
                const limit = parseInt(req.query.limit || '100');
                const offset = parseInt(req.query.offset || '0');
                const jobs = yield this.batchJobService.getJobs(status, limit, offset);
                res.json({
                    success: true,
                    jobs,
                    count: jobs.length
                });
            }
            catch (error) {
                console.error('Error getting batch jobs:', error);
                res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to get batch jobs'
                });
            }
        });
    }
    /**
     * Get job logs
     * @param req Express request
     * @param res Express response
     */
    getJobLogs(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const jobId = parseInt(req.params.id);
                const limit = parseInt(req.query.limit || '100');
                const offset = parseInt(req.query.offset || '0');
                if (isNaN(jobId)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid job ID'
                    });
                    return;
                }
                const logs = yield this.batchJobService.getJobLogs(jobId, limit, offset);
                res.json({
                    success: true,
                    logs,
                    count: logs.length
                });
            }
            catch (error) {
                console.error('Error getting job logs:', error);
                res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to get job logs'
                });
            }
        });
    }
    /**
     * Get job progress
     * @param req Express request
     * @param res Express response
     */
    getJobProgress(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const jobId = parseInt(req.params.id);
                if (isNaN(jobId)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid job ID'
                    });
                    return;
                }
                const job = yield this.batchJobService.getJobById(jobId);
                if (!job) {
                    res.status(404).json({
                        success: false,
                        error: `Job with ID ${jobId} not found`
                    });
                    return;
                }
                const progress = this.batchJobService.calculateJobProgress(job);
                res.json({
                    success: true,
                    progress
                });
            }
            catch (error) {
                console.error('Error getting job progress:', error);
                res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to get job progress'
                });
            }
        });
    }
    /**
     * Get queue statistics
     * @param req Express request
     * @param res Express response
     */
    getQueueStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield this.jobQueueService.getQueueStats();
                res.json({
                    success: true,
                    stats
                });
            }
            catch (error) {
                console.error('Error getting queue stats:', error);
                res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to get queue stats'
                });
            }
        });
    }
    /**
     * Download leads for a batch job as CSV using RadarIDs from criteria
     * @param req Express request
     * @param res Express response
     */
    downloadLeadsCsv(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const jobId = parseInt(req.params.id);
                if (isNaN(jobId)) {
                    res.status(400).json({ success: false, error: 'Invalid job ID' });
                    return;
                }
                // Load the batch job
                const job = yield this.batchJobService.getJobById(jobId);
                if (!job) {
                    logger_1.default.error(`[leads-csv] Batch job not found for jobId=${jobId}`);
                    res.status(404).json({ success: false, error: 'Batch job not found' });
                    return;
                }
                // Extract RadarIDs from criteria
                const radarIds = job.criteria && Array.isArray(job.criteria.RadarID) ? job.criteria.RadarID : [];
                logger_1.default.info(`[leads-csv] jobId=${jobId} radarIds.length=${radarIds.length}`);
                if (!radarIds.length) {
                    logger_1.default.error(`[leads-csv] No RadarIDs found in batch job criteria for jobId=${jobId}`);
                    res.status(400).json({ success: false, error: 'No RadarIDs found in batch job criteria' });
                    return;
                }
                // Query complete_property_view for these RadarIDs
                // (Assume dbPool is imported from config/database)
                // Columns: address, city, state, zip, loan_id, first_name, last_name
                const { dbPool } = require('../config/database');
                const result = yield dbPool.query(`SELECT
          property_address AS address,
          property_city AS city,
          property_state AS state,
          property_zip AS zip,
          loan_id,
          primary_owner_first_name AS first_name,
          primary_owner_last_name AS last_name
        FROM public.complete_property_view
        WHERE radar_id = ANY($1)`, [radarIds]);
                const leads = result.rows;
                logger_1.default.info(`[leads-csv] jobId=${jobId} leads.length=${leads.length}`);
                if (!leads.length) {
                    logger_1.default.error(`[leads-csv] No leads found for these RadarIDs for jobId=${jobId}`);
                    res.status(404).json({ success: false, error: 'No leads found for these RadarIDs' });
                    return;
                }
                // Prepare CSV header and rows
                const columns = ['address', 'city', 'state', 'zip', 'loan_id', 'first_name', 'last_name'];
                const header = columns.join(',');
                const rows = leads.map((row) => columns.map(col => {
                    const value = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
                    // Escape double quotes and wrap in quotes if needed
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(','));
                const csv = [header, ...rows].join('\r\n');
                // Set headers for file download
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="batch_job_${jobId}_leads.csv"`);
                res.status(200).send(csv);
            }
            catch (error) {
                logger_1.default.error('Error downloading leads CSV for batch job:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to download leads CSV'
                });
            }
        });
    }
}
exports.BatchJobController = BatchJobController;
