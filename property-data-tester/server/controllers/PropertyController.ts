import { Request, Response } from 'express';
import { PropertyService } from '../services/PropertyService';
import { Property } from '../../shared/types/database';
import { PropertyRadarCriteriaInput } from '../services/lead-providers/propertyradar/types';

/**
 * Controller for property-related endpoints
 */
export class PropertyController {
  private propertyService: PropertyService;

  constructor(propertyService: PropertyService) {
    this.propertyService = propertyService;
  }

  /**
   * Fetch properties from PropertyRadar API
   */
  fetchProperties = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fields, limit, start, criteria } = req.body;
      
      if (!Array.isArray(fields) || fields.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Fields array is required'
        });
        return;
      }
      
      // Add pagination to criteria
      const criteriaWithPagination: PropertyRadarCriteriaInput = {
        ...criteria,
        limit: limit || 10,
        start: start || 0
      };
      
      const properties = await this.propertyService.fetchPropertiesFromProvider(
        'PR', // PropertyRadar provider code
        criteriaWithPagination,
        fields
      );
      
      res.json({
        success: true,
        count: properties.length,
        properties
      });
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch properties'
      });
    }
  };

  /**
   * Insert properties into the database
   */
  insertProperties = async (req: Request, res: Response): Promise<void> => {
    try {
      const { properties } = req.body;
      
      if (!Array.isArray(properties) || properties.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Properties array is required'
        });
        return;
      }
      
      const insertedProperties = await this.propertyService.saveProperties(
        'PR', // PropertyRadar provider code
        properties
      );
      
      res.json({
        success: true,
        count: insertedProperties.length,
        properties: insertedProperties
      });
    } catch (error) {
      console.error('Error inserting properties:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to insert properties'
      });
    }
  };

  /**
   * Search for properties
   */
  searchProperties = async (req: Request, res: Response): Promise<void> => {
    try {
      const { criteria, limit = 100, offset = 0 } = req.body;
      
      // Get total count for pagination
      const totalCount = await this.propertyService.countProperties(criteria);
      
      // Get properties
      const properties = await this.propertyService.searchProperties(
        criteria,
        limit,
        offset
      );
      
      res.json({
        success: true,
        count: properties.length,
        totalCount,
        properties
      });
    } catch (error) {
      console.error('Error searching properties:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search properties'
      });
    }
  };

  /**
   * Get a property by ID
   */
  getProperty = async (req: Request, res: Response): Promise<void> => {
    try {
      const propertyId = parseInt(req.params.id, 10);
      
      if (isNaN(propertyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid property ID'
        });
        return;
      }
      
      const property = await this.propertyService.getPropertyWithRelations(propertyId);
      
      if (!property) {
        res.status(404).json({
          success: false,
          error: 'Property not found'
        });
        return;
      }
      
      res.json({
        success: true,
        property
      });
    } catch (error) {
      console.error('Error getting property:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get property'
      });
    }
  };
}
