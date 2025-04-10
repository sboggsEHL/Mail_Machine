import { Router } from 'express';
import { CriteriaController } from '../controllers/CriteriaController';
import { CriteriaService } from '../services/CriteriaService';

/**
 * Create and configure criteria routes
 * @returns Express router with criteria routes
 */
export function createCriteriaRoutes(): Router {
  const router = Router();
  
  // Create instances of services and controllers
  const criteriaService = new CriteriaService();
  const criteriaController = new CriteriaController(criteriaService);
  
  /**
   * @route   GET /api/criteria
   * @desc    Get all criteria definitions
   * @access  Private
   */
  router.get('/', criteriaController.getAllCriteria);
  
  /**
   * @route   GET /api/criteria/types
   * @desc    Get criteria type map
   * @access  Private
   */
  router.get('/types', criteriaController.getCriteriaTypeMap);
  
  /**
   * @route   GET /api/criteria/:category
   * @desc    Get criteria definitions by category
   * @access  Private
   */
  router.get('/:category', criteriaController.getCriteriaByCategory);
  
  return router;
}
