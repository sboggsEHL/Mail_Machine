import { Request, Response } from 'express';
import { BatchJobService } from '../services/BatchJobService';
import { JobQueueService } from '../services/JobQueueService';
import { BatchJob } from '../models';
import { AppError, ERROR_CODES } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Controller for batch job operations
 */
export class BatchJobController {
  constructor(
    private batchJobService: BatchJobService,
    private jobQueueService: JobQueueService
  ) {}

  /**
   * Create a new batch job
   * @param req Express request
   * @param res Express response
   */
  async createJob(req: Request, res: Response): Promise<void> {
    try {
      const { criteria, priority = 0 } = req.body;
      
      // Get username from session if available
      let username = 'system';
      if (req.session && 'user' in req.session && req.session.user && typeof req.session.user === 'object' && 'username' in req.session.user) {
        username = req.session.user.username as string;
      }
      
      // Create job record in database
      const job: BatchJob = {
        status: 'PENDING',
        criteria,
        created_by: username
      };
      
      const createdJob = await this.batchJobService.createJob(job);
      
      if (!createdJob.job_id) {
        throw new AppError(
          ERROR_CODES.SYSTEM_UNEXPECTED_ERROR,
          'Failed to create job record',
          500
        );
      }
      
      // Add job to queue
      await this.jobQueueService.addJob({
        criteria,
        batchSize: 400,
        jobId: createdJob.job_id
      }, priority);
      
      res.status(201).json({
        success: true,
        job: createdJob
      });
    } catch (error) {
      logger.error('Error creating batch job:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.SYSTEM_UNEXPECTED_ERROR,
        'An unexpected error occurred while creating batch job',
        500,
        error
      );
    }
  }

  /**
   * Get a batch job by ID
   * @param req Express request
   * @param res Express response
   */
  async getJobById(req: Request, res: Response): Promise<void> {
    try {
      const jobId = parseInt(req.params.id);
      
      if (isNaN(jobId)) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid job ID',
          400
        );
      }
      
      const job = await this.batchJobService.getJobById(jobId);
      
      if (!job) {
        throw new AppError(
          ERROR_CODES.BATCH_JOB_NOT_FOUND,
          `Job with ID ${jobId} not found`,
          404
        );
      }
      
      res.json({
        success: true,
        job
      });
    } catch (error) {
      logger.error('Error getting batch job:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.SYSTEM_UNEXPECTED_ERROR,
        'An unexpected error occurred while getting batch job',
        500,
        error
      );
    }
  }

  /**
   * Get all batch jobs
   * @param req Express request
   * @param res Express response
   */
  async getJobs(req: Request, res: Response): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string || '100');
      const offset = parseInt(req.query.offset as string || '0');
      
      const jobs = await this.batchJobService.getJobs(status, limit, offset);
      
      res.json({
        success: true,
        jobs,
        count: jobs.length
      });
    } catch (error: any) {
      console.error('Error getting batch jobs:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get batch jobs'
      });
    }
  }

  /**
   * Get job logs
   * @param req Express request
   * @param res Express response
   */
  async getJobLogs(req: Request, res: Response): Promise<void> {
    try {
      const jobId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string || '100');
      const offset = parseInt(req.query.offset as string || '0');
      
      if (isNaN(jobId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid job ID'
        });
        return;
      }
      
      const logs = await this.batchJobService.getJobLogs(jobId, limit, offset);
      
      res.json({
        success: true,
        logs,
        count: logs.length
      });
    } catch (error: any) {
      console.error('Error getting job logs:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get job logs'
      });
    }
  }

  /**
   * Get job progress
   * @param req Express request
   * @param res Express response
   */
  async getJobProgress(req: Request, res: Response): Promise<void> {
    try {
      const jobId = parseInt(req.params.id);
      
      if (isNaN(jobId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid job ID'
        });
        return;
      }
      
      const job = await this.batchJobService.getJobById(jobId);
      
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
    } catch (error: any) {
      console.error('Error getting job progress:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get job progress'
      });
    }
  }

  /**
   * Get queue statistics
   * @param req Express request
   * @param res Express response
   */
  async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.jobQueueService.getQueueStats();
      
      res.json({
        success: true,
        stats
      });
    } catch (error: any) {
      console.error('Error getting queue stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get queue stats'
      });
    }
  }

  /**
   * Download leads for a batch job as CSV using RadarIDs from criteria
   * @param req Express request
   * @param res Express response
   */
  async downloadLeadsCsv(req: Request, res: Response): Promise<void> {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        res.status(400).json({ success: false, error: 'Invalid job ID' });
        return;
      }

      // Load the batch job
      const job = await this.batchJobService.getJobById(jobId);
      if (!job) {
        logger.error(`[leads-csv] Batch job not found for jobId=${jobId}`);
        res.status(404).json({ success: false, error: 'Batch job not found' });
        return;
      }

      // Extract RadarIDs from criteria
      const radarIds = job.criteria && Array.isArray(job.criteria.RadarID) ? job.criteria.RadarID : [];
      logger.info(`[leads-csv] jobId=${jobId} radarIds.length=${radarIds.length}`);
      if (!radarIds.length) {
        logger.error(`[leads-csv] No RadarIDs found in batch job criteria for jobId=${jobId}`);
        res.status(400).json({ success: false, error: 'No RadarIDs found in batch job criteria' });
        return;
      }

      // Query complete_property_view for these RadarIDs
      // (Assume dbPool is imported from config/database)
      // Columns: address, city, state, zip, loan_id, first_name, last_name
      const { dbPool } = require('../config/database');
      const result = await dbPool.query(
        `SELECT
          property_address AS address,
          property_city AS city,
          property_state AS state,
          property_zip AS zip,
          loan_id,
          primary_owner_first_name AS first_name,
          primary_owner_last_name AS last_name
        FROM public.complete_property_view
        WHERE radar_id = ANY($1)`,
        [radarIds]
      );

      const leads = result.rows;
      logger.info(`[leads-csv] jobId=${jobId} leads.length=${leads.length}`);

      if (!leads.length) {
        logger.error(`[leads-csv] No leads found for these RadarIDs for jobId=${jobId}`);
        res.status(404).json({ success: false, error: 'No leads found for these RadarIDs' });
        return;
      }

      // Prepare CSV header and rows
      const columns = ['address', 'city', 'state', 'zip', 'loan_id', 'first_name', 'last_name'];
      const header = columns.join(',');
      const rows = leads.map((row: any) =>
        columns.map(col => {
          const value = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
          // Escape double quotes and wrap in quotes if needed
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );
      const csv = [header, ...rows].join('\r\n');

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="batch_job_${jobId}_leads.csv"`);
      res.status(200).send(csv);
    } catch (error) {
      logger.error('Error downloading leads CSV for batch job:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download leads CSV'
      });
    }
  }
}
