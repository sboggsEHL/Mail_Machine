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

// File to reset (relative path from the project root)
const fileToReset = 'logs/property_payloads/2025-04/16_batch1_2025-04-02193406698.json';

// Function to reset file status
async function resetFileStatus() {
  try {
    console.log('Connecting to database...');
    console.log(`Host: ${process.env.PR_PG_HOST}`);
    console.log(`Database: mailhaus`);
    console.log(`User: ${process.env.PR_PG_USER}`);
    
    // Check if file exists
    const fullPath = path.resolve(process.cwd(), fileToReset);
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      process.exit(1);
    }
    
    // Normalize path for database comparison
    const normalizedPath = fileToReset.replace(/\\/g, '/');
    
    // Find the file in the database
    const findResult = await pool.query(
      'SELECT * FROM batch_file_status WHERE file_path = $1',
      [normalizedPath]
    );
    
    if (findResult.rows.length === 0) {
      console.log(`File not found in database: ${normalizedPath}`);
      
      // Read the file to get property count
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const properties = JSON.parse(fileContent);
      const propertiesCount = properties.length;
      
      // Insert a new record
      const insertResult = await pool.query(
        `INSERT INTO batch_file_status (
          file_path, campaign_id, batch_number, status, 
          properties_count, success_count, error_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [normalizedPath, '16', 1, 'PENDING', propertiesCount, 0, 0]
      );
      
      console.log(`Created new batch file status record with ID: ${insertResult.rows[0].file_id}`);
    } else {
      const fileStatus = findResult.rows[0];
      console.log(`Found file in database with ID: ${fileStatus.file_id}, status: ${fileStatus.status}`);
      
      // Reset the status to PENDING
      const updateResult = await pool.query(
        `UPDATE batch_file_status
         SET status = 'PENDING', 
             success_count = 0, 
             error_count = 0, 
             processed_at = NULL,
             processing_time_ms = NULL,
             error_details = NULL
         WHERE file_id = $1
         RETURNING *`,
        [fileStatus.file_id]
      );
      
      console.log(`Reset file status to PENDING for ID: ${updateResult.rows[0].file_id}`);
    }
    
    // Check if the file exists in the processed directory
    const processedMarker = path.resolve(process.cwd(), 'logs/processed', path.basename(fileToReset));
    if (fs.existsSync(processedMarker)) {
      console.log(`Removing processed marker: ${processedMarker}`);
      fs.unlinkSync(processedMarker);
    }
    
    // Create a pending marker
    const pendingMarker = path.resolve(process.cwd(), 'logs/pending', path.basename(fileToReset));
    console.log(`Creating pending marker: ${pendingMarker}`);
    fs.writeFileSync(pendingMarker, fileToReset, 'utf8');
    
    console.log('File status reset successfully!');
    console.log('You can now run the worker to process this file.');
    
  } catch (error) {
    console.error('Error resetting file status:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the function
resetFileStatus();
