const fs = require('fs');
const path = require('path');

// File paths to process
const filePaths = [
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/13_batch1_2025-04-01171955231.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/13_batch2_2025-04-01172305877.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/13_batch3_2025-04-01172643077.json'
];

// Helper function to safely convert values to numbers
function safeNumber(value) {
  // Return undefined for null, undefined, or string values like "Other" or "Unknown"
  if (value === null || value === undefined || value === "Other" || value === "Unknown") {
    return undefined;
  }
  
  // Try to convert to number
  const num = Number(value);
  
  // Return the number if valid, otherwise undefined
  return !isNaN(num) ? num : undefined;
}

// Function to check if a value is a string that should be a number
function isStringThatShouldBeNumber(value) {
  if (typeof value !== 'string') return false;
  
  // Try to convert to number
  const num = Number(value);
  
  // If it's a valid number as string, it's not what we're looking for
  if (!isNaN(num)) return false;
  
  // We're looking for strings like "Other" or "Unknown" in numeric fields
  return true;
}

// Fields that should be numbers
const numericFields = [
  'AVM', 'AvailableEquity', 'EquityPercent', 'CLTV', 'TotalLoanBalance',
  'NumberLoans', 'AnnualTaxes', 'EstimatedTaxRate', 'LastTransferValue',
  'LastTransferDownPaymentPercent', 'ListingPrice', 'DaysOnMarket',
  'DefaultAmount', 'DelinquentAmount', 'DelinquentYear'
];

// Process all files
async function validateFiles() {
  try {
    console.log('Validating files...');
    
    let totalProperties = 0;
    let propertiesWithStringValues = 0;
    let stringValuesFound = 0;
    
    for (const filePath of filePaths) {
      try {
        console.log(`\nProcessing file: ${filePath}`);
        
        // Read and parse the file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const properties = JSON.parse(fileContent);
        
        console.log(`Found ${properties.length} properties in file`);
        totalProperties += properties.length;
        
        // Check each property for string values in numeric fields
        for (const property of properties) {
          let hasStringValue = false;
          let fieldStrings = [];
          
          // Check each numeric field
          for (const field of numericFields) {
            if (isStringThatShouldBeNumber(property[field])) {
              hasStringValue = true;
              stringValuesFound++;
              fieldStrings.push(`${field}: "${property[field]}"`);
            }
          }
          
          // Log properties with string values
          if (hasStringValue) {
            propertiesWithStringValues++;
            console.log(`\nProperty ${property.RadarID} has string values in numeric fields:`);
            console.log(fieldStrings.join(', '));
            
            // Show how our fix would handle it
            console.log('After fix:');
            for (const field of numericFields) {
              if (isStringThatShouldBeNumber(property[field])) {
                console.log(`${field}: "${property[field]}" -> ${safeNumber(property[field])}`);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
    
    console.log(`\nValidation complete.`);
    console.log(`Total properties: ${totalProperties}`);
    console.log(`Properties with string values in numeric fields: ${propertiesWithStringValues}`);
    console.log(`Total string values found: ${stringValuesFound}`);
    console.log(`\nOur fix would convert these string values to NULL in the database.`);
  } catch (error) {
    console.error('Error validating files:', error);
  }
}

// Run the script
validateFiles().catch(console.error);