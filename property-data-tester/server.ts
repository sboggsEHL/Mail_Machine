import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Pool, PoolClient, QueryResult } from 'pg';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { configureRoutes } from './server/routes';
import session from 'express-session';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define interfaces
interface SessionUser {
  id: number;
  username: string;
}

// Extend Express session
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

// Interface for database query response
interface TableExistsResult {
  exists: boolean;
}

interface DbInfoResult {
  current_database: string;
  current_user: string;
}

interface SearchPathResult {
  search_path: string;
}

interface TableNameResult {
  table_name: string;
}

interface CountResult {
  count: string;
}

interface TimeResult {
  now: Date;
}

interface PropertyInsertResult {
  property_id: number;
}

interface DnmInsertResult {
  dnm_id: number;
}

// Interface for PropertyRadar API requests
interface PropertyRadarCriterion {
  name: string;
  value: any[];
}

interface PropertyRadarRequest {
  Criteria: PropertyRadarCriterion[];
}

// Interface for property data
interface PropertyOwner {
  Owner?: string;
  OwnerFirstName?: string;
  OwnerLastName?: string;
  OwnerSpouseFirstName?: string;
  PhoneAvailability?: string;
  EmailAvailability?: string;
}

interface PropertyLoan {
  FirstDate?: string;
  FirstAmount?: number;
  FirstRate?: number;
  FirstRateType?: string;
  FirstTermInYears?: number;
  FirstLoanType?: string;
  FirstPurpose?: string;
  SecondDate?: string;
  SecondAmount?: number;
  SecondLoanType?: string;
}

interface PropertyData extends PropertyOwner, PropertyLoan {
  RadarID: string;
  Address: string;
  City: string;
  State: string;
  ZipFive: string;
  PType: string;
  County: string;
  APN: string;
  OwnershipType: string;
  isSameMailingOrExempt: boolean;
  isMailVacant: boolean;
  AVM?: number;
  AvailableEquity?: number;
  EquityPercent?: number;
  CLTV?: number;
  TotalLoanBalance?: number;
  NumberLoans?: number;
  AnnualTaxes?: number;
  EstimatedTaxRate?: number;
  LastTransferRecDate?: string;
  LastTransferValue?: number;
  LastTransferDownPaymentPercent?: number;
  LastTransferSeller?: string;
  isListedForSale?: boolean;
  ListingPrice?: number;
  DaysOnMarket?: number;
  inForeclosure?: boolean;
  ForeclosureStage?: string;
  DefaultAmount?: number;
  inTaxDelinquency?: boolean;
  DelinquentAmount?: number;
  DelinquentYear?: number;
  [key: string]: any;
}

interface InsertedProperty {
  radarId: string;
  propertyId: number;
  address: string;
  city: string;
  state: string;
}

// Interface for request bodies
interface FetchPropertiesRequest {
  fields: string[];
  limit: number;
  start: number;
  purchase: number;
  criteria: {
    state?: string;
    propertyTypes?: string[];
    loanTypes?: string[];
    isSameMailingOrExempt?: boolean;
    isMailVacant?: boolean;
    inForeclosure?: boolean;
    isListedForSale?: boolean;
    equityPercent?: [number | null, number | null];
    totalLoanBalance?: [number | null, number | null];
    firstRate?: [number | null, number | null];
  };
}

interface InsertPropertiesRequest {
  properties: PropertyData[];
}

interface LoginRequest {
  username: string;
  password: string;
}

interface DnmRequest {
  loanId?: string;
  propertyId?: string | number;
  radarId?: string;
  reason?: string;
  reasonCategory?: string;
  notes?: string;
}

// Create Express app
const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Add session middleware
app.use(session({
  secret: 'elevated-property-data-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Configure SSL based on environment variable
let sslConfig: boolean | { rejectUnauthorized: boolean };
if (process.env.PR_PG_SSL === 'require') {
  sslConfig = { rejectUnauthorized: false };
} else if (process.env.PR_PG_SSL === 'true') {
  sslConfig = { rejectUnauthorized: false };
} else {
  sslConfig = false;
}

// PostgreSQL connection to mailhaus database using environment variables
const pool = new Pool({
  host: process.env.PR_PG_HOST,
  port: parseInt(process.env.PR_PG_PORT || '5432'),
  database: process.env.PR_PG_DATABASE,
  user: process.env.PR_PG_USER,
  password: process.env.PR_PG_PASSWORD,
  ssl: sslConfig
});

// Log pool errors
pool.on('error', (err: Error) => {
  console.error('Unexpected pool error', err);
});

// Log connection details for debugging
console.log('Database connection details:');
console.log('Host:', process.env.PR_PG_HOST);
console.log('Port:', process.env.PR_PG_PORT);
console.log('Database:', process.env.PR_PG_DATABASE);
console.log('User:', process.env.PR_PG_USER);
console.log('SSL Config:', process.env.PR_PG_SSL);

// Test database connection immediately upon startup
(async (): Promise<void> => {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    console.log('Successfully connected to database on startup');
    
    // Check search_path
    const searchPathResult: QueryResult<SearchPathResult> = await client.query('SHOW search_path');
    console.log('Search path:', searchPathResult.rows[0].search_path);
    
    // Check if lead_providers exists
    const tableResult: QueryResult<TableExistsResult> = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'lead_providers'
      )
    `);
    console.log('Lead providers table exists on startup:', tableResult.rows[0].exists);
    
    // List all tables in public schema
    const allTablesResult: QueryResult<TableNameResult> = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Available tables on startup:', allTablesResult.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('Error testing database connection on startup:', err);
  } finally {
    if (client) client.release();
  }
})();

// Test database connection and check for required tables
app.get('/api/test-db', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Testing database connection...');
    const result: QueryResult<TimeResult> = await pool.query('SELECT NOW()');
    console.log('Connection successful, checking for lead_providers table...');
    
    try {
      // Try to query the lead_providers table
      const tablesResult: QueryResult<TableExistsResult> = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'lead_providers'
        );
      `);
      
      const tableExists = tablesResult.rows[0].exists;
      console.log('lead_providers table exists:', tableExists);
      
      // Check what tables actually exist
      const allTablesResult: QueryResult<TableNameResult> = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      console.log('Available tables:', allTablesResult.rows.map(r => r.table_name).join(', '));
      
      res.json({ 
        success: true, 
        time: result.rows[0].now,
        lead_providers_exists: tableExists,
        available_tables: allTablesResult.rows.map(r => r.table_name)
      });
    } catch (tableError) {
      console.error('Error checking tables:', tableError);
      res.status(500).json({ 
        success: false, 
        connectionOk: true,
        error: `Database connected but error checking tables: ${(tableError as Error).message}` 
      });
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

// Fetch properties from PropertyRadar API
app.post('/api/fetch-properties', async (req: Request<{}, {}, FetchPropertiesRequest>, res: Response): Promise<void> => {
  try {
    const { fields, limit, start, purchase, criteria } = req.body;
    
    // Build the API URL with query parameters as shown in the Postman example
    const apiUrl = `https://api.propertyradar.com/v1/properties?Fields=${fields.join(',')}&Limit=${limit}&Start=${start}&Purchase=${purchase}`;
    
    // Function to transform frontend criteria to PropertyRadar format
    const transformCriteria = (criteriaObj: FetchPropertiesRequest['criteria']): PropertyRadarCriterion[] => {
      const result: PropertyRadarCriterion[] = [];
      
      // Add state if present
      if (criteriaObj.state) {
        result.push({
          name: "State",
          value: [criteriaObj.state]
        });
      }
      
      // Add property types if present
      if (criteriaObj.propertyTypes && criteriaObj.propertyTypes.length > 0) {
        result.push({
          name: "PropertyType",
          value: [
            {
              name: "PType",
              value: criteriaObj.propertyTypes
            }
          ]
        });
      }
      
      // Add loan types if present
      if (criteriaObj.loanTypes && criteriaObj.loanTypes.length > 0) {
        result.push({
          name: "FirstLoanType",
          value: criteriaObj.loanTypes
        });
      }
      
      // Add same mailing flag if present
      if (criteriaObj.isSameMailingOrExempt !== undefined) {
        result.push({
          name: "isSameMailingOrExempt",
          value: [criteriaObj.isSameMailingOrExempt ? 1 : 0]
        });
      }
      
      // Add mail vacant flag if present
      if (criteriaObj.isMailVacant !== undefined) {
        result.push({
          name: "isMailVacant",
          value: [criteriaObj.isMailVacant ? 1 : 0]
        });
      }
      
      // Add foreclosure flag if present
      if (criteriaObj.inForeclosure !== undefined) {
        result.push({
          name: "inForeclosure",
          value: [criteriaObj.inForeclosure ? 1 : 0]
        });
      }
      
      // Add listing flag if present
      if (criteriaObj.isListedForSale !== undefined) {
        result.push({
          name: "isListedForSale",
          value: [criteriaObj.isListedForSale ? 1 : 0]
        });
      }
      
      // Add equity percent range if present
      if (criteriaObj.equityPercent) {
        result.push({
          name: "EquityPercent",
          value: [criteriaObj.equityPercent]
        });
      }
      
      // Add loan balance range if present
      if (criteriaObj.totalLoanBalance) {
        result.push({
          name: "TotalLoanBalance",
          value: [criteriaObj.totalLoanBalance]
        });
      }
      
      // Add interest rate range if present
      if (criteriaObj.firstRate) {
        result.push({
          name: "FirstRate",
          value: [criteriaObj.firstRate]
        });
      }
      
      return result;
    };
    
    // Transform criteria to PropertyRadar format
    const criteriaArray = transformCriteria(criteria);
    
    // Add Purchase parameter to criteria array (required by the API)
    criteriaArray.push({
      name: "Purchase",
      value: [purchase]
    });
    
    // Prepare the request body with properly formatted criteria
    const requestBody: PropertyRadarRequest = {
      Criteria: criteriaArray
    };
    
    console.log('Making request to PropertyRadar API:', apiUrl);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    // Make the API request with token from environment variable and properly structured body
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${process.env.PROPERTY_RADAR_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.data || !response.data.results) {
      console.error('Unexpected API response structure:', response.data);
      throw new Error('Unexpected API response structure');
    }
    
    res.json({
      success: true,
      count: response.data.results.length,
      properties: response.data.results
    });
  } catch (error) {
    console.error('PropertyRadar API error:', error);
    
    // Enhanced error response
    const errorResponse: any = { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch properties',
      details: {}
    };
    
    // Add more detailed error information if available
    if (axios.isAxiosError(error) && error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorResponse.details.status = error.response.status;
      errorResponse.details.data = error.response.data;
      errorResponse.details.headers = error.response.headers;
    } else if (axios.isAxiosError(error) && error.request) {
      // The request was made but no response was received
      errorResponse.details.request = 'Request was made but no response received';
    }
    
    res.status(500).json(errorResponse);
  }
});

// Create a function to test if a table exists using information_schema approach
// which doesn't generate errors that can abort transactions
async function tableExists(client: PoolClient, tableName: string, schema = 'public'): Promise<boolean> {
  try {
    // Use information_schema to check if the table exists
    // This avoids trying to directly query a potentially non-existent table
    const result: QueryResult<TableExistsResult> = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = $2
      )
    `, [schema, tableName]);
    
    return result.rows[0].exists;
  } catch (error) {
    // If even this query fails, log it and return false
    console.error('Error checking if table exists:', error);
    return false;
  }
}

// Insert properties into the database
app.post('/api/insert-properties', async (req: Request<{}, {}, InsertPropertiesRequest>, res: Response): Promise<void> => {
  // Create a dedicated client from the pool
  const client = await pool.connect();
  
  try {
    console.log('Starting database insertion process');
    const { properties } = req.body;
    
    if (!properties || properties.length === 0) {
      throw new Error('No properties provided for insertion');
    }
    
    console.log(`Attempting to insert ${properties.length} properties`);
    console.log('First property data sample:', JSON.stringify(properties[0], null, 2));
    
    // Start a transaction
    await client.query('BEGIN');
    console.log('Transaction started');
    
    // Check if lead_providers table exists using direct query approach
    console.log('Checking if lead_providers table exists...');
    const leadProvidersExists = await tableExists(client, 'lead_providers');
    console.log('lead_providers table exists (direct query):', leadProvidersExists);
    
    if (!leadProvidersExists) {
      // Try to create the lead_providers table if it doesn't exist
      console.log('Attempting to create lead_providers table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS lead_providers (
          provider_id SERIAL PRIMARY KEY,
          provider_name VARCHAR(100) UNIQUE NOT NULL,
          provider_code VARCHAR(20) UNIQUE NOT NULL,
          api_key VARCHAR(255),
          api_endpoint VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Created lead_providers table');
    }
    
    // Insert lead provider if it doesn't exist
    console.log('Inserting or retrieving lead provider');
    const leadProviderResult = await client.query<{ provider_id: number }>(
      `INSERT INTO public.lead_providers (provider_name, provider_code)
       VALUES ('PropertyRadar', 'PR')
       ON CONFLICT (provider_code) DO NOTHING
       RETURNING provider_id`
    );
    
    // Get the provider_id, either from the insert or by selecting it
    let providerId: number;
    if (leadProviderResult.rows.length > 0) {
      providerId = leadProviderResult.rows[0].provider_id;
    } else {
      const providerSelectResult = await client.query<{ provider_id: number }>(
        `SELECT provider_id FROM lead_providers WHERE provider_code = 'PR'`
      );
      providerId = providerSelectResult.rows[0].provider_id;
    }
    
    // Process each property
    const insertedProperties: InsertedProperty[] = [];
    for (const property of properties) {
      // Insert property
      const propertyResult = await client.query<PropertyInsertResult>(
        `INSERT INTO properties (
          provider_id, radar_id, property_address, property_city, property_state,
          property_zip, property_type, county, apn, ownership_type,
          is_same_mailing_or_exempt, is_mail_vacant, avm, available_equity,
          equity_percent, cltv, total_loan_balance, number_loans,
          annual_taxes, estimated_tax_rate, last_transfer_rec_date,
          last_transfer_value, last_transfer_down_payment_percent, last_transfer_seller,
          is_listed_for_sale, listing_price, days_on_market, in_foreclosure,
          foreclosure_stage, default_amount, in_tax_delinquency, delinquent_amount, delinquent_year
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33
        ) RETURNING property_id`,
        [
          providerId,
          property.RadarID,
          property.Address,
          property.City,
          property.State,
          property.ZipFive,
          property.PType,
          property.County,
          property.APN,
          property.OwnershipType,
          property.isSameMailingOrExempt,
          property.isMailVacant,
          property.AVM,
          property.AvailableEquity,
          property.EquityPercent,
          property.CLTV,
          property.TotalLoanBalance,
          property.NumberLoans,
          property.AnnualTaxes,
          property.EstimatedTaxRate,
          property.LastTransferRecDate ? new Date(property.LastTransferRecDate) : null,
          property.LastTransferValue,
          property.LastTransferDownPaymentPercent,
          property.LastTransferSeller,
          property.isListedForSale,
          property.ListingPrice,
          property.DaysOnMarket,
          property.inForeclosure,
          property.ForeclosureStage,
          property.DefaultAmount,
          property.inTaxDelinquency,
          property.DelinquentAmount,
          property.DelinquentYear
        ]
      );
      
      const propertyId = propertyResult.rows[0].property_id;
      
      // Insert property owner
      if (property.Owner || property.OwnerFirstName || property.OwnerLastName) {
        // Convert string availability values to boolean
        // "owned" -> true, anything else -> false
        const phoneAvailable = property.PhoneAvailability === 'owned';
        const emailAvailable = property.EmailAvailability === 'owned';
        
        console.log('Converting phone availability:', property.PhoneAvailability, '->', phoneAvailable);
        console.log('Converting email availability:', property.EmailAvailability, '->', emailAvailable);
        
        await client.query(
          `INSERT INTO property_owners (
            property_id, first_name, last_name, full_name,
            owner_type, is_primary_contact, phone_availability, email_availability
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            propertyId,
            property.OwnerFirstName,
            property.OwnerLastName,
            property.Owner,
            'PRIMARY',
            true,
            phoneAvailable,
            emailAvailable
          ]
        );
      }
      
      // Insert spouse (if exists)
      if (property.OwnerSpouseFirstName) {
        await client.query(
          `INSERT INTO property_owners (
            property_id, first_name, last_name, full_name,
            owner_type, is_primary_contact
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            propertyId,
            property.OwnerSpouseFirstName,
            property.OwnerLastName,
            `${property.OwnerSpouseFirstName} ${property.OwnerLastName}`.trim(),
            'SPOUSE',
            false
          ]
        );
      }
      
      // Insert first loan (if exists)
      if (property.FirstDate || property.FirstAmount || property.FirstLoanType) {
        await client.query(
          `INSERT INTO loans (
            property_id, loan_type, loan_amount, interest_rate,
            rate_type, term_years, loan_purpose, loan_position,
            origination_date, first_date, first_amount, first_rate,
            first_rate_type, first_term_in_years, first_loan_type,
            first_purpose
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            propertyId,
            property.FirstLoanType,
            property.FirstAmount,
            property.FirstRate,
            property.FirstRateType,
            property.FirstTermInYears,
            property.FirstPurpose,
            1, // First position
            property.FirstDate ? new Date(property.FirstDate) : null,
            property.FirstDate ? new Date(property.FirstDate) : null,
            property.FirstAmount,
            property.FirstRate,
            property.FirstRateType,
            property.FirstTermInYears,
            property.FirstLoanType,
            property.FirstPurpose
          ]
        );
      }
      
      // Insert second loan (if exists)
      if (property.SecondDate || property.SecondAmount || property.SecondLoanType) {
        await client.query(
          `INSERT INTO loans (
            property_id, loan_type, loan_amount,
            loan_position, origination_date, second_date,
            second_amount, second_loan_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            propertyId,
            property.SecondLoanType,
            property.SecondAmount,
            2, // Second position
            property.SecondDate ? new Date(property.SecondDate) : null,
            property.SecondDate ? new Date(property.SecondDate) : null,
            property.SecondAmount,
            property.SecondLoanType
          ]
        );
      }
      
      insertedProperties.push({
        radarId: property.RadarID,
        propertyId: propertyId,
        address: property.Address,
        city: property.City,
        state: property.State
      });
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      count: insertedProperties.length,
      properties: insertedProperties
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database insertion error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to insert properties' 
    });
  } finally {
    client.release();
  }
});

// Add a direct test endpoint for lead_providers
app.get('/api/test-lead-providers', async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    console.log('Running direct test for lead_providers table...');
    
    // Get current database info
    const dbInfo: QueryResult<DbInfoResult> = await client.query('SELECT current_database(), current_user');
    console.log('Connected to database:', dbInfo.rows[0].current_database);
    console.log('Connected as user:', dbInfo.rows[0].current_user);
    
    // Check search_path
    const searchPathResult: QueryResult<SearchPathResult> = await client.query('SHOW search_path');
    console.log('Search path:', searchPathResult.rows[0].search_path);
    
    // Check information_schema for lead_providers
    const infoSchemaResult: QueryResult<TableExistsResult> = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'lead_providers'
      )
    `);
    console.log('lead_providers exists according to information_schema:', infoSchemaResult.rows[0].exists);
    
    // Attempt to query lead_providers directly
    let directResult: QueryResult<CountResult> | { error: string };
    try {
      directResult = await client.query<CountResult>(`SELECT COUNT(*) FROM lead_providers`);
      console.log('lead_providers direct query successful, count:', directResult.rows[0].count);
    } catch (error) {
      console.error('Error querying lead_providers directly:', (error as Error).message);
      directResult = { error: (error as Error).message };
    }
    
    res.json({
      success: true,
      database_info: dbInfo.rows[0],
      search_path: searchPathResult.rows[0].search_path,
      info_schema_check: infoSchemaResult.rows[0].exists,
      direct_query: (directResult as any).error ? { error: (directResult as any).error } : { count: (directResult as QueryResult<CountResult>).rows[0].count }
    });
  } catch (error) {
    console.error('Error in lead_providers test endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
});

// Add an endpoint to get database schema information
app.get('/api/db-schema', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Querying database schema information...');
    
    // Query for schemas
    const schemasResult: QueryResult<{schema_name: string}> = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      ORDER BY schema_name;
    `);
    
    // Query for tables in public schema
    const tablesResult: QueryResult<TableNameResult> = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    res.json({
      success: true,
      schemas: schemasResult.rows.map(row => row.schema_name),
      tables: tablesResult.rows.map(row => row.table_name)
    });
  } catch (error) {
    console.error('Error getting schema information:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add login endpoint
app.post('/api/login', async (req: Request<{}, {}, LoginRequest>, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    // In a real application, you would validate against your database
    // For now, we'll use a simple check
    const result = await pool.query(
      'SELECT * FROM "Elevated-Logins" WHERE username = $1 AND password = $2',
      [username, password]
    );
    
    if (result.rows.length > 0) {
      // Store user info in session
      req.session.user = {
        id: result.rows[0].id,
        username: result.rows[0].username
      };
      
      res.json({
        success: true,
        user: {
          username: result.rows[0].username
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current user endpoint
app.get('/api/current-user', (req: Request, res: Response): void => {
  if (req.session.user) {
    res.json({
      success: true,
      user: req.session.user
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});

// Logout endpoint
app.post('/api/logout', (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to logout'
      });
    } else {
      res.json({ success: true });
    }
  });
});

// Add to DNM registry endpoint
app.post('/api/add-to-dnm', async (req: Request<{}, {}, DnmRequest>, res: Response): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.session.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }
    
    const { loanId, propertyId, radarId, reason, reasonCategory, notes } = req.body;
    
    // Validate required fields
    if (!loanId && !propertyId && !radarId) {
      res.status(400).json({
        success: false,
        error: 'At least one identifier (loanId, propertyId, or radarId) is required'
      });
      return;
    }
    
    // Insert into dnm_registry
    const result = await pool.query<DnmInsertResult>(
      `INSERT INTO dnm_registry 
       (loan_id, property_id, radar_id, reason, reason_category, source, blocked_by, blocked_at, is_active, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), TRUE, $8)
       RETURNING dnm_id`,
      [
        loanId || null,
        propertyId || null,
        radarId || null,
        reason || 'User requested',
        reasonCategory || 'Manual',
        'property-data-tester',
        req.session.user.username,
        notes || null
      ]
    );
    
    res.json({
      success: true,
      dnmId: result.rows[0].dnm_id,
      message: `Successfully added to DNM registry by ${req.session.user.username}`
    });
  } catch (error) {
    console.error('Error adding to DNM registry:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check DNM status endpoint
app.get('/api/check-dnm', async (req: Request, res: Response): Promise<void> => {
  try {
    const { loanId, propertyId, radarId } = req.query as {
      loanId?: string;
      propertyId?: string;
      radarId?: string;
    };
    
    // Validate at least one identifier is provided
    if (!loanId && !propertyId && !radarId) {
      res.status(400).json({
        success: false,
        error: 'At least one identifier (loanId, propertyId, or radarId) is required'
      });
      return;
    }
    
    // Build the query conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (loanId) {
      conditions.push(`loan_id = $${paramIndex++}`);
      params.push(loanId);
    }
    
    if (propertyId) {
      conditions.push(`property_id = $${paramIndex++}`);
      params.push(propertyId);
    }
    
    if (radarId) {
      conditions.push(`radar_id = $${paramIndex++}`);
      params.push(radarId);
    }
    
    // Query the dnm_registry
    const result = await pool.query(
      `SELECT * FROM dnm_registry 
       WHERE (${conditions.join(' OR ')}) AND is_active = TRUE
       ORDER BY blocked_at DESC`,
      params
    );
    
    res.json({
      success: true,
      inDnm: result.rows.length > 0,
      entries: result.rows
    });
  } catch (error) {
    console.error('Error checking DNM status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
// Configure API routes
app.use('/api', configureRoutes(pool));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
