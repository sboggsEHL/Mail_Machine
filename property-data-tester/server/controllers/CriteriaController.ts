import { Request, Response } from 'express';
import { CriteriaService } from '../services/CriteriaService';

/**
 * Controller for criteria-related endpoints
 */
export class CriteriaController {
  private criteriaService: CriteriaService;

  constructor(criteriaService: CriteriaService) {
    this.criteriaService = criteriaService;
  }

  /**
   * Get all criteria with their types
   */
  getAllCriteria = async (req: Request, res: Response): Promise<void> => {
    try {
      const criteria = this.criteriaService.getAllCriteria();
      
      res.json({
        success: true,
        count: criteria.length,
        criteria
      });
    } catch (error) {
      console.error('Error getting criteria:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get criteria'
      });
    }
  };

  /**
   * Get criteria by category
   */
  getCriteriaByCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category } = req.params;
      
      if (!category) {
        res.status(400).json({
          success: false,
          error: 'Category parameter is required'
        });
        return;
      }
      
      const criteria = this.criteriaService.getCriteriaByCategory(category);
      
      res.json({
        success: true,
        count: criteria.length,
        category,
        criteria
      });
    } catch (error) {
      console.error('Error getting criteria by category:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get criteria by category'
      });
    }
  };

  /**
   * Get criteria type map
   */
  getCriteriaTypeMap = async (req: Request, res: Response): Promise<void> => {
    try {
      const criteriaTypeMap = this.criteriaService.getCriteriaTypeMap();
      
      res.json({
        success: true,
        count: Object.keys(criteriaTypeMap).length,
        criteriaTypeMap
      });
    } catch (error) {
      console.error('Error getting criteria type map:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get criteria type map'
      });
    }
  };
}
