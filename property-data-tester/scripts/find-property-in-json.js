const fs = require('fs');
const path = require('path');

// Define batch files to search
const batchFiles = [
  'property-data-tester/logs/property_payloads/2025-04/16_batch1_2025-04-02193406698.json',
  'property-data-tester/logs/property_payloads/2025-04/18_batch1_2025-04-02195710635.json',
  'property-data-tester/logs/property_payloads/2025-04/18_batch2_2025-04-02200013998.json',
  'property-data-tester/logs/property_payloads/2025-04/18_batch3_2025-04-02200141693.json',
  'property-data-tester/logs/property_payloads/2025-04/21_batch1_2025-04-02210411103.json',
  'property-data-tester/logs/property_payloads/2025-04/22_batch1_2025-04-02211543963.json',
  'property-data-tester/logs/property_payloads/2025-04/combined_unique_2025-04-02T225230.json',
  'property-data-tester/logs/property_payloads/2025-04/combined_unique_2025-04-02T225353.json'
];

// Property to search for
const targetRadarId = 'P84D5D9D';
const targetAddress = '11-3888 6TH ST';

console.log(`Searching for property with RadarID: ${targetRadarId} and address: ${targetAddress}`);

// Search each batch file
for (const file of batchFiles) {
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file));
      console.log(`Loaded ${data.length} properties from ${file.split('/').pop()}`);
      
      // Search for the property
      const foundProperties = data.filter(property => 
        property.RadarID === targetRadarId || 
        (property.PropertyAddress && property.PropertyAddress.includes(targetAddress))
      );
      
      if (foundProperties.length > 0) {
        console.log(`\nFound ${foundProperties.length} matching properties in ${file.split('/').pop()}`);
        
        // Print details of each found property
        foundProperties.forEach((property, index) => {
          console.log(`\nProperty ${index + 1}:`);
          console.log(`RadarID: ${property.RadarID}`);
          console.log(`Address: ${property.PropertyAddress}`);
          
          // Check if the property has loans
          if (property.Loans && property.Loans.length > 0) {
            console.log(`Loans: ${property.Loans.length}`);
            property.Loans.forEach((loan, loanIndex) => {
              console.log(`\nLoan ${loanIndex + 1}:`);
              console.log(JSON.stringify(loan, null, 2));
            });
          } else {
            console.log('No loans found for this property');
          }
        });
      }
    } else {
      console.log(`File not found: ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}: ${error.message}`);
  }
}
