import { Router } from 'express';
import { BatchJobController } from '../controllers/BatchJobController';
import { BatchJobService } from '../services/BatchJobService';
import { JobQueueService } from '../services/JobQueueService';
import { BatchJobRepository } from '../repositories/BatchJobRepository';
import { PropertyBatchService } from '../services/PropertyBatchService';
import { Pool } from 'pg';
import { DnmRepository } from '../repositories/DnmRepository';
import { DnmService } from '../services/DnmService';

/**
 * Create batch job routes
 * @param pool Database pool
 * @returns Express router with batch job routes
 */
export function createBatchJobRoutes(pool: Pool): Router {
  // Create instances
  const batchJobRepository = new BatchJobRepository(pool);
  const dnmRepository = new DnmRepository(pool);
  const dnmService = new DnmService(dnmRepository);
  const batchJobService = new BatchJobService(batchJobRepository, dnmService);
  const propertyBatchService = new PropertyBatchService(pool);
  const jobQueueService = new JobQueueService(batchJobService, propertyBatchService);
  const batchJobController = new BatchJobController(batchJobService, jobQueueService);

  const router = Router();

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

  // Preview leads for a batch job CSV (count + DNM exclusions)
  router.get('/:id/leads-csv-preview', (req, res) => batchJobController.leadsCsvPreview(req, res));

  // Download leads as CSV for a batch job
  router.get('/:id/leads-csv', (req, res) => batchJobController.downloadLeadsCsv(req, res));

  // Get queue statistics
  router.get('/queue/stats', (req, res) => batchJobController.getQueueStats(req, res));

  return router;
}
