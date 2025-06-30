import { Router } from 'express';
import { DnmController } from '../controllers/DnmController';
import { DnmRepository } from '../repositories/DnmRepository';
import { dbPool } from '../config/database';

/**
 * Create Do Not Mail registry routes
 * @returns Express router with DNM routes
 */
export function createDnmRoutes(): Router {
  const router = Router();
  const dnmRepo = new DnmRepository(dbPool);
  const dnmController = new DnmController(dnmRepo);
  
  /**
   * @route POST /api/add-to-dnm
   * @desc Add an entity to the DNM registry
   * @access Private - requires authentication
   */
  router.post('/add-to-dnm', dnmController.addToDnm);
  
  /**
   * @route GET /api/check-dnm
   * @desc Check if an entity is in the DNM registry
   * @access Public
   */
  router.get('/check-dnm', dnmController.checkDnm);
  
  /**
   * @route DELETE /api/dnm/:id
   * @desc Remove an entity from the DNM registry
   * @access Private - requires authentication
   */
  router.delete('/dnm/:id', dnmController.removeFromDnm);
  
  /**
   * @route GET /api/dnm/source/:source
   * @desc Get DNM entries by source
   * @access Public
   */
  router.get('/dnm/source/:source', dnmController.getDnmBySource);
  
  /**
   * @route GET /api/dnm/blocked-by/:blockedBy
   * @desc Get DNM entries by blocked by
   * @access Public
   */
  router.get('/dnm/blocked-by/:blockedBy', dnmController.getDnmByBlockedBy);
  
  /**
   * @route POST /api/dnm/check-with-history
   * @desc Get DNM records with mailing history for list processing
   * @access Public
   */
  router.post('/dnm/check-with-history', dnmController.getDnmWithMailHistory);
  
  return router;
}
