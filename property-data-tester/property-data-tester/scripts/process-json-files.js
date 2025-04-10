const fs = require('fs');
const path = require('path');

// File paths to process - using absolute paths to avoid any confusion
const filePaths = [
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/13_batch1_2025-04-01171955231.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/13_batch2_2025-04-01172305877.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/13_batch3_2025-04-01172643077.json'
];

// This script will just create marker files in the pending directory
// The worker will pick them up and process them
async function setupFilesForProcessing() {
  try {
    console.log('Setting up files for processing...');
    
    // Ensure the pending directory exists
    const pendingDir = path.join('D:/Mail_Machine/property-data-tester/logs', 'pending');
    if (!fs.existsSync(pendingDir)) {
      fs.mkdirSync(pendingDir, { recursive: true });
      console.log(`Created pending directory: ${pendingDir}`);
    }
    
    // Create marker files for each JSON file
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        continue;
      }
      
      // Read the file to get the property count
      const fileContent = fs.readFileSync(filePath, 'utf8');
      let properties;
      try {
        properties = JSON.parse(fileContent);
        console.log(`Processing file ${filePath} with ${properties.length} properties`);
      } catch (error) {
        console.error(`Error parsing JSON from ${filePath}:`, error);
        continue;
      }
      
      // Create marker file
      const markerPath = path.join(pendingDir, path.basename(filePath));
      fs.writeFileSync(markerPath, filePath, 'utf8');
      console.log(`Created marker file: ${markerPath}`);
    }
    
    console.log('Files are set up for processing.');
    console.log('The worker should now pick up these files and process them.');
    console.log('Check the worker logs for processing status.');
  } catch (error) {
    console.error('Error setting up files:', error);
  }
}

// Run the script
async function main() {
  await setupFilesForProcessing();
}

main().catch(console.error);