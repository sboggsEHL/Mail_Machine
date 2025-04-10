import { Request, Response } from 'express';
import { Pool } from 'pg';
import { PropertyBatchService } from '../services/PropertyBatchService';
import { PropertyPayloadService } from '../services/PropertyPayloadService';

/**
 * Controller for property file operations
 */
export class PropertyFileController {
  private pool: Pool;
  private propertyPayloadService: PropertyPayloadService;
  private propertyBatchService: PropertyBatchService;
  
  constructor(pool: Pool) {
    this.pool = pool;
    this.propertyPayloadService = new PropertyPayloadService(pool);
    this.propertyBatchService = new PropertyBatchService(pool, 'PR', this.propertyPayloadService);
  }
  
  /**
   * Process pending property files
   * @param req Request
   * @param res Response
   */
  async processFiles(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10, cleanup = false } = req.body;
      
      // Process pending files
      const startTime = Date.now();
      const processedCount = await this.propertyBatchService.processPendingFiles(limit);
      const processingTime = (Date.now() - startTime) / 1000;
      
      // Check for stuck files
      const stuckFiles = await this.propertyPayloadService.findStuckFiles();
      
      // Clean up old files if requested
      if (cleanup) {
        await this.propertyPayloadService.cleanupOldFiles(1);
      }
      
      res.json({
        processedCount,
        processingTime,
        stuckFiles: stuckFiles.length
      });
    } catch (error) {
      console.error('Error processing property files:', error);
      res.status(500).json({
        error: 'Failed to process property files',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Additional methods can be added here as needed
}