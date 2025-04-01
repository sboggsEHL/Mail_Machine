import * as dotenv from 'dotenv';
import { dbPool, testDatabaseConnection, logDatabaseConfig } from './config/database';
import { BatchJobRepository } from './repositories/BatchJobRepository';
import { BatchJobService } from './services/BatchJobService';
import { PropertyBatchService } from './services/PropertyBatchService';
import { JobQueueService } from './services/JobQueueService';

// Load environment variables
dotenv.config();

/**
 * Main worker function
 */
async function startWorker() {
  try {
    console.log('Starting batch processing worker...');
    
    // Log configuration
    logDatabaseConfig();
    
    // Test database connection
    await testDatabaseConnection(dbPool);
    
    // Create services
    const batchJobRepository = new BatchJobRepository(dbPool);
    const batchJobService = new BatchJobService(batchJobRepository);
    const propertyBatchService = new PropertyBatchService(dbPool);
    
    // Create job queue service (this will start processing jobs)
    const jobQueueService = new JobQueueService(batchJobService, propertyBatchService, dbPool);
    
    console.log('Worker started successfully');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('Shutting down worker...');
      jobQueueService.stopPolling();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting worker:', error);
    process.exit(1);
  }
}

// Start the worker
startWorker();
