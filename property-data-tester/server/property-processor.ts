import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { PropertyBatchService } from './services/PropertyBatchService';
import { PropertyPayloadService } from './services/PropertyPayloadService';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create services
const propertyPayloadService = new PropertyPayloadService(pool);
const propertyBatchService = new PropertyBatchService(pool, 'PR', propertyPayloadService);

/**
 * Process pending property files
 */
async function processPendingFiles() {
  console.log('Starting property file processing...');
  
  try {
    // Process pending files
    const processedCount = await propertyBatchService.processPendingFiles(10);
    console.log(`Processed ${processedCount} property files`);
    
    // Check for stuck files
    const stuckFiles = await propertyPayloadService.findStuckFiles();
    if (stuckFiles.length > 0) {
      console.warn(`Found ${stuckFiles.length} stuck files:`);
      stuckFiles.forEach(file => {
        console.warn(`- ${file.file_path} (Status: ${file.status}, Created: ${file.created_at})`);
      });
    }
    
    // Clean up old files (keep files for the current month plus previous month)
    if (process.env.AUTO_CLEANUP === 'true') {
      const removedCount = await propertyPayloadService.cleanupOldFiles(1);
      if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} old property payload directories`);
      }
    }
  } catch (error) {
    console.error('Error processing property files:', error);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Process files
    await processPendingFiles();
    
    // If running as a one-time job, exit
    if (process.env.RUN_MODE === 'once') {
      console.log('Property processing completed');
      process.exit(0);
    }
    
    // Otherwise, schedule to run every minute
    setInterval(processPendingFiles, 60000);
    console.log('Property processor running in continuous mode');
  } catch (error) {
    console.error('Fatal error in property processor:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error in property processor:', error);
  process.exit(1);
});