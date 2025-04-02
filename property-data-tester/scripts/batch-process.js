const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// File paths to process
const filePaths = [
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch1_2025-04-01182240071.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch2_2025-04-01182558097.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch3_2025-04-01182938050.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch4_2025-04-01183255691.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch5_2025-04-01183640748.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch6_2025-04-01184043193.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch7_2025-04-01184430772.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch8_2025-04-01184806614.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch9_2025-04-01185122442.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch10_2025-04-01185509798.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch11_2025-04-01185833954.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch12_2025-04-01190156207.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch13_2025-04-01190524835.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch14_2025-04-01190920020.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch15_2025-04-01191315433.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch16_2025-04-01191745672.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch17_2025-04-01192051515.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch18_2025-04-01192413158.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch19_2025-04-01192705563.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch20_2025-04-01193001085.json',
  'D:/Mail_Machine/property-data-tester/logs/property_payloads/2025-04/14_batch21_2025-04-01193113312.json'
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

// Function to transform property data
function transformProperty(rawProperty) {
  // Create property object with safe number conversions
  const property = {
    radar_id: rawProperty.RadarID,
    property_address: rawProperty.Address,
    property_city: rawProperty.City,
    property_state: rawProperty.State,
    property_zip: rawProperty.ZipFive,
    property_type: rawProperty.PType,
    county: rawProperty.County,
    apn: rawProperty.APN,
    ownership_type: rawProperty.OwnershipType,
    is_same_mailing_or_exempt: rawProperty.isSameMailingOrExempt,
    is_mail_vacant: rawProperty.isMailVacant,
    avm: safeNumber(rawProperty.AVM),
    available_equity: safeNumber(rawProperty.AvailableEquity),
    equity_percent: safeNumber(rawProperty.EquityPercent),
    cltv: safeNumber(rawProperty.CLTV),
    total_loan_balance: safeNumber(rawProperty.TotalLoanBalance),
    number_loans: safeNumber(rawProperty.NumberLoans),
    annual_taxes: safeNumber(rawProperty.AnnualTaxes),
    estimated_tax_rate: safeNumber(rawProperty.EstimatedTaxRate),
    last_transfer_rec_date: rawProperty.LastTransferRecDate ? new Date(rawProperty.LastTransferRecDate) : undefined,
    last_transfer_value: safeNumber(rawProperty.LastTransferValue),
    last_transfer_down_payment_percent: safeNumber(rawProperty.LastTransferDownPaymentPercent),
    last_transfer_seller: rawProperty.LastTransferSeller,
    is_listed_for_sale: rawProperty.isListedForSale,
    listing_price: safeNumber(rawProperty.ListingPrice),
    days_on_market: safeNumber(rawProperty.DaysOnMarket),
    in_foreclosure: rawProperty.inForeclosure,
    foreclosure_stage: rawProperty.ForeclosureStage,
    default_amount: safeNumber(rawProperty.DefaultAmount),
    in_tax_delinquency: rawProperty.inTaxDelinquency,
    delinquent_amount: safeNumber(rawProperty.DelinquentAmount),
    delinquent_year: safeNumber(rawProperty.DelinquentYear)
  };
  
  return property;
}

// Connect to the database using the correct environment variable names
const pool = new Pool({
  host: process.env.PR_PG_HOST,
  port: parseInt(process.env.PR_PG_PORT || '5432'),
  database: process.env.PR_PG_DATABASE,
  user: process.env.PR_PG_USER,
  password: process.env.PR_PG_PASSWORD,
  ssl: process.env.PR_PG_SSL === 'require' ? { rejectUnauthorized: false } : false
});

// Process all files using batch operations
async function processFiles() {
  const client = await pool.connect();
  
  try {
    console.log('Processing files in batch mode...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Get provider_id
    const leadProviderResult = await client.query(
      `SELECT provider_id FROM lead_providers WHERE provider_code = $1`,
      ['PR']
    );
    
    let providerId;
    
    if (leadProviderResult.rows.length > 0) {
      providerId = leadProviderResult.rows[0].provider_id;
    } else {
      // Create the provider if it doesn't exist
      const insertResult = await client.query(
        `INSERT INTO lead_providers (provider_name, provider_code)
         VALUES ($1, $2)
         RETURNING provider_id`,
        ['PropertyRadar', 'PR']
      );
      providerId = insertResult.rows[0].provider_id;
    }
    
    let totalProperties = 0;
    let processedProperties = 0;
    
    // Process each file
    for (const filePath of filePaths) {
      try {
        console.log(`Processing file: ${filePath}`);
        
        // Read and parse the file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const rawProperties = JSON.parse(fileContent);
        
        console.log(`Found ${rawProperties.length} properties in file`);
        totalProperties += rawProperties.length;
        
        // Transform all properties
        const properties = rawProperties.map(rawProperty => transformProperty(rawProperty));
        
        // Get all radar_ids to check which ones already exist
        const radarIds = properties.map(p => p.radar_id);
        
        // Find existing properties
        const existingPropertiesResult = await client.query(
          `SELECT property_id, radar_id FROM properties WHERE radar_id = ANY($1)`,
          [radarIds]
        );
        
        // Create a map of radar_id to property_id for existing properties
        const existingPropertiesMap = new Map();
        existingPropertiesResult.rows.forEach(row => {
          existingPropertiesMap.set(row.radar_id, row.property_id);
        });
        
        // Separate properties into those to update and those to insert
        const propertiesToUpdate = [];
        const propertiesToInsert = [];
        
        properties.forEach(property => {
          if (existingPropertiesMap.has(property.radar_id)) {
            propertiesToUpdate.push({
              ...property,
              property_id: existingPropertiesMap.get(property.radar_id)
            });
          } else {
            propertiesToInsert.push(property);
          }
        });
        
        // Batch update existing properties
        if (propertiesToUpdate.length > 0) {
          console.log(`Updating ${propertiesToUpdate.length} existing properties...`);
          
          // Process in smaller batches to avoid query size limits
          const BATCH_SIZE = 100;
          for (let i = 0; i < propertiesToUpdate.length; i += BATCH_SIZE) {
            const batch = propertiesToUpdate.slice(i, i + BATCH_SIZE);
            
            // Build a massive case statement for each property
            const cases = [];
            const values = [];
            let valueIndex = 1;
            
            batch.forEach(property => {
              const propertyId = property.property_id;
              delete property.property_id;
              
              const setClauses = [];
              
              // Add each property field
              for (const [key, value] of Object.entries(property)) {
                if (key !== 'radar_id') {
                  setClauses.push(`${key} = $${valueIndex}`);
                  values.push(value);
                  valueIndex++;
                }
              }
              
              // Add provider_id and updated_at
              setClauses.push(`provider_id = $${valueIndex}`);
              values.push(providerId);
              valueIndex++;
              
              setClauses.push(`updated_at = $${valueIndex}`);
              values.push(new Date());
              valueIndex++;
              
              cases.push(`WHEN property_id = $${valueIndex} THEN (${setClauses.join(', ')})`);
              values.push(propertyId);
            });
            
            // Build the update query
            const updateQuery = `
              UPDATE properties AS p SET
                ${Object.keys(batch[0]).filter(k => k !== 'radar_id' && k !== 'property_id').map(k => `${k} = c.${k}`).join(',\n                ')},
                provider_id = c.provider_id,
                updated_at = c.updated_at
              FROM (
                SELECT *
                FROM (VALUES
                  ${batch.map((_, i) => {
                    const offset = i * (Object.keys(batch[0]).length + 1); // +1 for property_id
                    return `(
                      $${offset + 1}::integer, 
                      ${Object.keys(batch[0])
                        .filter(k => k !== 'property_id')
                        .map((_, j) => `$${offset + j + 2}`)
                        .join(', ')}
                    )`;
                  }).join(',\n                  ')}
                ) AS t(
                  property_id, 
                  ${Object.keys(batch[0])
                    .filter(k => k !== 'property_id')
                    .join(', ')}
                )
              ) AS c
              WHERE p.property_id = c.property_id
            `;
            
            // Flatten all values for the query
            const flatValues = [];
            batch.forEach(property => {
              flatValues.push(property.property_id);
              Object.entries(property)
                .filter(([k]) => k !== 'property_id')
                .forEach(([_, v]) => flatValues.push(v));
            });
            
            // Execute the update
            await client.query(updateQuery, flatValues);
          }
        }
        
        // Batch insert new properties
        if (propertiesToInsert.length > 0) {
          console.log(`Inserting ${propertiesToInsert.length} new properties...`);
          
          // Process in smaller batches to avoid query size limits
          const BATCH_SIZE = 100;
          for (let i = 0; i < propertiesToInsert.length; i += BATCH_SIZE) {
            const batch = propertiesToInsert.slice(i, i + BATCH_SIZE);
            
            // Get column names (excluding property_id which is auto-generated)
            const columnNames = Object.keys(batch[0]);
            
            // Build VALUES part of the query
            const valueRows = [];
            const values = [];
            let valueIndex = 1;
            
            batch.forEach(property => {
              const valuePlaceholders = [];
              
              // Add each property field
              for (const value of Object.values(property)) {
                valuePlaceholders.push(`$${valueIndex}`);
                values.push(value);
                valueIndex++;
              }
              
              // Add provider_id, created_at, and is_active
              valuePlaceholders.push(`$${valueIndex}`);
              values.push(providerId);
              valueIndex++;
              
              valuePlaceholders.push(`$${valueIndex}`);
              values.push(new Date());
              valueIndex++;
              
              valuePlaceholders.push(`$${valueIndex}`);
              values.push(true);
              valueIndex++;
              
              valueRows.push(`(${valuePlaceholders.join(', ')})`);
            });
            
            // Build the insert query
            const insertQuery = `
              INSERT INTO properties (
                ${columnNames.join(', ')}, 
                provider_id, 
                created_at, 
                is_active
              )
              VALUES ${valueRows.join(',\n              ')}
            `;
            
            // Execute the insert
            await client.query(insertQuery, values);
          }
        }
        
        processedProperties += properties.length;
        console.log(`Completed processing file ${filePath}`);
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        // Continue with next file even if this one fails
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`Processing complete. Total properties: ${totalProperties}, Processed: ${processedProperties}`);
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error processing files:', error);
  } finally {
    // Release client back to pool
    client.release();
    pool.end();
  }
}

// Run the script
console.time('Processing time');
processFiles()
  .then(() => {
    console.timeEnd('Processing time');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    console.timeEnd('Processing time');
  });