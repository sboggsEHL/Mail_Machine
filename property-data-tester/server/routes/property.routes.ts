import { Router } from 'express';
import { PropertyController } from '../controllers/PropertyController';
import { PropertyService } from '../services/PropertyService';
import { PropertyPayloadService } from '../services/PropertyPayloadService';
import { dbPool } from '../config/database';

/**
 * Create property routes
 * @returns Express router with property routes
 */
export function createPropertyRoutes(): Router {
  const router = Router();
  const propertyPayloadService = new PropertyPayloadService(dbPool);
  const propertyService = new PropertyService(dbPool, undefined, undefined, undefined, propertyPayloadService);
  const propertyController = new PropertyController(propertyService);
  
  /**
   * @route POST /api/fetch-properties
   * @desc Fetch properties from PropertyRadar API
   * @access Public
   */
  router.post('/fetch-properties', propertyController.fetchProperties);
  
  /**
   * @route POST /api/insert-properties
   * @desc Insert properties into the database
   * @access Public
   */
  router.post('/insert-properties', propertyController.insertProperties);
  
  /**
   * @route POST /api/search-properties
   * @desc Search for properties in the database
   * @access Public
   */
  router.post('/search-properties', propertyController.searchProperties);
  
  /**
   * @route GET /api/properties/:id
   * @desc Get a property by ID
   * @access Public
   */
  router.get('/properties/:id', propertyController.getProperty);
  
  return router;
}
