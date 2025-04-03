const fs = require('fs');
const path = require('path');

// Define batch files to combine
const batchFiles = [
  'property-data-tester/logs/property_payloads/2025-04/16_batch1_2025-04-02193406698.json',
  'property-data-tester/logs/property_payloads/2025-04/18_batch1_2025-04-02195710635.json',
  'property-data-tester/logs/property_payloads/2025-04/18_batch2_2025-04-02200013998.json',
  'property-data-tester/logs/property_payloads/2025-04/18_batch3_2025-04-02200141693.json',
  'property-data-tester/logs/property_payloads/2025-04/21_batch1_2025-04-02210411103.json',
  'property-data-tester/logs/property_payloads/2025-04/22_batch1_2025-04-02211543963.json'
];

// Load all batch files
console.log("Loading batch files...");
const allProperties = [];
const radarIdMap = new Map(); // Map to track properties by RadarID

for (const file of batchFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(file));
    console.log(`Loaded ${data.length} properties from ${file.split('/').pop()}`);
    
    // Add properties to the combined list, avoiding duplicates
    for (const property of data) {
      if (!radarIdMap.has(property.RadarID)) {
        allProperties.push(property);
        radarIdMap.set(property.RadarID, true);
      }
    }
  } catch (error) {
    console.error(`Error loading ${file}: ${error.message}`);
  }
}

console.log(`\nTotal unique properties: ${allProperties.length}`);

// Create output directory if it doesn't exist
const outputDir = 'property-data-tester/logs/property_payloads/2025-04';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate a timestamp for the filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 17);
const outputFile = path.join(outputDir, `combined_unique_${timestamp}.json`);

// Write the combined properties to a new file
fs.writeFileSync(outputFile, JSON.stringify(allProperties, null, 2));
console.log(`\nCombined unique properties saved to: ${outputFile}`);

// Create a pending marker file
const pendingDir = 'property-data-tester/logs/pending';
if (!fs.existsSync(pendingDir)) {
  fs.mkdirSync(pendingDir, { recursive: true });
}

const pendingFile = path.join(pendingDir, path.basename(outputFile));
fs.writeFileSync(pendingFile, outputFile);
console.log(`Pending marker created at: ${pendingFile}`);

// Create a batch file status record
console.log("\nTo process this file, you need to add it to the batch_file_status table:");
console.log(`
INSERT INTO batch_file_status (
  file_path, campaign_id, batch_number, status, 
  properties_count, success_count, error_count
) VALUES (
  '${outputFile.replace(/\\/g, '/')}', 
  4, 
  1, 
  'PENDING', 
  ${allProperties.length}, 
  0, 
  0
);
`);

console.log("\nThen run the worker to process the file:");
console.log("node property-data-tester/worker-wrapper.js");
