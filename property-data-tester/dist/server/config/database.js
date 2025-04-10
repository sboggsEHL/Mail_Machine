"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbPool = void 0;
exports.getDatabaseConfig = getDatabaseConfig;
exports.createDatabasePool = createDatabasePool;
exports.logDatabaseConfig = logDatabaseConfig;
exports.testDatabaseConnection = testDatabaseConnection;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * Database configuration using environment variables
 */
function getDatabaseConfig() {
    // Configure SSL based on environment variable
    let ssl;
    if (process.env.PR_PG_SSL === 'require') {
        ssl = { rejectUnauthorized: false };
    }
    else if (process.env.PR_PG_SSL === 'true') {
        ssl = { rejectUnauthorized: false };
    }
    else {
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
function createDatabasePool() {
    const config = getDatabaseConfig();
    const pool = new pg_1.Pool(config);
    // Log pool errors
    pool.on('error', (err) => {
        console.error('Unexpected pool error', err);
    });
    return pool;
}
/**
 * Log database connection details for debugging
 */
function logDatabaseConfig() {
    console.log('Database connection details:');
    console.log('Host:', process.env.PR_PG_HOST);
    console.log('Port:', process.env.PR_PG_PORT);
    console.log('Database:', process.env.PR_PG_DATABASE);
    console.log('User:', process.env.PR_PG_USER);
    console.log('SSL Config:', process.env.PR_PG_SSL);
}
/**
 * Test database connection
 * @param pool Database pool
 * @returns Promise that resolves when the connection is successful
 */
function testDatabaseConnection(pool) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield pool.connect();
        try {
            console.log('Successfully connected to database on startup');
            // Check search_path
            const searchPathResult = yield client.query('SHOW search_path');
            console.log('Search path:', searchPathResult.rows[0].search_path);
            // Check if lead_providers exists
            const tableResult = yield client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'lead_providers'
      )
    `);
            console.log('Lead providers table exists on startup:', tableResult.rows[0].exists);
            // List all tables in public schema
            const allTablesResult = yield client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
            console.log('Available tables on startup:', allTablesResult.rows.map(r => r.table_name).join(', '));
        }
        catch (err) {
            console.error('Error testing database connection on startup:', err);
            throw err;
        }
        finally {
            client.release();
        }
    });
}
/**
 * Default database pool singleton
 */
exports.dbPool = createDatabasePool();
