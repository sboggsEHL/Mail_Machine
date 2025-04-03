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

async function resetCombinedBatch() {
  try {
    console.log('Connecting to database...');
    console.log(`Host: ${process.env.PR_PG_HOST}`);
    console.log(`Database: mailhaus`);
    console.log(`User: ${process.env.PR_PG_USER}`);
    
    // Find the combined batch files
    const result = await pool.query(
      `SELECT * FROM batch_file_status 
       WHERE file_path LIKE '%combined_unique_%'`
    );
    
    if (result.rows.length === 0) {
      console.log('No combined batch files found');
      return;
    }
    
    console.log(`Found ${result.rows.length} combined batch files:`);
    for (const row of result.rows) {
      console.log(`- ${row.file_path} (ID: ${row.file_id}, Status: ${row.status})`);
    }
    
    // Update the status of all combined batch files to PENDING
    const updateResult = await pool.query(
      `UPDATE batch_file_status 
       SET status = 'PENDING', 
           success_count = 0, 
           error_count = 0, 
           processed_at = NULL
       WHERE file_path LIKE '%combined_unique_%'
       RETURNING *`
    );
    
    console.log(`\nReset ${updateResult.rowCount} combined batch files to PENDING status`);
    
    // Check if the pending marker files exist
    for (const row of updateResult.rows) {
      const filePath = row.file_path;
      const fileName = path.basename(filePath);
      const pendingMarkerPath = path.resolve(process.cwd(), 'logs/pending', fileName);
      
      if (!fs.existsSync(pendingMarkerPath)) {
        console.log(`Creating pending marker file for ${fileName}`);
        fs.writeFileSync(pendingMarkerPath, filePath);
      } else {
        console.log(`Pending marker file already exists for ${fileName}`);
      }
    }
    
    console.log('\nAll combined batch files have been reset to PENDING status');
    console.log('You can now run the process-pending-files.js script to process them');
  } catch (error) {
    console.error('Error resetting combined batch:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the function
resetCombinedBatch();
