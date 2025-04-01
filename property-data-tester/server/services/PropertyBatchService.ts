import { PropertyService } from './PropertyService';
import { PropertyPayloadService } from './PropertyPayloadService';
import { Pool } from 'pg';

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

  constructor(
    pool: Pool,
    providerCode: string = 'PR',
    propertyPayloadService?: PropertyPayloadService
  ) {
    super(pool);
    this.providerCode = providerCode;
    this.propertyPayloadService = propertyPayloadService || new PropertyPayloadService(pool);
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
        'FirstLoanType', 'FirstPurpose', 'SecondDate', 'SecondAmount', 'SecondLoanType',
        
        // Tax Info
        'AnnualTaxes', 'EstimatedTaxRate',
        
        // Transaction History
        'LastTransferRecDate', 'LastTransferValue', 'LastTransferDownPaymentPercent', 'LastTransferSeller',
        
        // Property Status
        'isListedForSale', 'ListingPrice', 'DaysOnMarket', 'inForeclosure', 'ForeclosureStage',
        'DefaultAmount', 'inTaxDelinquency', 'DelinquentAmount', 'DelinquentYear'
      ];
      
      // Fetch properties one by one using the fetchPropertyByRadarId method
      const properties: any[] = [];
      for (const radarId of radarIds) {
        try {
          let property = await this.fetchPropertyByRadarId(
            this.providerCode,
            radarId,
            fields,
            campaignId
          );
          
          // Ensure the property has a RadarID
          if (property && property.RadarID) {
            properties.push(property);
          } else {
            console.error(`Property ${radarId} missing RadarID in response`);
          }
        } catch (error) {
          console.error(`Error fetching property ${radarId}:`, error);
          // Continue with next property
        }
      }
      
      // Get batch number for this campaign
      const batchNumber = this.getNextBatchNumber(campaignId);
      
      // Save properties to file first
      const startTime = Date.now();
      await this.propertyPayloadService.savePropertyPayload(
        properties,
        campaignId,
        batchNumber
      );
      
      try {
        // Save properties to database
        await this.saveProperties(this.providerCode, properties);
      } catch (error) {
        console.error('Error saving properties to database:', error);
        // The properties are still saved to file, so they can be processed later
        // We'll continue and return the properties to the caller
      }
      
      // Determine if there are more records
      const totalCount = await this.getEstimatedCount(criteria);
      const hasMore = offset + properties.length < totalCount.count;
      
      return {
        properties,
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
}

// Import at the end to avoid circular dependencies
import { leadProviderFactory } from './lead-providers/LeadProviderFactory';