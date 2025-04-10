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
}
