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
  // Return null for null, undefined, or string values like "Other" or "Unknown"
  if (value === null || value === undefined || value === "Other" || value === "Unknown") {
    return null;
  }
  
  // Try to convert to number
  const num = Number(value);
  
  // Return the number if valid, otherwise null
  return !isNaN(num) ? num : null;
}

// Function to transform property data
function transformProperty(rawProperty) {
  try {
    // Create property object with safe number conversions
    const property = {
      radar_id: rawProperty.RadarID || null,
      property_address: rawProperty.Address || null,
      property_city: rawProperty.City || null,
      property_state: rawProperty.State || null,
      property_zip: rawProperty.ZipFive || null,
      property_type: rawProperty.PType || null,
      county: rawProperty.County || null,
      apn: rawProperty.APN || null,
      ownership_type: rawProperty.OwnershipType || null,
      is_same_mailing_or_exempt: rawProperty.isSameMailingOrExempt || null,
      is_mail_vacant: rawProperty.isMailVacant || null,
      avm: safeNumber(rawProperty.AVM),
      available_equity: safeNumber(rawProperty.AvailableEquity),
      equity_percent: safeNumber(rawProperty.EquityPercent),
      cltv: safeNumber(rawProperty.CLTV),
      total_loan_balance: safeNumber(rawProperty.TotalLoanBalance),
      number_loans: safeNumber(rawProperty.NumberLoans),
      annual_taxes: safeNumber(rawProperty.AnnualTaxes),
      estimated_tax_rate: safeNumber(rawProperty.EstimatedTaxRate),
      last_transfer_value: safeNumber(rawProperty.LastTransferValue),
      last_transfer_down_payment_percent: safeNumber(rawProperty.LastTransferDownPaymentPercent),
      is_listed_for_sale: rawProperty.isListedForSale || null,
      listing_price: safeNumber(rawProperty.ListingPrice),
      days_on_market: safeNumber(rawProperty.DaysOnMarket),
      in_foreclosure: rawProperty.inForeclosure || null,
      foreclosure_stage: rawProperty.ForeclosureStage || null,
      default_amount: safeNumber(rawProperty.DefaultAmount),
      in_tax_delinquency: rawProperty.inTaxDelinquency || null,
      delinquent_amount: safeNumber(rawProperty.DelinquentAmount),
      delinquent_year: safeNumber(rawProperty.DelinquentYear)
    };
    
    // Handle dates separately to avoid issues
    if (rawProperty.LastTransferRecDate) {
      try {
        property.last_transfer_rec_date = new Date(rawProperty.LastTransferRecDate);
      } catch (e) {
        property.last_transfer_rec_date = null;
      }
    } else {
      property.last_transfer_rec_date = null;
    }
    
    // Handle last_transfer_seller separately
    property.last_transfer_seller = rawProperty.LastTransferSeller || null;
    
    return property;
  } catch (error) {
    console.error('Error transforming property:', error);
    throw error;
  }
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

// Process a single property
async function processProperty(client, property, providerId) {
  try {
    // Check if property already exists
    const existingResult = await client.query(
      `SELECT property_id FROM properties WHERE radar_id = $1`,
      [property.radar_id]
    );
    
    if (existingResult.rows.length > 0) {
      // Update existing property
      const propertyId = existingResult.rows[0].property_id;
      
      // Build the update query
      const updateFields = [];
      const updateValues = [];
      let valueIndex = 1;
      
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
      
      const updateQuery = `
        UPDATE properties 
        SET ${updateFields.join(', ')} 
        WHERE property_id = $${valueIndex}
      `;
      
      await client.query(updateQuery, updateValues);
      return { updated: true };
    } else {
      // Insert new property
      const insertFields = Object.keys(property).join(', ');
      const insertPlaceholders = Array.from({ length: Object.keys(property).length }, (_, i) => `$${i + 1}`).join(', ');
      const insertValues = Object.values(property);
      
      const insertQuery = `
        INSERT INTO properties (${insertFields}, provider_id, created_at, is_active)
        VALUES (${insertPlaceholders}, $${insertValues.length + 1}, $${insertValues.length + 2}, $${insertValues.length + 3})
      `;
      
      await client.query(insertQuery, [...insertValues, providerId, new Date(), true]);
      return { inserted: true };
    }
  } catch (error) {
    console.error(`Error processing property ${property.radar_id}:`, error);
    throw error;
  }
}

// Get or create the PropertyRadar provider
async function getProviderId(client) {
  try {
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
  } catch (error) {
    console.error('Error getting provider ID:', error);
    throw error;
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
    
    let updatedCount = 0;
    let insertedCount = 0;
    let errorCount = 0;
    
    // Process properties one by one for maximum reliability
    for (let i = 0; i < rawProperties.length; i++) {
      try {
        const rawProperty = rawProperties[i];
        const property = transformProperty(rawProperty);
        
        const result = await processProperty(client, property, providerId);
        
        if (result.updated) {
          updatedCount++;
        } else if (result.inserted) {
          insertedCount++;
        }
        
        // Log progress every 50 properties
        if ((i + 1) % 50 === 0) {
          console.log(`Processed ${i + 1}/${rawProperties.length} properties`);
        }
      } catch (error) {
        errorCount++;
        // Continue with next property even if this one fails
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`Completed processing file ${filePath}. Updated: ${updatedCount}, Inserted: ${insertedCount}, Errors: ${errorCount}`);
    return { total: rawProperties.length, updated: updatedCount, inserted: insertedCount, errors: errorCount };
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
    console.log('Processing files...');
    
    let totalProperties = 0;
    let totalUpdated = 0;
    let totalInserted = 0;
    let totalErrors = 0;
    let successfulFiles = 0;
    let failedFiles = 0;
    
    // Process each file with its own transaction
    for (const filePath of filePaths) {
      try {
        const result = await processFile(filePath);
        totalProperties += result.total;
        totalUpdated += result.updated;
        totalInserted += result.inserted;
        totalErrors += result.errors;
        successfulFiles++;
      } catch (error) {
        failedFiles++;
        // Continue with next file even if this one fails
      }
    }
    
    console.log(`Processing complete.`);
    console.log(`Total properties: ${totalProperties}`);
    console.log(`Updated: ${totalUpdated}, Inserted: ${totalInserted}, Errors: ${totalErrors}`);
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