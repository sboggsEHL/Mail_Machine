import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { PropertyBatchService } from '../server/services/PropertyBatchService';
import { PropertyPayloadService } from '../server/services/PropertyPayloadService';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const limit = parseInt(args[0]) || 10;
const cleanupMonths = parseInt(args[1]) || 1;

/**
 * Process pending property files
 */
async function main() {
  console.log('Property File Processor');
  console.log('======================');
  console.log(`Processing up to ${limit} files`);
  
  try {
    // Create database connection pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Create services
    const propertyPayloadService = new PropertyPayloadService(pool);
    const propertyBatchService = new PropertyBatchService(pool, 'PR', propertyPayloadService);
    
    // Process pending files
    console.log('\nProcessing pending files...');
    const startTime = Date.now();
    const processedCount = await propertyBatchService.processPendingFiles(limit);
    const processingTime = (Date.now() - startTime) / 1000;
    
    console.log(`Processed ${processedCount} files in ${processingTime.toFixed(2)} seconds`);
    
    // Check for stuck files
    console.log('\nChecking for stuck files...');
    const stuckFiles = await propertyPayloadService.findStuckFiles();
    if (stuckFiles.length > 0) {
      console.log(`Found ${stuckFiles.length} stuck files:`);
      stuckFiles.forEach(file => {
        console.log(`- ${file.file_path} (Status: ${file.status}, Created: ${file.created_at})`);
      });
    } else {
      console.log('No stuck files found');
    }
    
    // Clean up old files if requested
    if (args.includes('--cleanup')) {
      console.log(`\nCleaning up files older than ${cleanupMonths} month(s)...`);
      const removedCount = await propertyPayloadService.cleanupOldFiles(cleanupMonths);
      if (removedCount > 0) {
        console.log(`Removed ${removedCount} old directories`);
      } else {
        console.log('No old directories to remove');
      }
    }
    
    // Close the pool
    await pool.end();
    
    console.log('\nProcessing completed successfully');
  } catch (error) {
    console.error('Error processing property files:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});