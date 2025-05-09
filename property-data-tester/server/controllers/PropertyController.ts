import { Request, Response } from 'express';
import axios from 'axios'; // Added axios
import dotenv from 'dotenv'; // Added dotenv
import { PropertyService } from '../services/PropertyService';
import { Property } from '../../shared/types/database';
import { PropertyRadarCriteriaInput } from '../services/lead-providers/propertyradar/types';
import { leadProviderFactory } from '../services/lead-providers/LeadProviderFactory';
import { AppError, ERROR_CODES } from '../utils/errors';
import logger from '../utils/logger';

// Load environment variables for API token
dotenv.config();

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
      const { fields, limit, start, criteria, campaignId } = req.body;
      
      if (!Array.isArray(fields) || fields.length === 0) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Fields array is required',
          400
        );
      }
      // Format criteria as an array of objects with name and value properties
      const formattedCriteria = Object.entries(criteria).map(([name, value]) => {
        // Special handling for PropertyType
        if (name === 'PropertyType' && Array.isArray(value)) {
          return {
            name,
            value: [
              {
                name: 'PType',
                value: value
              }
            ]
          };
        }
        
        // Check if this is a range criteria (value is an array of two numbers)
        if (Array.isArray(value) &&
            value.length === 2 &&
            (typeof value[0] === 'number' || value[0] === null) &&
            (typeof value[1] === 'number' || value[1] === null)) {
          
          // Format as a range using nested arrays
          return {
            name,
            value: [value]
          };
        }
        
        // Check if this is a date range criteria (name ends with 'Date' and value is an array of two dates)
        if (name.endsWith('Date') &&
            Array.isArray(value) &&
            value.length === 2 &&
            typeof value[0] === 'string' &&
            typeof value[1] === 'string') {
          
          // Format as a date range using the "from: to:" syntax
          const fromDate = value[0] || '';
          const toDate = value[1] || '';
          
          if (fromDate && toDate) {
            return {
              name,
              value: [`from: ${fromDate} to: ${toDate}`]
            };
          } else if (fromDate) {
            return {
              name,
              value: [fromDate]
            };
          } else if (toDate) {
            return {
              name,
              value: [`from: to: ${toDate}`]
            };
          }
        }
        
        // Special handling for boolean values
        if (typeof value === 'boolean') {
          return {
            name,
            value: [value ? "1" : "0"]
          };
        }
        
        // Default handling for non-date, non-boolean criteria
        return {
          name,
          value: Array.isArray(value) ? value : [value]
        };
      });
      
      // Create criteria input with just the formatted criteria
      const criteriaInput: PropertyRadarCriteriaInput = {
        Criteria: formattedCriteria,
        limit: limit || 10,
        start: start || 0,
        purchase: req.body.purchase || 0
      };
      
      const properties = await this.propertyService.fetchPropertiesFromProvider(
        'PR', // PropertyRadar provider code
        criteriaInput,
        fields,
        campaignId || 'individual-request' // Use provided campaignId or default
      );
      
      res.json({
        success: true,
        count: properties.length,
        properties
      });
    } catch (error) {
      logger.error('Error fetching properties:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.SYSTEM_UNEXPECTED_ERROR,
        'An unexpected error occurred while fetching properties',
        500,
        error
      );
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

  /**
   * Preview properties (get count without purchasing)
   */
  previewProperties = async (req: Request, res: Response): Promise<void> => {
    try {
      // Accept criteria as an object, not a pre-formatted array
      const criteriaObj = req.body.criteria;

      if (!criteriaObj || typeof criteriaObj !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Criteria object is required in the request body'
        });
        return;
      }

      // Transform criteria object to array with special handling (same as fetchProperties)
      const formattedCriteria = Object.entries(criteriaObj).map(([name, value]) => {
        // Special handling for PropertyType
        if (name === 'PropertyType' && Array.isArray(value)) {
          return {
            name,
            value: [
              {
                name: 'PType',
                value: value
              }
            ]
          };
        }

        // Check if this is a range criteria (value is an array of two numbers)
        if (Array.isArray(value) &&
            value.length === 2 &&
            (typeof value[0] === 'number' || value[0] === null) &&
            (typeof value[1] === 'number' || value[1] === null)) {
          return {
            name,
            value: [value]
          };
        }

        // Check if this is a date range criteria (name ends with 'Date' and value is an array of two dates)
        if (name.endsWith('Date') &&
            Array.isArray(value) &&
            value.length === 2 &&
            typeof value[0] === 'string' &&
            typeof value[1] === 'string') {
          const fromDate = value[0] || '';
          const toDate = value[1] || '';
          if (fromDate && toDate) {
            return {
              name,
              value: [`from: ${fromDate} to: ${toDate}`]
            };
          } else if (fromDate) {
            return {
              name,
              value: [fromDate]
            };
          } else if (toDate) {
            return {
              name,
              value: [`from: to: ${toDate}`]
            };
          }
        }

        // Special handling for boolean values
        if (typeof value === 'boolean') {
          return {
            name,
            value: [value ? "1" : "0"]
          };
        }

        // Default handling for non-date, non-boolean criteria
        return {
          name,
          value: Array.isArray(value) ? value : [value]
        };
      });

      const apiBaseUrl = 'https://api.propertyradar.com';
      const authToken = process.env.PROPERTY_RADAR_TOKEN || '';

      if (!authToken) {
        console.error('PROPERTY_RADAR_TOKEN is not set in environment variables.');
        res.status(500).json({
          success: false,
          error: 'Server configuration error: Missing API token.'
        });
        return;
      }

      // Call PropertyRadar Properties API directly for preview
      const previewResponse = await axios.post(
        `${apiBaseUrl}/v1/properties`,
        { Criteria: formattedCriteria },
        {
          params: {
            Fields: 'RadarID',
            Limit: 1,
            Purchase: 0
          },
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          validateStatus: (status) => status < 500
        }
      );

      if (previewResponse.status >= 400) {
         logger.error('PropertyRadar API error during preview:', {
           status: previewResponse.status,
           data: previewResponse.data
         });
         const apiError = previewResponse.data?.errors?.[0]?.detail ||
                          previewResponse.data?.message ||
                          `API request failed with status ${previewResponse.status}`;
         res.status(previewResponse.status).json({
           success: false,
           error: `Failed to preview properties: ${apiError}`
         });
         return;
      }

      const estimatedCount = previewResponse.data?.resultCount ?? 0;

      res.json({
        success: true,
        count: estimatedCount
      });
    } catch (error) {
      logger.error('Error previewing properties:', error);
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : error instanceof Error ? error.message : 'An unknown error occurred';

      res.status(500).json({
        success: false,
        error: `Failed to preview properties: ${errorMessage}`
      });
    }
  };
}
