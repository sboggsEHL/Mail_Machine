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
  // Return undefined for null, undefined, or non-numeric strings
  if (value === null || value === undefined) {
    return undefined;
  }
  
  // Try to convert to number
  const num = Number(value);
  
  // Return the number if valid, otherwise undefined
  return !isNaN(num) ? num : undefined;
}

// Function to check if a value is not a valid number
function isNotValidNumber(value) {
  if (value === null || value === undefined) return false;
  
  // If it's already a number, it's valid
  if (typeof value === 'number') return false;
  
  // Try to convert to number
  const num = Number(value);
  
  // If it's NaN, it's not a valid number
  return isNaN(num);
}

// Fields that should be numbers
const numericFields = [
  'AVM', 'AvailableEquity', 'EquityPercent', 'CLTV', 'TotalLoanBalance',
  'NumberLoans', 'AnnualTaxes', 'EstimatedTaxRate', 'LastTransferValue',
  'LastTransferDownPaymentPercent', 'ListingPrice', 'DaysOnMarket',
  'DefaultAmount', 'DelinquentAmount', 'DelinquentYear', 'FirstAmount',
  'FirstRate', 'FirstTermInYears', 'SecondAmount'
];

// Process all files
async function validateFiles() {
  try {
    console.log('Validating files for ANY non-numeric values in numeric fields...');
    
    let totalProperties = 0;
    let propertiesWithNonNumericValues = 0;
    let nonNumericValuesFound = 0;
    
    for (const filePath of filePaths) {
      try {
        console.log(`\nProcessing file: ${filePath}`);
        
        // Read and parse the file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const properties = JSON.parse(fileContent);
        
        console.log(`Found ${properties.length} properties in file`);
        totalProperties += properties.length;
        
        // Check each property for non-numeric values in numeric fields
        for (const property of properties) {
          let hasNonNumericValue = false;
          let fieldValues = [];
          
          // Check each numeric field
          for (const field of numericFields) {
            if (property[field] !== undefined && isNotValidNumber(property[field])) {
              hasNonNumericValue = true;
              nonNumericValuesFound++;
              fieldValues.push(`${field}: "${property[field]}" (${typeof property[field]})`);
            }
          }
          
          // Log properties with non-numeric values
          if (hasNonNumericValue) {
            propertiesWithNonNumericValues++;
            console.log(`\nProperty ${property.RadarID} has non-numeric values in numeric fields:`);
            console.log(fieldValues.join('\n'));
            
            // Show how our fix would handle it
            console.log('\nAfter fix:');
            for (const field of numericFields) {
              if (property[field] !== undefined && isNotValidNumber(property[field])) {
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
    console.log(`Properties with non-numeric values in numeric fields: ${propertiesWithNonNumericValues}`);
    console.log(`Total non-numeric values found: ${nonNumericValuesFound}`);
    
    if (nonNumericValuesFound === 0) {
      console.log(`\nNo non-numeric values found in numeric fields. The error might be coming from a different source.`);
      console.log(`Possible causes:`);
      console.log(`1. The error is in different JSON files than the ones we're checking`);
      console.log(`2. The error is in a different part of the code`);
      console.log(`3. The error has already been fixed`);
    } else {
      console.log(`\nOur fix would convert these non-numeric values to NULL in the database.`);
    }
  } catch (error) {
    console.error('Error validating files:', error);
  }
}

// Run the script
validateFiles().catch(console.error);