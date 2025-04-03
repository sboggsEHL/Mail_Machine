const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import required modules
const { PropertyBatchService } = require('../dist/server/services/PropertyBatchService');
const { PropertyPayloadService } = require('../dist/server/services/PropertyPayloadService');
const { createPropertyRadarProvider } = require('../dist/server/services/lead-providers/propertyradar');
const { leadProviderFactory } = require('../dist/server/services/lead-providers/LeadProviderFactory');

// Create database connection
const pool = new Pool({
  host: process.env.PR_PG_HOST,
  port: process.env.PR_PG_PORT,
  database: 'mailhaus',
  user: process.env.PR_PG_USER,
  password: process.env.PR_PG_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

// Register PropertyRadar provider
const propertyRadarToken = process.env.PROPERTY_RADAR_TOKEN;
if (propertyRadarToken) {
  const propertyRadarProvider = createPropertyRadarProvider(propertyRadarToken);
  leadProviderFactory.registerProvider(propertyRadarProvider);
  console.log(`Registered PropertyRadar provider with token: ${propertyRadarToken.substring(0, 5)}...`);
} else {
  console.warn('No PropertyRadar token found in environment variables');
  process.exit(1);
}

// Create services
const propertyPayloadService = new PropertyPayloadService(pool);
const propertyBatchService = new PropertyBatchService(pool, 'PR', propertyPayloadService);

// Process the combined unique file
async function processCombinedFile() {
  try {
    console.log('Connecting to database...');
    console.log(`Host: ${process.env.PR_PG_HOST}`);
    console.log(`Database: mailhaus`);
    console.log(`User: ${process.env.PR_PG_USER}`);
    
    // Check if the combined unique file exists in the pending directory
    const pendingDir = path.resolve(process.cwd(), 'logs/pending');
    const files = fs.readdirSync(pendingDir);
    console.log(`Found ${files.length} files in pending directory`);
    
    // Find the combined unique file
    const combinedFiles = files.filter(file => file.startsWith('combined_unique_'));
    if (combinedFiles.length === 0) {
      console.log('No combined unique files found in pending directory');
      return;
    }
    
    const targetFile = combinedFiles[0]; // Use the first combined file
    console.log(`Found combined file ${targetFile} in pending directory`);
    
    // Get the content of the pending marker file to find the original path
    const pendingMarkerPath = path.join(pendingDir, targetFile);
    let originalPath = fs.readFileSync(pendingMarkerPath, 'utf8');
    console.log(`Original path from marker: ${originalPath}`);
    
    // Fix the path if it contains 'property-data-tester' twice
    if (originalPath.includes('property-data-tester\\property-data-tester')) {
      originalPath = originalPath.replace('property-data-tester\\property-data-tester', 'property-data-tester');
    }
    
    // Make sure the path is absolute
    if (!path.isAbsolute(originalPath)) {
      originalPath = path.resolve(process.cwd(), '..', originalPath);
    }
    
    console.log(`Resolved path: ${originalPath}`);
    
    // Check if the file exists in the database
    const result = await pool.query(
      'SELECT * FROM batch_file_status WHERE file_path = $1',
      [originalPath.replace(/\\/g, '/')]
    );
    
    let fileStatus;
    if (result.rows.length > 0) {
      fileStatus = result.rows[0];
      console.log(`File exists in database with status: ${fileStatus.status}`);
    } else {
      console.log('File not found in database, creating a new record');
      
      // Read the file to get the number of properties
      const fileContent = fs.readFileSync(originalPath, 'utf8');
      const properties = JSON.parse(fileContent);
      
      // Insert a new record
      const insertResult = await pool.query(
        `INSERT INTO batch_file_status (
          file_path, campaign_id, batch_number, status, 
          properties_count, success_count, error_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [originalPath.replace(/\\/g, '/'), 4, 1, 'PENDING', properties.length, 0, 0]
      );
      
      fileStatus = insertResult.rows[0];
      console.log(`Created new batch file status record with ID: ${fileStatus.file_id}`);
    }
    
    // Process the file
    try {
      // Read the file
      console.log(`Reading file: ${originalPath}`);
      const fileContent = fs.readFileSync(originalPath, 'utf8');
      const properties = JSON.parse(fileContent);
      console.log(`File contains ${properties.length} properties`);
      
      // Process the properties
      console.log('Saving properties to database...');
      const savedProperties = await propertyBatchService.saveProperties('PR', properties);
      console.log(`Successfully saved ${savedProperties.length} properties to database`);
      
      // Update the status directly
      try {
        await pool.query(
          `UPDATE batch_file_status 
           SET status = 'COMPLETED', 
               success_count = $1, 
               error_count = 0, 
               processed_at = NOW()
           WHERE file_id = $2`,
          [savedProperties.length, fileStatus.file_id]
        );
        console.log(`Updated file status to COMPLETED for ID: ${fileStatus.file_id}`);
      } catch (updateError) {
        console.error(`Error updating file status: ${updateError.message}`);
      }
      
      console.log(`File ${originalPath} processed successfully`);
    } catch (error) {
      console.error(`Error processing file ${originalPath}:`, error);
    }
  } catch (error) {
    console.error('Error processing combined file:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the function
processCombinedFile();
