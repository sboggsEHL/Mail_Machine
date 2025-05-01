import { Pool, PoolClient } from 'pg';
import { Property, PropertyOwner, Loan } from '../../shared/types/database';
import { PropertyRepository } from '../repositories/PropertyRepository';
import { PropertyOwnerRepository } from '../repositories/PropertyOwnerRepository';
import { LoanRepository } from '../repositories/LoanRepository';
import { LeadProvider } from '../services/lead-providers/interfaces';
import { leadProviderFactory } from '../services/lead-providers/LeadProviderFactory';
import { PropertyPayloadService } from './PropertyPayloadService';
import { AppError, ERROR_CODES } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Result of property insertion
 */
export interface InsertedProperty {
  propertyId: number;
  radarId: string;
  address?: string;
  city?: string;
  state?: string;
}

/**
 * Service for managing properties
 */
export class PropertyService {
  private propertyRepo: PropertyRepository;
  private ownerRepo: PropertyOwnerRepository;
  private loanRepo: LoanRepository;
  private pool: Pool;
  protected propertyPayloadService: PropertyPayloadService;
  protected batchCounter: Map<string, number> = new Map();

  constructor(
    pool: Pool,
    propertyRepo?: PropertyRepository,
    ownerRepo?: PropertyOwnerRepository,
    loanRepo?: LoanRepository,
    propertyPayloadService?: PropertyPayloadService
  ) {
    this.pool = pool;
    this.propertyRepo = propertyRepo || new PropertyRepository(pool);
    this.ownerRepo = ownerRepo || new PropertyOwnerRepository(pool);
    this.loanRepo = loanRepo || new LoanRepository(pool);
    this.propertyPayloadService = propertyPayloadService || new PropertyPayloadService(pool);
  }

  /**
   * Fetch properties from a provider
   * @param providerCode Provider code (e.g., 'PR')
   * @param criteria Search criteria
   * @param fields Fields to retrieve
   * @returns Array of properties
   */
  async fetchPropertiesFromProvider(
    providerCode: string,
    criteria: any,
    fields: string[],
    campaignId: string = 'individual-request'
  ): Promise<any[]> {
    const provider = leadProviderFactory.getProvider(providerCode);
    
    if (!provider.isConfigured()) {
      throw new AppError(
        ERROR_CODES.SYSTEM_CONFIGURATION_ERROR,
        `Provider ${providerCode} is not properly configured.`,
        500
      );
    }
    
    // Fetch properties from provider
    const properties = await provider.fetchProperties(criteria, fields);
    
    // Save raw payload to file
    if (properties.length > 0) {
      try {
        // Get batch number for this campaign
        const batchNumber = this.getNextBatchNumber(campaignId);
        
        // Save properties to file
        await this.propertyPayloadService.savePropertyPayload(
          properties,
          campaignId,
          batchNumber
        );
        
        logger.info(`Saved raw payload for ${properties.length} properties from individual request`);
      } catch (error) {
        logger.error('Error saving raw payload:', error);
        // Continue even if saving the payload fails
      }
    }
    
    return properties;
  }

  /**
   * Fetch a single property by its RadarID
   * @param providerCode Provider code (e.g., 'PR')
   * @param radarId The PropertyRadar ID
   * @param fields Fields to retrieve
   * @returns Property data
   */
  /**
   * Fetch a single property by its RadarID
   * @param providerCode Provider code (e.g., 'PR')
   * @param radarId The PropertyRadar ID
   * @param fields Fields to retrieve
   * @returns Property data
   */
  async fetchPropertyByRadarId(
    providerCode: string,
    radarId: string,
    fields: string[],
    campaignId: string = 'individual-request'
  ): Promise<any> {
    const provider = leadProviderFactory.getProvider(providerCode);
    
    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerCode} is not properly configured.`);
    }
    
    if (!provider.fetchPropertyById) {
      throw new Error(`Provider ${providerCode} does not support fetching by ID.`);
    }
    
    // Fetch property from provider
    const property = await provider.fetchPropertyById(radarId, fields);
    
    // Note: We no longer save individual properties to file here
    // They will be saved in batches by the PropertyBatchService
    
    return property;
  }
  
  /**
   * Get next batch number for a campaign
   * @param campaignId Campaign ID
   * @returns Next batch number
   */
  protected getNextBatchNumber(campaignId: string): number {
    const currentBatchNumber = this.batchCounter.get(campaignId) || 0;
    const nextBatchNumber = currentBatchNumber + 1;
    this.batchCounter.set(campaignId, nextBatchNumber);
    return nextBatchNumber;
  }

  /**
   * Save a property with its related data
   * @param providerCode Provider code (e.g., 'PR')
   * @param rawPropertyData Raw property data from provider
   * @returns The inserted property
   */
  async saveProperty(
    providerCode: string,
    rawPropertyData: any
  ): Promise<InsertedProperty> {
    const client = await this.pool.connect();
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Get the provider and transform the property data
      const provider = leadProviderFactory.getProvider(providerCode);
      const { property: propertyData, owners, loans } = provider.transformProperty(rawPropertyData);
      
      // Check if provider_id is directly provided in the batch job criteria
      let providerId: number;
      
      if (rawPropertyData.batchJobCriteria && rawPropertyData.batchJobCriteria.provider_id) {
        // Use the provider_id from the batch job criteria
        providerId = rawPropertyData.batchJobCriteria.provider_id;
      } else if (rawPropertyData.criteria && rawPropertyData.criteria.provider_id) {
        // Use the provider_id from the property criteria
        providerId = rawPropertyData.criteria.provider_id;
      } else {
        // Get provider_id from the database
        const leadProviderResult = await client.query<{ provider_id: number }>(
          `SELECT provider_id FROM lead_providers WHERE provider_code = $1`,
          [providerCode]
        );
        
        if (leadProviderResult.rows.length > 0) {
          providerId = leadProviderResult.rows[0].provider_id;
        } else {
          // Create the provider if it doesn't exist
          const insertResult = await client.query<{ provider_id: number }>(
            `INSERT INTO lead_providers (provider_name, provider_code)
             VALUES ($1, $2)
             RETURNING provider_id`,
            [provider.getName(), providerCode]
          );
          providerId = insertResult.rows[0].provider_id;
        }
      }
      
      // Check if property already exists by radar_id
      const existingProperty = await this.propertyRepo.findByRadarId(propertyData.radar_id!, client);
      
      let property: Property;
      
      if (existingProperty) {
        // Update existing property
        const updatedProperty = await this.propertyRepo.update(
          existingProperty.property_id,
          { ...propertyData, provider_id: providerId, updated_at: new Date() },
          client
        );
        property = updatedProperty!;
      } else {
        // Create new property
        property = await this.propertyRepo.create(
          { ...propertyData, provider_id: providerId, created_at: new Date(), is_active: true },
          client
        );
      }
      
      // Process owners if they exist
      if (owners && owners.length > 0) {
        await this.ownerRepo.bulkUpsert(property.property_id, owners, client);
      }
      
      // Process loans if they exist
      if (loans && loans.length > 0) {
        await this.loanRepo.bulkUpsert(property.property_id, loans, client);
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      return {
        propertyId: property.property_id,
        radarId: property.radar_id,
        address: property.property_address,
        city: property.property_city,
        state: property.property_state
      };
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error('Error saving property:', error);
      throw error;
    } finally {
      // Release client back to pool
      client.release();
    }
  }

  /**
   * Save multiple properties in a batch
   * @param providerCode Provider code (e.g., 'PR')
   * @param rawPropertiesData Array of raw property data from provider
   * @returns Array of inserted properties
   */
  async saveProperties(
    providerCode: string,
    rawPropertiesData: any[]
  ): Promise<InsertedProperty[]> {
    if (rawPropertiesData.length === 0) {
      return [];
    }

    const results: InsertedProperty[] = [];
    const BATCH_SIZE = 50; // Process 50 properties at a time
    const provider = leadProviderFactory.getProvider(providerCode);
    
    // Process in batches to improve performance
    for (let i = 0; i < rawPropertiesData.length; i += BATCH_SIZE) {
      const batch = rawPropertiesData.slice(i, i + BATCH_SIZE);
      const client = await this.pool.connect();
      
      try {
        // Begin transaction for the batch
        await client.query('BEGIN');
        
        // Get provider_id (same for all properties in the batch)
        let providerId: number;
        
        // Check if provider_id is in the batch job criteria
        if (batch[0].batchJobCriteria && batch[0].batchJobCriteria.provider_id) {
          providerId = batch[0].batchJobCriteria.provider_id;
        } else if (batch[0].criteria && batch[0].criteria.provider_id) {
          providerId = batch[0].criteria.provider_id;
        } else {
          // Get provider_id from the database
          const leadProviderResult = await client.query<{ provider_id: number }>(
            `SELECT provider_id FROM lead_providers WHERE provider_code = $1`,
            [providerCode]
          );
          
          if (leadProviderResult.rows.length > 0) {
            providerId = leadProviderResult.rows[0].provider_id;
          } else {
            // Create the provider if it doesn't exist
            const insertResult = await client.query<{ provider_id: number }>(
              `INSERT INTO lead_providers (provider_name, provider_code)
               VALUES ($1, $2)
               RETURNING provider_id`,
              [provider.getName(), providerCode]
            );
            providerId = insertResult.rows[0].provider_id;
          }
        }
        
        // Process each property in the batch
        for (const rawPropertyData of batch) {
          try {
            // Transform the property data
            const { property: propertyData, owners, loans } = provider.transformProperty(rawPropertyData);
            
            // Check if property already exists by radar_id
            const existingProperty = await this.propertyRepo.findByRadarId(propertyData.radar_id!, client);
            
            let property: Property;
            
            if (existingProperty) {
              // Update existing property
              const updatedProperty = await this.propertyRepo.update(
                existingProperty.property_id,
                { ...propertyData, provider_id: providerId, updated_at: new Date() },
                client
              );
              property = updatedProperty!;
            } else {
              // Create new property
              property = await this.propertyRepo.create(
                { ...propertyData, provider_id: providerId, created_at: new Date(), is_active: true },
                client
              );
            }
            
            // Process owners if they exist
            if (owners && owners.length > 0) {
              await this.ownerRepo.bulkUpsert(property.property_id, owners, client);
            }
            
            // Process loans if they exist
            if (loans && loans.length > 0) {
              await this.loanRepo.bulkUpsert(property.property_id, loans, client);
            }
            
            // Add to results
            results.push({
              propertyId: property.property_id,
              radarId: property.radar_id,
              address: property.property_address,
              city: property.property_city,
              state: property.property_state
            });
          } catch (error) {
            // Log error but continue with next property in the batch
            console.error(`Error processing property with radar ID ${rawPropertyData.RadarID}:`, error);
          }
        }
        
        // Commit transaction for the batch
        await client.query('COMMIT');
      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error(`Error processing batch of ${batch.length} properties:`, error);
      } finally {
        // Release client back to pool
        client.release();
      }
    }
    
    return results;
  }

  /**
   * Get a property with all related data
   * @param propertyId Property ID
   * @returns Complete property data
   */
  async getPropertyWithRelations(propertyId: number): Promise<any | null> {
    // First try to get from the view if it exists
    try {
      const completeData = await this.propertyRepo.getCompletePropertyData(propertyId);
      
      if (completeData) {
        return completeData;
      }
    } catch (error) {
      // If the view doesn't exist, we'll fetch data separately
      console.warn('Error using complete_property_view:', error);
    }
    
    // Fetch property, owners, and loans separately
    const property = await this.propertyRepo.findById(propertyId);
    
    if (!property) {
      return null;
    }
    
    const owners = await this.ownerRepo.findByPropertyId(propertyId);
    const loans = await this.loanRepo.findByPropertyId(propertyId);
    
    return {
      ...property,
      owners,
      loans
    };
  }

  /**
   * Search for properties by criteria
   * @param criteria Search criteria
   * @param limit Maximum number of results
   * @param offset Offset for pagination
   * @returns Properties matching criteria
   */
  async searchProperties(
    criteria: Partial<Property> & { [key: string]: any },
    limit: number = 100,
    offset: number = 0
  ): Promise<Property[]> {
    return this.propertyRepo.findByCriteria(criteria, limit, offset);
  }

  /**
   * Count properties matching criteria
   * @param criteria Search criteria
   * @returns Count of matching properties
   */
  async countProperties(
    criteria: Partial<Property> & { [key: string]: any }
  ): Promise<number> {
    return this.propertyRepo.countByCriteria(criteria);
  }
}
