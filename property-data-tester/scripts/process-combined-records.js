const { exec } = require('child_process');
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

// First, run the mark-batches-completed.js script to mark all existing batch files as completed
console.log('Marking existing batch files as completed...');
exec('node property-data-tester/scripts/mark-batches-completed.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing mark-batches-completed.js: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  
  console.log(stdout);
  
  // Then, run the combine-unique-records.js script
  console.log('\nCombining unique records...');
  exec('node property-data-tester/scripts/combine-unique-records.js', async (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing combine-unique-records.js: ${error.message}`);
      return;
    }
    
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    
    console.log(stdout);
    
    // Extract the output file path from the stdout
    const outputFileMatch = stdout.match(/Combined unique properties saved to: (.+\.json)/);
    if (!outputFileMatch) {
      console.error('Could not find output file path in script output');
      return;
    }
    
    const outputFile = outputFileMatch[1];
    console.log(`Output file: ${outputFile}`);
    
    // Extract the number of properties from the stdout
    const propertiesCountMatch = stdout.match(/Total unique properties: (\d+)/);
    if (!propertiesCountMatch) {
      console.error('Could not find properties count in script output');
      return;
    }
    
    const propertiesCount = parseInt(propertiesCountMatch[1], 10);
    console.log(`Properties count: ${propertiesCount}`);
    
    // Normalize the file path for database storage
    const normalizedPath = outputFile.replace(/\\/g, '/');
    
    try {
      console.log('Connecting to database...');
      console.log(`Host: ${process.env.PR_PG_HOST}`);
      console.log(`Database: mailhaus`);
      console.log(`User: ${process.env.PR_PG_USER}`);
      
      // Insert the batch file status record
      const result = await pool.query(
        `INSERT INTO batch_file_status (
          file_path, campaign_id, batch_number, status, 
          properties_count, success_count, error_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [normalizedPath, 4, 1, 'PENDING', propertiesCount, 0, 0]
      );
      
      console.log(`Inserted batch file status record with ID: ${result.rows[0].file_id}`);
      
      // Ask for confirmation to run the worker
      console.log('\nDo you want to run the worker to process the file? (yes/no)');
      process.stdin.once('data', (data) => {
        const answer = data.toString().trim().toLowerCase();
        
        if (answer === 'yes' || answer === 'y') {
          console.log('Running worker...');
          exec('node property-data-tester/worker-wrapper.js', (error, stdout, stderr) => {
            if (error) {
              console.error(`Error executing worker: ${error.message}`);
              return;
            }
            
            if (stderr) {
              console.error(`stderr: ${stderr}`);
            }
            
            console.log(stdout);
            console.log('Worker completed.');
            process.exit(0);
          });
        } else {
          console.log('Worker not started. You can run it manually with:');
          console.log('node property-data-tester/worker-wrapper.js');
          process.exit(0);
        }
      });
    } catch (error) {
      console.error('Error inserting batch file status record:', error);
    }
  });
});
