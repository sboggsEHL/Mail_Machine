import { PropertyService, InsertedProperty } from './PropertyService';
import { PropertyPayloadService } from './PropertyPayloadService';
import { Pool } from 'pg';
import { AppError, ERROR_CODES } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Result of property batch operation
 */
export interface PropertyBatchResult {
  properties: any[];
  hasMore: boolean;
  totalCount?: number;
}

/**
 * Result of property count operation
 */
export interface PropertyCountResult {
  count: number;
}

/**
 * Extension of PropertyService with batch processing capabilities
 */
export class PropertyBatchService extends PropertyService {
  private providerCode: string;
  protected propertyPayloadService: PropertyPayloadService;
  protected batchCounter: Map<string, number> = new Map();
  protected dbPool: Pool; // Store a reference to the pool

  constructor(
    pool: Pool,
    providerCode: string = 'PR',
    propertyPayloadService?: PropertyPayloadService
  ) {
    super(pool);
    this.providerCode = providerCode;
    this.propertyPayloadService = propertyPayloadService || new PropertyPayloadService(pool);
    this.dbPool = pool; // Store the pool for our own use
  }

  /**
   * Get estimated count of properties matching criteria
   * @param criteria Search criteria
   * @returns Estimated count
   */
  async getEstimatedCount(criteria: Record<string, any>): Promise<PropertyCountResult> {
    try {
      // Get list of RadarIDs from criteria
      let radarIds: string[] = [];
      
      if (criteria.RadarID) {
        // If RadarID is directly provided in criteria
        radarIds = Array.isArray(criteria.RadarID) ? criteria.RadarID : [criteria.RadarID];
      } else if (criteria.Criteria) {
        // Extract RadarIDs from Criteria array
        const radarIdCriterion = criteria.Criteria.find((c: any) => c.name === 'RadarID');
        if (radarIdCriterion && Array.isArray(radarIdCriterion.value)) {
          radarIds = radarIdCriterion.value;
        }
      }
      
      if (radarIds.length > 0) {
        // If we have RadarIDs, return their count
        return { count: radarIds.length };
      }
      
      // Fallback to database count
      const count = await this.countProperties(criteria);
      return { count };
    } catch (error) {
      console.error('Error getting estimated count:', error);
      return { count: 0 };
    }
  }

  /**
   * Get properties in batches
   * @param criteria Search criteria
   * @param limit Maximum number of results
   * @param offset Offset for pagination
   * @returns Batch of properties
   */
  async getProperties(
    criteria: Record<string, any>,
    campaignId: string = 'default',
    limit: number = 400,
    offset: number = 0
  ): Promise<PropertyBatchResult> {
    try {
      // Get list of RadarIDs from criteria
      let radarIds: string[] = [];
      
      if (criteria.RadarID) {
        // If RadarID is directly provided in criteria
        radarIds = Array.isArray(criteria.RadarID) ? criteria.RadarID : [criteria.RadarID];
      } else if (criteria.Criteria) {
        // Extract RadarIDs from Criteria array
        const radarIdCriterion = criteria.Criteria.find((c: any) => c.name === 'RadarID');
        if (radarIdCriterion && Array.isArray(radarIdCriterion.value)) {
          radarIds = radarIdCriterion.value;
        }
      }
      
      if (radarIds.length === 0) {
        throw new Error('No RadarIDs found in criteria');
      }
      
      // Define fields to fetch
      const fields = [
        // Basic Info
        'RadarID', 'PType', 'Address', 'City', 'State', 'ZipFive', 'County', 'APN',
        
        // Owner Info
        'Owner', 'OwnerFirstName', 'OwnerLastName', 'OwnerSpouseFirstName', 'OwnershipType',
        'isSameMailingOrExempt', 'isMailVacant', 'PhoneAvailability', 'EmailAvailability',
        
        // Value and Equity
        'AVM', 'AvailableEquity', 'EquityPercent', 'CLTV', 'TotalLoanBalance', 'NumberLoans',
        
        // Loan Info
        'FirstDate', 'FirstAmount', 'FirstRate', 'FirstRateType', 'FirstTermInYears',
        'FirstLoanType', 'FirstPurpose', 'FirstLenderOriginal', 'SecondDate', 'SecondAmount', 'SecondLoanType',
        
        // Tax Info
        'AnnualTaxes', 'EstimatedTaxRate',
        
        // Transaction History
        'LastTransferRecDate', 'LastTransferValue', 'LastTransferDownPaymentPercent', 'LastTransferSeller',
        
        // Property Status
        'isListedForSale', 'ListingPrice', 'DaysOnMarket', 'inForeclosure', 'ForeclosureStage',
        'DefaultAmount', 'inTaxDelinquency', 'DelinquentAmount', 'DelinquentYear'
      ];
      
      // Check for existing batches to avoid duplicate processing
      const existingBatches = await this.getExistingBatches(campaignId);
      const existingBatchNumbers = existingBatches.map(b => b.batch_number);
      
      if (existingBatches.length > 0) {
        console.log(`Found ${existingBatches.length} existing batches for campaign ${campaignId}. Will not reprocess these batches.`);
      }
      
      // Process properties in batches of 400
      const batchSize = 400;
      const allProperties: any[] = [];
      const batches: any[][] = [];
      
      // Split radarIds into batches of batchSize
      for (let i = 0; i < radarIds.length; i += batchSize) {
        batches.push(radarIds.slice(i, i + batchSize));
      }
      
      logger.info(`Processing ${radarIds.length} properties in ${batches.length} batches of up to ${batchSize} properties each`);
      
      // Calculate which batch we should start from based on offset
      const startBatchIndex = Math.floor(offset / batchSize);
      
      // Process each batch
      for (let batchIndex = startBatchIndex; batchIndex < batches.length; batchIndex++) {
        // Calculate the expected batch number for this batch
        const expectedBatchNumber = batchIndex + 1;
        
        // Skip this batch if it's already been processed
        if (existingBatchNumbers.includes(expectedBatchNumber)) {
          console.log(`Skipping batch ${expectedBatchNumber} as it has already been processed`);
          continue;
        }
        
        const batchRadarIds = batches[batchIndex];
        const batchProperties: any[] = [];
        const batchRawPayloads: any[] = [];
        
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batchRadarIds.length} properties`);
        
        // Fetch properties for this batch
        for (const radarId of batchRadarIds) {
          try {
            // Fetch the full raw property response
            const provider = leadProviderFactory.getProvider(this.providerCode);
            if (!provider.fetchPropertyById) {
              throw new Error(`Provider ${this.providerCode} does not support fetching by ID.`);
            }
            
            // Get property with consistent structure
            const { results, rawPayload } = await provider.fetchPropertyById(radarId, fields);
            
            // Check if the response has a RadarID
            if (!rawPayload || !rawPayload.RadarID) {
              logger.error(`Property ${radarId} missing RadarID in response:`, 
                JSON.stringify(rawPayload).substring(0, 200) + '...');
              continue; // Skip this property
            }
            
            // Save the raw response for payload logging
            batchRawPayloads.push(rawPayload);

            // Transform the property for processing
            let property = provider.transformProperty(rawPayload);

            // Double-check the transformed property has a RadarID
            if (property.property && property.property.radar_id) {
              batchProperties.push(property.property);
              allProperties.push(property.property);
            } else {
              logger.error(`Property ${radarId} missing radar_id after transformation`);
            }
          } catch (error) {
            logger.error(`Error fetching property ${radarId}:`, error);
            // Continue with next property
          }
        }
        
        // Only save batch if it has properties
        if (batchRawPayloads.length > 0) {
          // Use the expected batch number instead of getting a new one
          const batchNumber = expectedBatchNumber;
          
          // Save full raw payloads to file
          console.log(`Saving batch ${batchNumber} with ${batchRawPayloads.length} raw property payloads`);
          await this.propertyPayloadService.savePropertyPayload(
            batchRawPayloads,
            campaignId,
            batchNumber
          );
        }
      }
      
      // REMOVED: Direct database insertion to prevent duplicates
      // Properties will be processed and saved to the database by the worker
      console.log(`Saved ${allProperties.length} properties to JSON files for worker processing`);
      
      // Determine if there are more records
      const totalCount = await this.getEstimatedCount(criteria);
      const hasMore = offset + allProperties.length < totalCount.count;
      
      return {
        properties: allProperties,
        hasMore,
        totalCount: totalCount.count
      };
    } catch (error) {
      console.error('Error getting properties:', error);
      return {
        properties: [],
        hasMore: false,
        totalCount: 0
      };
    }
  }

  /**
   * Set provider code
   * @param providerCode Provider code
   */
  setProviderCode(providerCode: string): void {
    this.providerCode = providerCode;
  }

  /**
   * Get provider code
   * @returns Provider code
   */
  getProviderCode(): string {
    return this.providerCode;
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
   * Get existing batches for a campaign
   * @param campaignId Campaign ID
   * @returns Array of batch file statuses
   */
  protected async getExistingBatches(campaignId: string): Promise<any[]> {
    if (!this.dbPool) {
      return [];
    }
    
    try {
      const result = await this.dbPool.query(`
        SELECT * FROM batch_file_status
        WHERE campaign_id = $1::VARCHAR
        ORDER BY batch_number ASC
      `, [String(campaignId)]);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error checking existing batches for campaign ${campaignId}:`, error);
      return [];
    }
  }
  
  /**
   * Process pending property files
   * @param limit Maximum number of files to process
   * @returns Number of files processed
   */
  async processPendingFiles(limit: number = 10): Promise<number> {
    const pendingFiles = await this.propertyPayloadService.getPendingFiles(limit);
    let processedCount = 0;
    
    for (const { fileStatus, originalPath } of pendingFiles) {
      try {
        // Process the file using the processor function
        const result = await this.propertyPayloadService.processFile(
          fileStatus,
          originalPath,
          async (properties) => {
            try {
              // Save properties to database
              await this.saveProperties(this.providerCode, properties);
              return { success: properties.length, errors: 0 };
            } catch (error) {
              console.error('Error saving properties to database:', error);
              return { success: 0, errors: properties.length };
            }
          }
        );
        
        if (result.success) {
          processedCount++;
        }
      } catch (error) {
        console.error(`Error processing file:`, error);
      }
    }
    
    return processedCount;
  }
  
  /**
   * Override saveProperties to handle campaign assignment
   * @param providerCode Provider code
   * @param rawPropertiesData Array of raw property data
   * @returns Array of inserted properties
   */
  async saveProperties(
    providerCode: string,
    rawPropertiesData: any[]
  ): Promise<InsertedProperty[]> {
    const results: InsertedProperty[] = [];
    
    // Extract campaign ID and provider ID from criteria if available
    let campaignId: number | undefined = undefined;
    let providerId: number | undefined = undefined;
    
    // Check for campaign_id and provider_id in the batch job criteria
    if (rawPropertiesData.length > 0) {
      // First check in the batch job criteria
      const batchJobCriteria = rawPropertiesData[0].batchJobCriteria || {};
      
      if (batchJobCriteria.campaign_id) {
        // Ensure campaign_id is a number
        campaignId = Number(batchJobCriteria.campaign_id);
        console.log(`Found campaign ID ${campaignId} in batch job criteria, will assign properties to this campaign`);
      }
      
      if (batchJobCriteria.provider_id) {
        providerId = batchJobCriteria.provider_id;
        console.log(`Found provider ID ${providerId} in batch job criteria, will use this provider ID`);
        
        // Override the provider code with the provider ID from criteria
        // This is needed because the LeadProviderFactory uses provider code, but we have provider ID
        providerCode = 'PR'; // We know this is PropertyRadar
      }
      
      // Then check in the property criteria
      else if (rawPropertiesData[0].criteria) {
        if (rawPropertiesData[0].criteria.campaignId || rawPropertiesData[0].criteria.campaign_id) {
          // Ensure campaign_id is a number
          campaignId = Number(rawPropertiesData[0].criteria.campaignId || rawPropertiesData[0].criteria.campaign_id);
          console.log(`Found campaign ID ${campaignId} in property criteria, will assign properties to this campaign`);
        }
        
        if (rawPropertiesData[0].criteria.provider_id) {
          providerId = rawPropertiesData[0].criteria.provider_id;
          console.log(`Found provider ID ${providerId} in property criteria, will use this provider ID`);
          
          // Override the provider code with the provider ID from criteria
          providerCode = 'PR'; // We know this is PropertyRadar
        }
      }
    }
    
    // Call the parent class's saveProperties method
    const savedProperties = await super.saveProperties(providerCode, rawPropertiesData);
    
    // We intentionally do not assign properties to campaigns here
    // This prevents premature insertion into mail_recipients table
    
    return savedProperties;
  }
}

// Import at the end to avoid circular dependencies
import { leadProviderFactory } from './lead-providers/LeadProviderFactory';
