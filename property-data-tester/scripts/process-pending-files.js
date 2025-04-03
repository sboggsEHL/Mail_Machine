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

// Process pending files
async function processPendingFiles() {
  try {
    console.log('Connecting to database...');
    console.log(`Host: ${process.env.PR_PG_HOST}`);
    console.log(`Database: mailhaus`);
    console.log(`User: ${process.env.PR_PG_USER}`);
    
    // Get pending files
    console.log('Getting pending files...');
    const pendingFiles = await propertyPayloadService.getPendingFiles(10);
    console.log(`Found ${pendingFiles.length} pending files`);
    
    if (pendingFiles.length === 0) {
      console.log('No pending files found. Checking if file exists in pending directory...');
      
      // Check if the file exists in the pending directory
      const pendingDir = path.resolve(process.cwd(), 'logs/pending');
      const files = fs.readdirSync(pendingDir);
      console.log(`Found ${files.length} files in pending directory:`);
      files.forEach(file => console.log(`- ${file}`));
      
      // Check if our combined unique file is there
      const combinedFiles = files.filter(file => file.startsWith('combined_unique_'));
      if (combinedFiles.length > 0) {
        const targetFile = combinedFiles[0]; // Use the first combined file
        console.log(`Found combined file ${targetFile} in pending directory`);
        
        // Check if the file exists in the database
        const result = await pool.query(
          'SELECT * FROM batch_file_status WHERE file_path = $1',
          [`logs/property_payloads/2025-04/${targetFile}`]
        );
        
        if (result.rows.length > 0) {
          console.log(`File exists in database with status: ${result.rows[0].status}`);
        } else {
          console.log('File not found in database');
        }
      } else {
        console.log(`Target file ${targetFile} not found in pending directory`);
      }
      
      process.exit(0);
    }
    
    // Process each file
    for (const { fileStatus, originalPath } of pendingFiles) {
      console.log(`Processing file: ${originalPath}`);
      console.log(`File status: ${JSON.stringify(fileStatus)}`);
      
      try {
        // Read the file
        const fileContent = fs.readFileSync(originalPath, 'utf8');
        const properties = JSON.parse(fileContent);
        console.log(`File contains ${properties.length} properties`);
        
        // Process the properties
        console.log('Saving properties to database...');
        const savedProperties = await propertyBatchService.saveProperties('PR', properties);
        console.log(`Successfully saved ${savedProperties.length} properties to database`);
        
        // Skip marking file as processed due to database type mismatch errors
        // Instead, just update the status directly
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
          // Continue processing other files even if we can't update the status
        }
        
        console.log(`File ${originalPath} processed successfully`);
      } catch (error) {
        console.error(`Error processing file ${originalPath}:`, error);
      }
    }
    
    console.log('All pending files processed');
  } catch (error) {
    console.error('Error processing pending files:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the function
processPendingFiles();
