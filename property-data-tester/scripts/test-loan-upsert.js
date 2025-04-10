/**
 * Test script for LoanRepository.bulkUpsert
 * 
 * This script tests the updated bulkUpsert method to verify it correctly
 * handles existing inactive loans by reactivating them instead of creating
 * new duplicate records.
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Import repositories
const { LoanRepository } = require('../dist/server/repositories/LoanRepository');
const { PropertyRepository } = require('../dist/server/repositories/PropertyRepository');

async function testLoanUpsert() {
  console.log('Starting loan upsert test...');
  
  // Create repositories
  const loanRepo = new LoanRepository(pool);
  const propertyRepo = new PropertyRepository(pool);
  
  // Get a client for transaction
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Step 1: Create a test property
    console.log('Creating test property...');
    const testProperty = {
      radar_id: `TEST-${Date.now()}`,
      property_address: '123 Test St',
      property_city: 'Test City',
      property_state: 'AZ',
      property_zip: '12345',
      property_type: 'SFR',
      is_active: true,
      provider_id: 1
    };
    
    const property = await propertyRepo.create(testProperty, client);
    console.log(`Created test property with ID: ${property.property_id}`);
    
    // Step 2: Create a loan for the property
    console.log('Creating test loan...');
    const testLoan = {
      property_id: property.property_id,
      loan_type: 'C',
      loan_amount: 300000,
      interest_rate: 4.5,
      lender_name: 'Test Lender',
      loan_position: 1,
      is_active: true
    };
    
    const loan = await loanRepo.create(testLoan, client);
    console.log(`Created test loan with ID: ${loan.loan_id}`);
    
    // Step 3: Deactivate the loan
    console.log('Deactivating test loan...');
    await loanRepo.update(loan.loan_id, { is_active: false }, client);
