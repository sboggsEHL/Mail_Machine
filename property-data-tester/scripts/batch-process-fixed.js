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

// Get or create the PropertyRadar provider
async function getProviderId(client) {
  // Get provider_id
  const leadProviderResult = await client.query(
    `SELECT provider_id FROM lead_providers WHERE provider_code = $1`,
    ['PR']
  );
  
  if (leadProviderResult.rows.length > 0) {
    return leadProviderResult.rows[0].provider_id;
  } else {
    // Create the provider if it doesn't exist
    const insertResult = await client.query(
      `INSERT INTO lead_providers (provider_name, provider_code)
       VALUES ($1, $2)
       RETURNING provider_id`,
      ['PropertyRadar', 'PR']
    );
    return insertResult.rows[0].provider_id;
  }
}

// Process a single file
async function processFile(filePath) {
  const client = await pool.connect();
  
  try {
    console.log(`Processing file: ${filePath}`);
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Get provider ID
    const providerId = await getProviderId(client);
    
    // Read and parse the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const rawProperties = JSON.parse(fileContent);
    
    console.log(`Found ${rawProperties.length} properties in file`);
    
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
    
    let updatedCount = 0;
    let insertedCount = 0;
    
    // Batch update existing properties
    if (propertiesToUpdate.length > 0) {
      console.log(`Updating ${propertiesToUpdate.length} existing properties...`);
      
      // Process in smaller batches to avoid query size limits
      const BATCH_SIZE = 50;
      for (let i = 0; i < propertiesToUpdate.length; i += BATCH_SIZE) {
        const batch = propertiesToUpdate.slice(i, i + BATCH_SIZE);
        
        // Update each property individually to avoid complex SQL
        for (const property of batch) {
          const propertyId = property.property_id;
          delete property.property_id;
          
          const updateFields = [];
          const updateValues = [];
          let valueIndex = 1;
          
          // Add each property field
          for (const [key, value] of Object.entries(property)) {
            if (key !== 'radar_id') {
              updateFields.push(`${key} = $${valueIndex}`);
              updateValues.push(value);
              valueIndex++;
            }
          }
          
          // Add provider_id and updated_at
          updateFields.push(`provider_id = $${valueIndex}`);
          updateValues.push(providerId);
          valueIndex++;
          
          updateFields.push(`updated_at = $${valueIndex}`);
          updateValues.push(new Date());
          valueIndex++;
          
          // Add the property_id for the WHERE clause
          updateValues.push(propertyId);
          
          await client.query(
            `UPDATE properties SET ${updateFields.join(', ')} WHERE property_id = $${valueIndex}`,
            updateValues
          );
        }
        
        updatedCount += batch.length;
      }
    }
    
    // Batch insert new properties
    if (propertiesToInsert.length > 0) {
      console.log(`Inserting ${propertiesToInsert.length} new properties...`);
      
      // Process in smaller batches to avoid query size limits
      const BATCH_SIZE = 50;
      for (let i = 0; i < propertiesToInsert.length; i += BATCH_SIZE) {
        const batch = propertiesToInsert.slice(i, i + BATCH_SIZE);
        
        // Insert each property individually to avoid complex SQL
        for (const property of batch) {
          const insertFields = Object.keys(property).join(', ');
          const insertPlaceholders = Array.from({ length: Object.keys(property).length }, (_, i) => `$${i + 1}`).join(', ');
          const insertValues = Object.values(property);
          
          // Add provider_id, created_at, and is_active
          await client.query(
            `INSERT INTO properties (${insertFields}, provider_id, created_at, is_active)
             VALUES (${insertPlaceholders}, $${insertValues.length + 1}, $${insertValues.length + 2}, $${insertValues.length + 3})`,
            [...insertValues, providerId, new Date(), true]
          );
        }
        
        insertedCount += batch.length;
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`Completed processing file ${filePath}. Updated: ${updatedCount}, Inserted: ${insertedCount}`);
    return { total: properties.length, updated: updatedCount, inserted: insertedCount };
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error(`Error processing file ${filePath}:`, error);
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
}

// Process all files
async function processFiles() {
  try {
    console.log('Processing files in batch mode...');
    
    let totalProperties = 0;
    let totalUpdated = 0;
    let totalInserted = 0;
    let successfulFiles = 0;
    let failedFiles = 0;
    
    // Process each file with its own transaction
    for (const filePath of filePaths) {
      try {
        const result = await processFile(filePath);
        totalProperties += result.total;
        totalUpdated += result.updated;
        totalInserted += result.inserted;
        successfulFiles++;
      } catch (error) {
        failedFiles++;
        // Continue with next file even if this one fails
      }
    }
    
    console.log(`Processing complete.`);
    console.log(`Total properties: ${totalProperties}`);
    console.log(`Updated: ${totalUpdated}, Inserted: ${totalInserted}`);
    console.log(`Successful files: ${successfulFiles}, Failed files: ${failedFiles}`);
  } catch (error) {
    console.error('Error processing files:', error);
  } finally {
    // Close the pool
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