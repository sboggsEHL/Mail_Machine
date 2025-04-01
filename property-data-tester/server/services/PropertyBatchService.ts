import { PropertyService } from './PropertyService';
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

  constructor(pool: Pool, providerCode: string = 'PR') {
    super(pool);
    this.providerCode = providerCode;
  }

  /**
   * Get estimated count of properties matching criteria
   * @param criteria Search criteria
   * @returns Estimated count
   */
  async getEstimatedCount(criteria: Record<string, any>): Promise<PropertyCountResult> {
    try {
      // First try to get count from provider API
      // Since the LeadProvider interface doesn't have getEstimatedCount,
      // we'll use fetchProperties with a limit of 1 to check if there are any results
      const provider = leadProviderFactory.getProvider(this.providerCode);
      
      if (provider.isConfigured()) {
        try {
          // Fetch a single property to check if there are results
          const properties = await provider.fetchProperties({
            ...criteria,
            limit: 1
          }, ['RadarID']);
          
          // If we got a result, we can estimate there are more
          if (properties.length > 0) {
            // This is a rough estimate - in a real implementation,
            // you would want to get a more accurate count from the API
            return { count: 10000 }; // Assume a large number for batch processing
          }
        } catch (error) {
          console.warn('Error estimating count from provider:', error);
        }
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
    limit: number = 400,
    offset: number = 0
  ): Promise<PropertyBatchResult> {
    try {
      // Get properties from provider
      const properties = await this.fetchPropertiesFromProvider(
        this.providerCode,
        {
          ...criteria,
          limit,
          offset
        },
        [
          'RadarID',
          'Address',
          'City',
          'State',
          'ZipFive',
          'Owner',
          'Owner2',
          'FirstLoanType',
          'FirstLoanAmount',
          'FirstLoanDate',
          'EstimatedValue',
          'AvailableEquity'
        ]
      );
      
      // Save properties to database
      await this.saveProperties(this.providerCode, properties);
      
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
}

// Import at the end to avoid circular dependencies
import { leadProviderFactory } from './lead-providers/LeadProviderFactory';