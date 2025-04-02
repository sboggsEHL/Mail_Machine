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

// Processing batch size
const BATCH_SIZE = 200;

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

// Function to handle percentage values
function safePercentage(value) {
  // Return null for null, undefined, or string values
  if (value === null || value === undefined || value === "Other" || value === "Unknown") {
    return null;
  }
  
  // Try to convert to number
  const num = Number(value);
  
  // If not a valid number, return null
  if (isNaN(num)) {
    return null;
  }
  
  // Cap at 999.99 for precision 5, scale 2
  return num >= 0 ? Math.min(num, 999.99) : num;
}

// Function to handle interest rates
function safeInterestRate(value) {
  // Return null for null, undefined, or string values
  if (value === null || value === undefined || value === "Other" || value === "Unknown") {
    return null;
  }
  
  // Try to convert to number
  const num = Number(value);
  
  // If not a valid number, return null
  if (isNaN(num)) {
    return null;
  }
  
  // Cap at 99.999 for precision 5, scale 3
  return num >= 0 ? Math.min(num, 99.999) : 0;
}

// Connect to the database
const pool = new Pool({
  host: process.env.PR_PG_HOST,
  port: parseInt(process.env.PR_PG_PORT || '5432'),
  database: process.env.PR_PG_DATABASE,
  user: process.env.PR_PG_USER,
  password: process.env.PR_PG_PASSWORD,
  ssl: process.env.PR_PG_SSL === 'require' ? { rejectUnauthorized: false } : false
});

// Process a single file
async function processFile(filePath) {
  // Create a client to use for this entire file processing
  const client = await pool.connect();
  
  try {
    console.log(`Processing file: ${filePath}`);
    
    // Read and parse the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const rawProperties = JSON.parse(fileContent);
    
    console.log(`Found ${rawProperties.length} properties in file`);
    
    // Process in batches
    for (let i = 0; i < rawProperties.length; i += BATCH_SIZE) {
      const batch = rawProperties.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(rawProperties.length / BATCH_SIZE)}...`);
      
      // Process this batch with its own transaction
      await processBatch(client, batch);
    }
    
    console.log(`Completed processing file ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  } finally {
    // Always release the client
    client.release();
  }
}

// Process a batch of properties in a single transaction
async function processBatch(client, batch) {
  // Start a transaction
  try {
    await client.query('BEGIN');
    
    // Step 1: Get or create the lead provider
    const providerId = await getProviderId(client);
    console.log(`Using lead provider ID: ${providerId}`);
    
    // Step 2: Insert or update properties and collect their IDs
    const propertyIds = await processProperties(client, batch, providerId);
    console.log(`Processed ${Object.keys(propertyIds).length} properties`);
    
    // Step 3: Insert owners
    await processOwners(client, batch, propertyIds);
    
    // Step 4: Insert loans
    await processLoans(client, batch, propertyIds);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Transaction committed successfully');
    
    return true;
  } catch (error) {
    // Rollback in case of any error
    try {
      await client.query('ROLLBACK');
      console.log('Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
    console.error('Error processing batch:', error);
    throw error; // Rethrow to be handled by the calling function
  }
}

// Get or create the PropertyRadar provider ID
async function getProviderId(client) {
  // Check if provider exists
  const result = await client.query(
    "SELECT provider_id FROM lead_providers WHERE provider_code = 'PR'"
  );
  
  if (result.rows.length > 0) {
    return result.rows[0].provider_id;
  }
  
  // Insert new provider if it doesn't exist
  const insertResult = await client.query(
    "INSERT INTO lead_providers (provider_name, provider_code) VALUES ('PropertyRadar', 'PR') RETURNING provider_id"
  );
  
  return insertResult.rows[0].provider_id;
}

// Process properties with bulk insert/update
async function processProperties(client, batch, providerId) {
  // Map of radar_id to property_id
  const propertyIds = {};
  
  // First, get all the radar_ids
  const radarIds = batch.map(prop => prop.RadarID).filter(id => id);
  
  // Check which properties already exist
  const existingPropertiesResult = await client.query(
    'SELECT property_id, radar_id FROM properties WHERE radar_id = ANY($1)',
    [radarIds]
  );
  
  // Map existing properties
  existingPropertiesResult.rows.forEach(row => {
    propertyIds[row.radar_id] = row.property_id;
  });
  
  // Separate properties for update and insert
  const toUpdate = [];
  const toInsert = [];
  
  for (const rawProperty of batch) {
    if (!rawProperty.RadarID) continue;
    
    // Prepare common property data
    const property = {
      radar_id: rawProperty.RadarID,
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
      equity_percent: safePercentage(rawProperty.EquityPercent),
      cltv: safePercentage(rawProperty.CLTV),
      total_loan_balance: safeNumber(rawProperty.TotalLoanBalance),
      number_loans: safeNumber(rawProperty.NumberLoans),
      annual_taxes: safeNumber(rawProperty.AnnualTaxes),
      estimated_tax_rate: safeNumber(rawProperty.EstimatedTaxRate),
      last_transfer_value: safeNumber(rawProperty.LastTransferValue),
      last_transfer_down_payment_percent: safePercentage(rawProperty.LastTransferDownPaymentPercent),
      last_transfer_seller: rawProperty.LastTransferSeller || null,
      is_listed_for_sale: rawProperty.isListedForSale || null,
      in_foreclosure: rawProperty.inForeclosure || null,
      foreclosure_stage: rawProperty.ForeclosureStage || null,
      default_amount: safeNumber(rawProperty.DefaultAmount),
      in_tax_delinquency: rawProperty.inTaxDelinquency || null,
      delinquent_amount: safeNumber(rawProperty.DelinquentAmount),
      delinquent_year: safeNumber(rawProperty.DelinquentYear),
      provider_id: providerId
    };
    
    // Add last_transfer_rec_date if available
    if (rawProperty.LastTransferRecDate) {
      try {
        property.last_transfer_rec_date = new Date(rawProperty.LastTransferRecDate);
      } catch (e) {
        property.last_transfer_rec_date = null;
      }
    }
    
    // Check if property already exists
    if (propertyIds[rawProperty.RadarID]) {
      // Add to update list
      property.property_id = propertyIds[rawProperty.RadarID];
      property.updated_at = new Date();
      toUpdate.push(property);
    } else {
      // Add to insert list
      property.created_at = new Date();
      property.is_active = true;
      toInsert.push(property);
    }
  }
  
  // Process updates in a single query
  if (toUpdate.length > 0) {
    for (const property of toUpdate) {
      const updateFields = [];
      const updateValues = [];
      let valueIndex = 1;
      
      // Build the SET clause
      for (const [key, value] of Object.entries(property)) {
        if (key !== 'property_id' && key !== 'radar_id') {
          updateFields.push(`${key} = $${valueIndex}`);
          updateValues.push(value);
          valueIndex++;
        }
      }
      
      // Add the WHERE condition value
      updateValues.push(property.property_id);
      
      // Execute the update
      await client.query(
        `UPDATE properties SET ${updateFields.join(', ')} WHERE property_id = $${valueIndex}`,
        updateValues
      );
    }
    
    console.log(`Updated ${toUpdate.length} existing properties`);
  }
  
  // Process inserts in a single batch
  if (toInsert.length > 0) {
    for (const property of toInsert) {
      const insertFields = Object.keys(property);
      const placeholders = insertFields.map((_, index) => `$${index + 1}`);
      const insertValues = Object.values(property);
      
      // Execute the insert
      const result = await client.query(
        `INSERT INTO properties (${insertFields.join(', ')}) 
         VALUES (${placeholders.join(', ')}) 
         RETURNING property_id, radar_id`,
        insertValues
      );
      
      // Store the new property_id
      propertyIds[result.rows[0].radar_id] = result.rows[0].property_id;
    }
    
    console.log(`Inserted ${toInsert.length} new properties`);
  }
  
  return propertyIds;
}

// Process owners (just insert new ones)
async function processOwners(client, batch, propertyIds) {
  // Collect all owners to insert
  const owners = [];
  
  for (const rawProperty of batch) {
    const propertyId = propertyIds[rawProperty.RadarID];
    if (!propertyId) continue;
    
    // Check if we have owner data
    if (rawProperty.Owner || rawProperty.OwnerFirstName || rawProperty.OwnerLastName) {
      const phoneAvailable = rawProperty.PhoneAvailability === 'owned';
      const emailAvailable = rawProperty.EmailAvailability === 'owned';
      
      owners.push({
        property_id: propertyId,
        first_name: rawProperty.OwnerFirstName || null,
        last_name: rawProperty.OwnerLastName || null,
        full_name: rawProperty.Owner || null,
        owner_type: 'PRIMARY',
        is_primary_contact: true,
        phone_availability: phoneAvailable,
        email_availability: emailAvailable,
        is_active: true,
        created_at: new Date()
      });
    }
    
    // Add spouse if data exists
    if (rawProperty.OwnerSpouseFirstName) {
      owners.push({
        property_id: propertyId,
        first_name: rawProperty.OwnerSpouseFirstName || null,
        last_name: rawProperty.OwnerLastName || null,
        full_name: `${rawProperty.OwnerSpouseFirstName} ${rawProperty.OwnerLastName || ''}`.trim() || null,
        owner_type: 'SPOUSE',
        is_primary_contact: false,
        is_active: true,
        created_at: new Date()
      });
    }
  }
  
  // Insert all owners
  if (owners.length > 0) {
    for (const owner of owners) {
      const insertFields = Object.keys(owner);
      const placeholders = insertFields.map((_, index) => `$${index + 1}`);
      const insertValues = Object.values(owner);
      
      await client.query(
        `INSERT INTO property_owners (${insertFields.join(', ')})
         VALUES (${placeholders.join(', ')})`,
        insertValues
      );
    }
    
    console.log(`Inserted ${owners.length} owners`);
  } else {
    console.log('No owners to insert');
  }
}

// Process loans (just insert new ones)
async function processLoans(client, batch, propertyIds) {
  // Get the next loan ID sequence number once
  const loanIdResult = await client.query("SELECT nextval('loan_id_sequence_sequence_id_seq') as nextval");
  let nextLoanId = parseInt(loanIdResult.rows[0].nextval);
  
  // Collect all loans to insert
  const loans = [];
  
  for (const rawProperty of batch) {
    const propertyId = propertyIds[rawProperty.RadarID];
    if (!propertyId) continue;
    
    // Add first loan if data exists
    if (rawProperty.FirstDate || rawProperty.FirstAmount || rawProperty.FirstLoanType || rawProperty.FirstRate) {
      const loan = {
        loan_id: `LN${nextLoanId.toString().padStart(8, '0')}`,
        property_id: propertyId,
        loan_type: rawProperty.FirstLoanType || null,
        loan_amount: safeNumber(rawProperty.FirstAmount),
        interest_rate: safeInterestRate(rawProperty.FirstRate),
        rate_type: rawProperty.FirstRateType || null,
        term_years: safeNumber(rawProperty.FirstTermInYears),
        loan_purpose: rawProperty.FirstPurpose || null,
        loan_position: 1,
        first_date: null,
        first_amount: safeNumber(rawProperty.FirstAmount),
        first_rate: safeInterestRate(rawProperty.FirstRate),
        first_rate_type: rawProperty.FirstRateType || null,
        first_term_in_years: safeNumber(rawProperty.FirstTermInYears),
        first_loan_type: rawProperty.FirstLoanType || null,
        first_purpose: rawProperty.FirstPurpose || null,
        is_active: true,
        created_at: new Date()
      };
      
      // Handle origination and first_date
      if (rawProperty.FirstDate) {
        try {
          const date = new Date(rawProperty.FirstDate);
          loan.origination_date = date;
          loan.first_date = date;
        } catch (e) {
          // Invalid date, leave as null
        }
      }
      
      loans.push(loan);
      nextLoanId++;
    }
    
    // Add second loan if data exists
    if (rawProperty.SecondDate || rawProperty.SecondAmount || rawProperty.SecondLoanType) {
      const loan = {
        loan_id: `LN${nextLoanId.toString().padStart(8, '0')}`,
        property_id: propertyId,
        loan_type: rawProperty.SecondLoanType || null,
        loan_amount: safeNumber(rawProperty.SecondAmount),
        loan_position: 2,
        second_date: null,
        second_amount: safeNumber(rawProperty.SecondAmount),
        second_loan_type: rawProperty.SecondLoanType || null,
        is_active: true,
        created_at: new Date()
      };
      
      // Handle origination and second_date
      if (rawProperty.SecondDate) {
        try {
          const date = new Date(rawProperty.SecondDate);
          loan.origination_date = date;
          loan.second_date = date;
        } catch (e) {
          // Invalid date, leave as null
        }
      }
      
      loans.push(loan);
      nextLoanId++;
    }
  }
  
  // Insert all loans
  if (loans.length > 0) {
    for (const loan of loans) {
      const insertFields = Object.keys(loan);
      const placeholders = insertFields.map((_, index) => `$${index + 1}`);
      const insertValues = Object.values(loan);
      
      await client.query(
        `INSERT INTO loans (${insertFields.join(', ')})
         VALUES (${placeholders.join(', ')})`,
        insertValues
      );
    }
    
    console.log(`Inserted ${loans.length} loans`);
  } else {
    console.log('No loans to insert');
  }
}

// Process all files
async function processFiles() {
  try {
    console.log('Processing files...');
    
    let successfulFiles = 0;
    let failedFiles = 0;
    
    // Process each file
    for (const filePath of filePaths) {
      try {
        const success = await processFile(filePath);
        if (success) {
          successfulFiles++;
        } else {
          failedFiles++;
        }
      } catch (error) {
        console.error(`Fatal error processing file ${filePath}:`, error);
        failedFiles++;
      }
    }
    
    console.log(`Processing complete. Successful files: ${successfulFiles}, Failed files: ${failedFiles}`);
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
