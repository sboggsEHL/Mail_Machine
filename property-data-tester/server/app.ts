import express, { Express } from 'express';
import cors from 'cors';
import { configureRoutes } from './routes';
import { dbPool, logDatabaseConfig, testDatabaseConnection } from './config/database';
import { createPropertyRadarProvider } from './services/lead-providers/propertyradar';
import { leadProviderFactory } from './services/lead-providers/LeadProviderFactory';
import { AppError, ERROR_DESCRIPTIONS } from './utils/errors';
import logger from './utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Create and configure Express application
 */
export async function createApp(): Promise<Express> {
  const app = express();
  
  // Test database connection without logging sensitive details
  try {
    await testDatabaseConnection(dbPool);
    console.log("🏠 📬 Lick Those Envelopes Boys, She's Ready! 📬 🏠");
  } catch (error) {
    console.error('Database connection test failed');
    // Continue anyway, the app might still work with some features disabled
  }
  
  // Register PropertyRadar provider
  const propertyRadarToken = process.env.PROPERTY_RADAR_TOKEN;
  if (propertyRadarToken) {
    const propertyRadarProvider = createPropertyRadarProvider(propertyRadarToken);
    leadProviderFactory.registerProvider(propertyRadarProvider);
    console.log(`PropertyRadar provider registered successfully`);
  } else {
    console.warn('No PropertyRadar token found in environment variables');
  }
  
  // CORS middleware
  app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    credentials: true
  }));
  
  // JSON body parser
  app.use(express.json({ limit: '1mb' }));
  
  // URL-encoded body parser
  app.use(express.urlencoded({ extended: true }));
  
  // JWT auth setup
  const JWT_SECRET = process.env.JWT_SECRET || 'property-data-tester-jwt-secret-key';
  console.log(`JWT authentication configured successfully`);
  
  // Configure API routes
  app.use('/', configureRoutes(dbPool));
  
  // Add basic route for health check
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Property Data API Server is running',
      version: process.env.npm_package_version || '0.1.0'
    });
  });
  
  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err);

    if (err instanceof AppError) {
      const { statusCode, code, message, details } = err;
      res.status(statusCode).json({
        success: false,
        error: {
          code,
          message: message || ERROR_DESCRIPTIONS[code] || 'Unknown error',
          details,
        },
      });
    } else {
      // For non-AppError instances, return a generic 500 error
      res.status(500).json({
        success: false,
        error: {
          code: 'SYS001',
          message: 'Internal server error',
        },
      });
    }
  });
  
  return app;
}
