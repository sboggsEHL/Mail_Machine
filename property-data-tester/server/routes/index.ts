import { Router } from 'express';
import { createAuthRoutes } from './auth.routes';
import { createPropertyRoutes } from './property.routes';
import { createDnmRoutes } from './dnm.routes';
import { createCriteriaRoutes } from './criteria.routes';
import { createCampaignRoutes } from './campaign.routes';
import { createBatchJobRoutes } from './batch-job.routes';
import { Pool } from 'pg';

/**
 * Configure all API routes
 * @param pool Database pool
 * @returns Express router with all API routes
 */
export function configureRoutes(pool: Pool): Router {
  const router = Router();
  
  // Auth routes
  router.use('/auth', createAuthRoutes(pool));
  
  // Property routes
  router.use('/', createPropertyRoutes());
  
  // DNM routes
  router.use('/', createDnmRoutes());
  
  // Criteria routes
  router.use('/criteria', createCriteriaRoutes());
  // Campaign routes
  router.use('/campaigns', createCampaignRoutes(pool));
  
  // Batch job routes
  router.use('/batch-jobs', createBatchJobRoutes(pool));
  
  
  // Simple API test route
  router.get('/test', (req, res) => {
    res.json({
      success: true,
      message: 'API is working!',
      timestamp: new Date().toISOString()
    });
  });
  
  return router;
}
