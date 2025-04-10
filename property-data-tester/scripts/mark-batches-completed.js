const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create database connection
const pool = new Pool({
  host: process.env.PR_PG_HOST,
  port: process.env.PR_PG_PORT,
  database: 'mailhaus',
  user: process.env.PR_PG_USER,
  password: process.env.PR_PG_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

// Batch files to mark as completed
const batchFiles = [
  'logs/property_payloads/2025-04/16_batch1_2025-04-02193406698.json',
  'logs/property_payloads/2025-04/18_batch1_2025-04-02195710635.json',
  'logs/property_payloads/2025-04/18_batch2_2025-04-02200013998.json',
  'logs/property_payloads/2025-04/18_batch3_2025-04-02200141693.json',
  'logs/property_payloads/2025-04/21_batch1_2025-04-02210411103.json',
  'logs/property_payloads/2025-04/22_batch1_2025-04-02211543963.json'
];

// Combined batch files
const combinedBatchFiles = [
  'logs/property_payloads/2025-04/combined_unique_2025-04-02T225230.json',
  'logs/property_payloads/2025-04/combined_unique_2025-04-02T225353.json'
];

// Parse command line arguments
const args = process.argv.slice(2);
const action = args[0] || 'complete'; // Default action is 'complete'
const targetFiles = args[1] || 'all'; // Default target is 'all'

async function markBatchStatus() {
  try {
    console.log('Connecting to database...');
    console.log(`Host: ${process.env.PR_PG_HOST}`);
    console.log(`Database: mailhaus`);
    console.log(`User: ${process.env.PR_PG_USER}`);
    
    if (action === 'complete') {
      await markAsCompleted(targetFiles);
    } else if (action === 'pending') {
      await markAsPending(targetFiles);
    } else {
      console.log(`Unknown action: ${action}. Use 'complete' or 'pending'.`);
    }
  } catch (error) {
    console.error(`Error marking batches as ${action}:`, error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

async function markAsCompleted(target) {
  console.log(`Marking batch files as COMPLETED (target: ${target})...`);
  
  if (target === 'all' || target === 'regular') {
    // Update each regular batch file status to COMPLETED
    for (const batchFile of batchFiles) {
      try {
        const result = await pool.query(
          `UPDATE batch_file_status 
           SET status = 'COMPLETED', 
               success_count = properties_count, 
               error_count = 0, 
               processed_at = NOW()
           WHERE file_path = $1
           RETURNING *`,
          [batchFile]
        );
        
        if (result.rowCount > 0) {
          console.log(`Updated file status to COMPLETED for: ${batchFile}`);
        } else {
          console.log(`File not found in database: ${batchFile}`);
        }
      } catch (error) {
        console.error(`Error updating file status for ${batchFile}:`, error);
      }
    }
  }
  
  if (target === 'all' || target === 'combined') {
    // Update combined batch files to COMPLETED
    for (const batchFile of combinedBatchFiles) {
      try {
        const result = await pool.query(
          `UPDATE batch_file_status 
           SET status = 'COMPLETED', 
               success_count = properties_count, 
               error_count = 0, 
               processed_at = NOW()
           WHERE file_path = $1
           RETURNING *`,
          [batchFile]
        );
        
        if (result.rowCount > 0) {
          console.log(`Updated file status to COMPLETED for: ${batchFile}`);
        } else {
          console.log(`File not found in database: ${batchFile}`);
        }
      } catch (error) {
        console.error(`Error updating file status for ${batchFile}:`, error);
      }
    }
  }
  
  if (target === 'all' || target === 'pending') {
    // Also update any pending batch files
    try {
      const result = await pool.query(
        `UPDATE batch_file_status 
         SET status = 'COMPLETED', 
             success_count = properties_count, 
             error_count = 0, 
             processed_at = NOW()
         WHERE status = 'PENDING'
         RETURNING *`
      );
      
      console.log(`Updated ${result.rowCount} pending batch files to COMPLETED`);
    } catch (error) {
      console.error('Error updating pending batch files:', error);
    }
  }
  
  console.log('Batch files have been marked as COMPLETED');
}

async function markAsPending(target) {
  console.log(`Marking batch files as PENDING (target: ${target})...`);
  
  let filesToUpdate = [];
  
  if (target === 'all') {
    filesToUpdate = [...batchFiles, ...combinedBatchFiles];
  } else if (target === 'regular') {
    filesToUpdate = batchFiles;
  } else if (target === 'combined') {
    filesToUpdate = combinedBatchFiles;
  }
  
  for (const batchFile of filesToUpdate) {
    try {
      const result = await pool.query(
        `UPDATE batch_file_status 
         SET status = 'PENDING', 
             success_count = 0, 
             error_count = 0, 
             processed_at = NULL
         WHERE file_path = $1
         RETURNING *`,
        [batchFile]
      );
      
      if (result.rowCount > 0) {
        console.log(`Updated file status to PENDING for: ${batchFile}`);
        
        // Create pending marker file if it doesn't exist
        const fileName = path.basename(batchFile);
        const pendingMarkerPath = path.resolve(process.cwd(), 'logs/pending', fileName);
        
        if (!fs.existsSync(pendingMarkerPath)) {
          console.log(`Creating pending marker file for ${fileName}`);
          fs.writeFileSync(pendingMarkerPath, batchFile);
        } else {
          console.log(`Pending marker file already exists for ${fileName}`);
        }
      } else {
        console.log(`File not found in database: ${batchFile}`);
      }
    } catch (error) {
      console.error(`Error updating file status for ${batchFile}:`, error);
    }
  }
  
  console.log('Batch files have been marked as PENDING');
}

// Run the function
markBatchStatus();

// Usage examples:
// node mark-batches-completed.js                  # Mark all files as completed (default)
// node mark-batches-completed.js complete         # Mark all files as completed
// node mark-batches-completed.js pending          # Mark all files as pending
// node mark-batches-completed.js pending combined # Mark only combined files as pending
