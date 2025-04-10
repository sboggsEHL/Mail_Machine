import { Router } from 'express';
import { Pool } from 'pg';
import { PropertyRadarListService } from '../services/PropertyRadarListService';

// Create router
const router = Router();

// Get database pool from app context
let pool: Pool;

// Initialize the router with dependencies
export function initListsRouter(dbPool: Pool) {
  pool = dbPool;
  return router;
}

// Create list service instance
const getListService = () => new PropertyRadarListService(pool);

/**
 * Create a new list
 * POST /api/lists
 */
router.post('/', async (req, res) => {
  try {
    const { criteria, listName, listType = 'static', isMonitored = 0 } = req.body;
    
    if (!criteria || !listName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    // Validate list name
    if (!listName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'List name cannot be empty'
      });
    }
    
    const listData = {
      Criteria: criteria,
      ListName: listName,
      ListType: listType,
      isMonitored: isMonitored
    };
    
    const listService = getListService();
    const createdList = await listService.createList(listData);
    
    return res.json({
      success: true,
      list: createdList
    });
  } catch (error) {
    console.error('Error creating list:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create list',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get all lists
 * GET /api/lists
 */
router.get('/', async (req, res) => {
  try {
    const listService = getListService();
    const lists = await listService.getLists();
    
    return res.json({
      success: true,
      lists
    });
  } catch (error) {
    console.error('Error fetching lists:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch lists',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get list items
 * GET /api/lists/:id/items
 */
router.get('/:id/items', async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const start = parseInt(req.query.start as string) || 0;
    const limit = parseInt(req.query.limit as string) || 1000;
    
    if (isNaN(listId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid list ID'
      });
    }
    
    const listService = getListService();
    const items = await listService.getListItems(listId, start, limit);
    
    // Determine if there are more items
    const hasMore = items.length === limit;
    
    return res.json({
      success: true,
      items,
      hasMore,
      pagination: {
        start,
        limit,
        next: hasMore ? start + limit : null
      }
    });
  } catch (error) {
    console.error(`Error fetching list items:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch list items',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Check for duplicates in a list
 * GET /api/lists/:id/check-duplicates
 */
router.get('/:id/check-duplicates', async (req, res) => {
  try {
    const listId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 1000;
    
    if (isNaN(listId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid list ID'
      });
    }
    
    const listService = getListService();
    
    // Calculate pagination
    const start = (page - 1) * pageSize;
    
    // Get items for the current page
    const items = await listService.getListItems(listId, start, pageSize);
    
    // Extract RadarIDs
    const radarIds = items.map(item => item.RadarID);
    
    // Check for duplicates
    const duplicates = await listService.checkDuplicates(radarIds);
    
    // Get total count of items in the list
    let totalItems = 0;
    if (page === 1) {
      // Only make this additional API call on the first page
      const allItems = await listService.getListItems(listId, 0, 1);
      const list = await listService.getLists();
      const currentList = list.find(l => l.ListID === listId);
      if (currentList) {
        totalItems = parseInt(currentList.TotalCount || currentList.Count || '0');
      }
    }
    
    // Calculate total pages
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // Determine if there are more pages
    const hasMore = page < totalPages;
    
    return res.json({
      success: true,
      duplicates,
      totalItems,
      pagination: {
        page,
        pageSize,
        totalPages,
        hasMore
      }
    });
  } catch (error) {
    console.error(`Error checking duplicates:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check duplicates',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
