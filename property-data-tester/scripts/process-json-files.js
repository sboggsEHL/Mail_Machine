const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PropertyBatchService } = require('../dist/server/services/PropertyBatchService');
require('dotenv').config();

// File paths to process
const filePaths = [
  'logs/property_payloads/2025-04/13_batch1_2025-04-01171955231.json',
  'logs/property_payloads/2025-04/13_batch2_2025-04-01172305877.json',
  'logs/property_payloads/2025-04/13_batch3_2025-04-01172643077.json'
];

// Connect to the database
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: false } : false
});

async function setupFilesForProcessing() {
  try {
    console.log('Setting up files for processing...');
    
    // Ensure the pending directory exists
    const pendingDir = path.join(process.cwd(), 'logs', 'pending');
    if (!fs.existsSync(pendingDir)) {
      fs.mkdirSync(pendingDir, { recursive: true });
      console.log(`Created pending directory: ${pendingDir}`);
    }
    
    // Create marker files and database entries for each JSON file
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const batchNumber = i + 1;
      
      // Read the file to get the property count
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const properties = JSON.parse(fileContent);
      const propertiesCount = properties.length;
      
      console.log(`Processing file ${filePath} with ${propertiesCount} properties`);
      
      // Create marker file
      const markerPath = path.join(pendingDir, path.basename(filePath));
      fs.writeFileSync(markerPath, filePath, 'utf8');
      console.log(`Created marker file: ${markerPath}`);
      
      // Create database entry
      const result = await pool.query(`
        INSERT INTO batch_file_status (
          file_path, 
          campaign_id, 
          batch_number, 
          status, 
          properties_count, 
          success_count, 
          error_count,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (file_path) DO UPDATE 
        SET status = 'PENDING', success_count = 0, error_count = 0
        RETURNING *
      `, [
        filePath,
        'test-campaign',
        batchNumber,
        'PENDING',
        propertiesCount,
        0,
        0
      ]);
      
      console.log(`Created database entry for file ${filePath}: ID ${result.rows[0].file_id}`);
    }
    
    console.log('Files are set up for processing.');
  } catch (error) {
    console.error('Error setting up files:', error);
  }
}

async function processPendingFiles() {
  try {
    console.log('Processing pending files...');
    
    const propertyBatchService = new PropertyBatchService(pool);
    const processedCount = await propertyBatchService.processPendingFiles();
    
    console.log(`Processed ${processedCount} files`);
  } catch (error) {
    console.error('Error processing files:', error);
  } finally {
    pool.end();
  }
}

// Run the script
async function main() {
  await setupFilesForProcessing();
  await processPendingFiles();
}

main().catch(console.error);