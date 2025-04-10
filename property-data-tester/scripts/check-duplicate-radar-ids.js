const fs = require('fs');
const path = require('path');

// Function to check for duplicate radar_ids in a file
async function checkDuplicateRadarIds(filePath) {
  try {
    console.log(`Checking file: ${filePath}`);
    
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the JSON content
    const properties = JSON.parse(fileContent);
    console.log(`File contains ${properties.length} properties`);
    
    // Extract all radar_ids
    const radarIds = properties.map(property => property.RadarID);
    
    // Find duplicates
    const duplicates = findDuplicates(radarIds);
    
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate radar_ids:`);
      duplicates.forEach(duplicate => {
        const count = radarIds.filter(id => id === duplicate).length;
        console.log(`  - ${duplicate} appears ${count} times`);
        
        // Show details of the duplicate properties
        const duplicateProperties = properties.filter(property => property.RadarID === duplicate);
        console.log(`    Details for ${duplicate}:`);
        duplicateProperties.forEach((property, index) => {
          console.log(`    Property #${index + 1}:`);
          console.log(`      Address: ${property.Address || 'N/A'}`);
          console.log(`      City: ${property.City || 'N/A'}`);
          console.log(`      State: ${property.State || 'N/A'}`);
          console.log(`      First Loan: ${property.FirstAmount || 'N/A'}`);
          console.log(`      First Date: ${property.FirstDate || 'N/A'}`);
          console.log(`      Second Loan: ${property.SecondAmount || 'N/A'}`);
          console.log(`      Second Date: ${property.SecondDate || 'N/A'}`);
        });
      });
    } else {
      console.log('No duplicate radar_ids found in the file');
    }
    
    // Count properties by state
    const stateCount = {};
    properties.forEach(property => {
      const state = property.State || 'Unknown';
      stateCount[state] = (stateCount[state] || 0) + 1;
    });
    
    console.log('\nProperties by state:');
    Object.entries(stateCount).forEach(([state, count]) => {
      console.log(`  ${state}: ${count} properties`);
    });
    
    return duplicates;
  } catch (error) {
    console.error(`Error checking file ${filePath}:`, error);
    return [];
  }
}

// Helper function to find duplicates in an array
function findDuplicates(array) {
  const seen = {};
  const duplicates = [];
  
  for (const item of array) {
    if (seen[item]) {
      if (!duplicates.includes(item)) {
        duplicates.push(item);
      }
    } else {
      seen[item] = true;
    }
  }
  
  return duplicates;
}

// Main function
async function main() {
  try {
    // Check all directories where combined files might be
    const directories = [
      path.resolve(process.cwd(), 'logs/property_payloads/2025-04'),
      path.resolve(process.cwd(), 'logs/property_payloads/2025-03'),
      path.resolve(process.cwd(), '..', 'logs/property_payloads/2025-04'),
      path.resolve(process.cwd(), '..', 'logs/property_payloads/2025-03')
    ];
    
    let foundFiles = false;
    
    for (const dir of directories) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        
        // Find combined files
        const combinedFiles = files.filter(file => file.startsWith('combined_unique_'));
        
        if (combinedFiles.length > 0) {
          foundFiles = true;
          console.log(`\nFound ${combinedFiles.length} combined files in ${dir}:`);
          combinedFiles.forEach(file => console.log(`  - ${file}`));
          
          // Check each combined file
          for (const file of combinedFiles) {
            const filePath = path.join(dir, file);
            await checkDuplicateRadarIds(filePath);
          }
        }
      }
    }
    
    // If no combined files were found, check individual batch files
    if (!foundFiles) {
      console.log('\nNo combined files found. Checking individual batch files...');
      
      // Check the pending directory for batch files
      const pendingDir = path.resolve(process.cwd(), 'logs/pending');
      
      if (fs.existsSync(pendingDir)) {
        const files = fs.readdirSync(pendingDir);
        
        // Find batch files
        const batchFiles = files.filter(file => file.includes('batch'));
        
        if (batchFiles.length > 0) {
          console.log(`Found ${batchFiles.length} batch files in the pending directory`);
          
          // Check the first few batch files
          const filesToCheck = batchFiles.slice(0, 3); // Check up to 3 files
          
          for (const file of filesToCheck) {
            const filePath = path.join(pendingDir, file);
            
            // Read the marker file to get the original path
            try {
              const markerContent = fs.readFileSync(filePath, 'utf8');
              
              // Fix the path if it contains 'property-data-tester' twice
              let originalPath = markerContent;
              if (originalPath.includes('property-data-tester\\property-data-tester')) {
                originalPath = originalPath.replace('property-data-tester\\property-data-tester', 'property-data-tester');
              }
              
              // Make sure the path is absolute
              if (!path.isAbsolute(originalPath)) {
                originalPath = path.resolve(process.cwd(), '..', originalPath);
              }
              
              // Check if the file exists
              if (fs.existsSync(originalPath)) {
                await checkDuplicateRadarIds(originalPath);
              } else {
                console.log(`File not found: ${originalPath}`);
              }
            } catch (error) {
              console.error(`Error reading marker file ${filePath}:`, error);
            }
          }
        } else {
          console.log('No batch files found in the pending directory');
        }
      }
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the main function
main();
