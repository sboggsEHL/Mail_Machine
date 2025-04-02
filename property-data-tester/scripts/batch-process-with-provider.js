const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const { createPropertyRadarProvider } = require('../dist/server/services/lead-providers/propertyradar');
const { leadProviderFactory } = require('../dist/server/services/lead-providers/LeadProviderFactory');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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

// API endpoint
const API_BASE = 'http://localhost:3001/api';

// Create batch data with correct format
const batch_data = {
  "criteria": {
    "RadarID": [
      "P1760F4C",
      "P1C557F5",
      "P1804F1D",
      "P74E29E4",
      "P1B6AC43"
    ],
    "campaign_id": "3",
    "batch_number": 1,
    "provider_id": 1
  },
  "priority": 0
};

async function processBatch() {
  try {
    // Create batch job
    console.log("\nCreating batch job...");
    const response = await axios.post(`${API_BASE}/batch-jobs`, batch_data);
    
    const job_data = response.data;
    const job_id = job_data.job.job_id;
    console.log(`Created batch job with ID: ${job_id}`);
    
    // Monitor progress
    console.log("\nMonitoring progress...");
    
    const monitorInterval = setInterval(async () => {
      try {
        // Get job progress
        const progressResponse = await axios.get(`${API_BASE}/batch-jobs/${job_id}/progress`);
        const progress = progressResponse.data.progress;
        
        console.log(`\nProgress Update:`);
        console.log("=".repeat(50));
        console.log(`Processed: ${progress.processed_records}/${progress.total_records}`);
        console.log(`Success: ${progress.success_count}`);
        console.log(`Errors: ${progress.error_count}`);
        console.log(`Percent Complete: ${progress.percent_complete}%`);
        
        // Get latest logs
        const logsResponse = await axios.get(`${API_BASE}/batch-jobs/${job_id}/logs`);
        const logs = logsResponse.data.logs;
        
        if (logs && logs.length > 0) {
          console.log("\nLatest Logs:");
          console.log("=".repeat(50));
          
          for (const log of logs.slice(0, 5)) {
            console.log(`[${log.level}] ${log.message}`);
          }
        }
        
        // Check if complete
        const jobResponse = await axios.get(`${API_BASE}/batch-jobs/${job_id}`);
        const job = jobResponse.data.job;
        
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
          console.log(`\nJob ${job.status}`);
          
          if (job.error_details) {
            console.log(`Error details: ${job.error_details}`);
          }
          
          clearInterval(monitorInterval);
          process.exit(0);
        }
      } catch (error) {
        console.error('Error monitoring job:', error.message);
      }
    }, 5000);
    
  } catch (error) {
    if (error.response) {
      console.error(`Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    console.error('Make sure the server is running on port 3001');
    process.exit(1);
  }
}

// Start the batch process
processBatch();
