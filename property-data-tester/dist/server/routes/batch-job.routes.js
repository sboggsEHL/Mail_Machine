"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBatchJobRoutes = void 0;
const express_1 = require("express");
const BatchJobController_1 = require("../controllers/BatchJobController");
const BatchJobService_1 = require("../services/BatchJobService");
const JobQueueService_1 = require("../services/JobQueueService");
const BatchJobRepository_1 = require("../repositories/BatchJobRepository");
const PropertyBatchService_1 = require("../services/PropertyBatchService");
/**
 * Create batch job routes
 * @param pool Database pool
 * @returns Express router with batch job routes
 */
function createBatchJobRoutes(pool) {
    // Create instances
    const batchJobRepository = new BatchJobRepository_1.BatchJobRepository(pool);
    const batchJobService = new BatchJobService_1.BatchJobService(batchJobRepository);
    const propertyBatchService = new PropertyBatchService_1.PropertyBatchService(pool);
    const jobQueueService = new JobQueueService_1.JobQueueService(batchJobService, propertyBatchService);
    const batchJobController = new BatchJobController_1.BatchJobController(batchJobService, jobQueueService);
    const router = (0, express_1.Router)();
    // Create a new batch job
    router.post('/', (req, res) => batchJobController.createJob(req, res));
    // Get all batch jobs
    router.get('/', (req, res) => batchJobController.getJobs(req, res));
    // Get a batch job by ID
    router.get('/:id', (req, res) => batchJobController.getJobById(req, res));
    // Get job logs
    router.get('/:id/logs', (req, res) => batchJobController.getJobLogs(req, res));
    // Get job progress
    router.get('/:id/progress', (req, res) => batchJobController.getJobProgress(req, res));
    // Download leads as CSV for a batch job
    router.get('/:id/leads-csv', (req, res) => batchJobController.downloadLeadsCsv(req, res));
    // Get queue statistics
    router.get('/queue/stats', (req, res) => batchJobController.getQueueStats(req, res));
    return router;
}
exports.createBatchJobRoutes = createBatchJobRoutes;
