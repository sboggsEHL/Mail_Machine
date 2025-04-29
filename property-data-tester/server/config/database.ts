import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Database configuration using environment variables
 */
export function getDatabaseConfig(): PoolConfig {
  // Configure SSL based on environment variable
  let ssl: boolean | { rejectUnauthorized: boolean };
  
  if (process.env.PR_PG_SSL === 'require') {
    ssl = { rejectUnauthorized: false };
  } else if (process.env.PR_PG_SSL === 'true') {
    ssl = { rejectUnauthorized: false };
  } else {
    ssl = false;
  }
  
  // Return database configuration
  return {
    host: process.env.PR_PG_HOST,
    port: parseInt(process.env.PR_PG_PORT || '5432'),
    database: process.env.PR_PG_DATABASE,
    user: process.env.PR_PG_USER,
    password: process.env.PR_PG_PASSWORD,
    ssl
  };
}

/**
 * Create a database pool from configuration
 */
export function createDatabasePool(): Pool {
  const config = getDatabaseConfig();
  const pool = new Pool(config);
  
  // Log pool errors
  pool.on('error', (err: Error) => {
    console.error('Unexpected pool error', err);
  });
  
  return pool;
}

/**
 * Log database connection details for debugging
 * This function is kept for backward compatibility but no longer logs sensitive information
 */
export function logDatabaseConfig(): void {
  // No longer logging sensitive database connection details
}

/**
 * Test database connection
 * @param pool Database pool
 * @returns Promise that resolves when the connection is successful
 */
export async function testDatabaseConnection(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    // Verify database connection without logging sensitive details
    
    // Check if lead_providers exists
    const tableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'lead_providers'
      )
    `);
    
    // Verify tables exist without logging them
    const allTablesResult = await client.query(`
      SELECT COUNT(*) as table_count FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
  } catch (err) {
    console.error('Error testing database connection on startup:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Default database pool singleton
 */
export const dbPool = createDatabasePool();
