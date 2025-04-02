const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

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
    delinquent_year: safeNumber(rawProperty.DelinquentYear),
    is_active: true
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

// Function to save a property to the database
async function saveProperty(property) {
  const client = await pool.connect();
  
  try {
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
    
    // Check if property already exists by radar_id
    const existingPropertyResult = await client.query(
      `SELECT property_id FROM properties WHERE radar_id = $1`,
      [property.radar_id]
    );
    
    let propertyId;
    
    if (existingPropertyResult.rows.length > 0) {
      // Update existing property
      propertyId = existingPropertyResult.rows[0].property_id;
      
      // Build the update query dynamically
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
      
      await client.query(
        `UPDATE properties SET ${updateFields.join(', ')} WHERE property_id = $${valueIndex}`,
        updateValues
      );
      
      console.log(`Updated property ${property.radar_id} (ID: ${propertyId})`);
    } else {
      // Create new property
      const insertFields = Object.keys(property).join(', ');
      const insertPlaceholders = Array.from({ length: Object.keys(property).length }, (_, i) => `$${i + 1}`).join(', ');
      const insertValues = Object.values(property);
      
      // Add provider_id, created_at, and is_active
      const insertResult = await client.query(
        `INSERT INTO properties (${insertFields}, provider_id, created_at, is_active)
         VALUES (${insertPlaceholders}, $${insertValues.length + 1}, $${insertValues.length + 2}, $${insertValues.length + 3})
         RETURNING property_id`,
        [...insertValues, providerId, new Date(), true]
      );
      
      propertyId = insertResult.rows[0].property_id;
      console.log(`Created property ${property.radar_id} (ID: ${propertyId})`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    return propertyId;
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error(`Error saving property ${property.radar_id}:`, error);
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
    let successCount = 0;
    let errorCount = 0;
    
    for (const filePath of filePaths) {
      try {
        console.log(`Processing file: ${filePath}`);
        
        // Read and parse the file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const properties = JSON.parse(fileContent);
        
        console.log(`Found ${properties.length} properties in file`);
        totalProperties += properties.length;
        
        // Process each property
        for (const rawProperty of properties) {
          try {
            // Transform the property
            const transformedProperty = transformProperty(rawProperty);
            
            // Save the property
            await saveProperty(transformedProperty);
            
            successCount++;
          } catch (error) {
            console.error(`Error processing property ${rawProperty.RadarID}:`, error);
            errorCount++;
          }
        }
        
        console.log(`Completed processing file ${filePath}`);
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
    
    console.log(`Processing complete. Total: ${totalProperties}, Success: ${successCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('Error processing files:', error);
  } finally {
    pool.end();
  }
}

// Run the script
processFiles().catch(console.error);