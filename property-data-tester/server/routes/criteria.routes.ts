import { Router } from 'express';
import { CriteriaController } from '../controllers/CriteriaController';

/**
 * Create and configure criteria routes
 * @returns Express router with criteria routes
 */
export function createCriteriaRoutes(): Router {
  const router = Router();
  
  /**
   * @route   GET /api/criteria/:category
   * @desc    Get criteria definitions by category
   * @access  Private
   */
  router.get('/:category', CriteriaController.getCriteriaByCategory);
  
  return router;
}
