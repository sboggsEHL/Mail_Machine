import { Pool, PoolClient } from 'pg';
import { Property, PropertyOwner, Loan } from '../../shared/types/database';
import { PropertyRepository } from '../repositories/PropertyRepository';
import { PropertyOwnerRepository } from '../repositories/PropertyOwnerRepository';
import { LoanRepository } from '../repositories/LoanRepository';
import { LeadProvider, PropertyTransformResult } from '../services/lead-providers/interfaces';
import { leadProviderFactory } from '../services/lead-providers/LeadProviderFactory';
import { PropertyPayloadService } from './PropertyPayloadService';

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
      throw new Error(`Provider ${providerCode} is not properly configured.`);
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
        
        console.log(`Saved raw payload for ${properties.length} properties from individual request`);
      } catch (error) {
        console.error('Error saving raw payload:', error);
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
      
      // Get provider_id (This should be done outside the transaction in a real app)
      const leadProviderResult = await client.query<{ provider_id: number }>(
        `SELECT provider_id FROM lead_providers WHERE provider_code = $1`,
        [providerCode]
      );
      
      let providerId: number;
      
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
    const results: InsertedProperty[] = [];
    
    // Process each property
    for (const rawPropertyData of rawPropertiesData) {
      try {
        const result = await this.saveProperty(providerCode, rawPropertyData);
        results.push(result);
      } catch (error) {
        console.error(`Error saving property with radar ID ${rawPropertyData.RadarID}:`, error);
        // Continue with next property
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
