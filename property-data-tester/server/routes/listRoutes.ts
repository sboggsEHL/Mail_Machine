import { Router } from 'express';
import { ListController } from '../controllers/ListController';
import { Pool } from 'pg';

export function createListRoutes(pool: Pool): Router {
  const router = Router();
  const listController = new ListController(pool);
  
  // Get all lists
  router.get('/lists', (req, res) => listController.getLists(req, res));
  
  // Get items from a specific list
  router.get('/lists/:listId/items', (req, res) => listController.getListItems(req, res));
  
  // Check for duplicates in a list
  router.get('/lists/:listId/check-duplicates', (req, res) => listController.checkDuplicates(req, res));
  
  // Process a list (excluding specified duplicates)
  router.post('/lists/:listId/process', (req, res) => listController.processList(req, res));
  
  return router;
}