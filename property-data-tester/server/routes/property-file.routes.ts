import { Router } from 'express';
import { PropertyFileController } from '../controllers/PropertyFileController';
import { Pool } from 'pg';

/**
 * Create property file routes
 * @param pool Database connection pool
 * @returns Express router
 */
export function createPropertyFileRoutes(pool: Pool): Router {
  const router = Router();
  const propertyFileController = new PropertyFileController(pool);
  
  // Process property files
  router.post('/process', (req, res) => propertyFileController.processFiles(req, res));
  
  return router;
}