import axios from 'axios';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { PropertyRadarCriteriaMapper } from './lead-providers/propertyradar/PropertyRadarCriteriaMapper'; // Import mapper

// Load environment variables
dotenv.config();

export interface PropertyRadarList {
  ListID: number;
  ListName: string;
  ListType: string;
  TotalCount: string;
  Count: string;
  CreatedDate?: string;
  ModifiedDate?: string;
  isMonitored?: boolean;
  ItemCount?: number;
}

export interface PropertyRadarListItem {
  RadarID: string;
  AddedDate: string;
}

export interface DuplicateProperty {
  radar_id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  created_at: Date | null;
  last_campaign_id?: number;
  last_campaign_name?: string;
  last_campaign_date?: Date | null;
}

export interface DuplicateCheckResult extends DuplicateProperty {
  is_duplicate: boolean;
  added_date?: string;
}

export class PropertyRadarListService {
  private apiBaseUrl: string;
  private authToken: string;
  private pool: Pool;

  constructor(pool: Pool) {
    this.apiBaseUrl = 'https://api.propertyradar.com';
    this.authToken = process.env.PROPERTY_RADAR_TOKEN || '';
    this.pool = pool;
  }

  /**
   * Get all lists from PropertyRadar
   */
  async getLists(): Promise<PropertyRadarList[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/v1/lists`, {
        headers: this.getAuthHeaders()
      });
      
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching PropertyRadar lists:', error);
      throw error;
    }
  }

  /**
   * Get items (RadarIDs) from a specific list with pagination
   */
  async getListItems(listId: number, start: number = 0, limit: number = 1000): Promise<PropertyRadarListItem[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/v1/lists/${listId}/items`, {
        params: {
          Start: start,
          Limit: limit
        },
        headers: this.getAuthHeaders()
      });
      
      return response.data.results || [];
    } catch (error) {
      console.error(`Error fetching items for list ${listId}:`, error);
      throw error;
    }
  }

  /**
   * Get all items from a list with pagination handling
   */
  async getAllListItems(listId: number): Promise<PropertyRadarListItem[]> {
    let allItems: PropertyRadarListItem[] = [];
    let hasMore = true;
    let start = 0;
    const limit = 1000; // PropertyRadar's maximum limit
    
    while (hasMore) {
      const items = await this.getListItems(listId, start, limit);
      allItems = [...allItems, ...items];
      
      if (items.length < limit) {
        hasMore = false;
      } else {
        start += limit;
      }
    }
    
    return allItems;
  }

  /**
   * Check which RadarIDs already exist in our database
   * and return detailed information about the duplicates
   */
  async checkDuplicates(radarIds: string[]): Promise<DuplicateProperty[]> {
    if (radarIds.length === 0) return [];

    // Batch size for queries (tune as needed)
    const BATCH_SIZE = 2000;
    const allExistingRadarIds: string[] = [];

    try {
      console.log(`Checking for duplicates among ${radarIds.length} RadarIDs (batched)`);

      // Batch the radarIds for the existence check
      for (let i = 0; i < radarIds.length; i += BATCH_SIZE) {
        const batch = radarIds.slice(i, i + BATCH_SIZE);
        const existsResult = await this.pool.query(
          `SELECT radar_id FROM properties WHERE radar_id = ANY($1) AND is_active = true`,
          [batch]
        );
        allExistingRadarIds.push(...existsResult.rows.map(row => row.radar_id));
      }

      if (allExistingRadarIds.length === 0) {
        console.log('No duplicates found in the database');
        return [];
      }

      console.log(`Found ${allExistingRadarIds.length} matching properties in the database`);

      // Now get the full details for the existing RadarIDs (also batched)
      const duplicateMap = new Map<string, DuplicateProperty>();
      for (let i = 0; i < allExistingRadarIds.length; i += BATCH_SIZE) {
        const batch = allExistingRadarIds.slice(i, i + BATCH_SIZE);
        const result = await this.pool.query(
          `SELECT
            cpv.radar_id,
            cpv.property_address as address,
            cpv.property_city as city,
            cpv.property_state as state,
            cpv.property_zip as zip_code,
            cpv.property_created_at as created_at,
            cpv.campaign_id as last_campaign_id,
            cpv.campaign_name as last_campaign_name,
            cpv.campaign_date as last_campaign_date
          FROM public.complete_property_view cpv
          WHERE cpv.radar_id = ANY($1)
          ORDER BY cpv.property_created_at DESC`,
          [batch]
        );

        for (const row of result.rows) {
          if (!duplicateMap.has(row.radar_id)) {
            // Convert timestamps to Arizona time (UTC-7) for display
            if (row.created_at) {
              const date = new Date(row.created_at);
              row.created_at = date;
            }
            if (row.last_campaign_date) {
              const date = new Date(row.last_campaign_date);
              row.last_campaign_date = date;
            }
            duplicateMap.set(row.radar_id, row);
          }
        }
      }

      return Array.from(duplicateMap.values());
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      throw error;
    }
  }

  /**
   * Check duplicates for all items in one query using UNNEST
   */
  async checkDuplicatesAll(items: { RadarID: string; AddedDate: string }[]): Promise<DuplicateCheckResult[]> {
    if (items.length === 0) return [];

    const radarIdArray = items.map(i => i.RadarID);
    const addedArray = items.map(i => i.AddedDate);

    const query = `
      SELECT
        inp.radar_id,
        inp.added_date,
        cpv.property_address AS address,
        cpv.property_city AS city,
        cpv.property_state AS state,
        cpv.property_zip AS zip_code,
        cpv.property_created_at AS created_at,
        cpv.campaign_id AS last_campaign_id,
        cpv.campaign_name AS last_campaign_name,
        cpv.campaign_date AS last_campaign_date
      FROM UNNEST($1::text[], $2::text[]) WITH ORDINALITY AS inp(radar_id, added_date, ord)
      LEFT JOIN public.complete_property_view cpv ON LOWER(cpv.radar_id) = LOWER(inp.radar_id)
      ORDER BY inp.ord`;

    const result = await this.pool.query(query, [radarIdArray, addedArray]);

    return result.rows.map(row => ({
      radar_id: row.radar_id,
      address: row.address,
      city: row.city,
      state: row.state,
      zip_code: row.zip_code,
      created_at: row.created_at ? new Date(row.created_at) : null,
      last_campaign_id: row.last_campaign_id,
      last_campaign_name: row.last_campaign_name,
      last_campaign_date: row.last_campaign_date ? new Date(row.last_campaign_date) : null,
      is_duplicate: row.address ? true : false,
      added_date: row.added_date
    }));
  }

  /**
   * Create a new list in PropertyRadar
   * @param listData List creation data
   * @returns Created list information
   */
  async createList(listData: {
    Criteria: Array<{name: string, value: string[]}>;
    ListName: string;
    ListType: string;
    isMonitored: number;
  }): Promise<PropertyRadarList> {
    try {
      // First, get an estimate of how many properties match the criteria
      const previewResponse = await axios.post(
        `${this.apiBaseUrl}/v1/properties`,
        { Criteria: listData.Criteria }, // Wrap criteria array in Criteria property
        {
          params: {
            Fields: 'RadarID',
            Limit: 1,
            Purchase: 0
          },
          headers: this.getAuthHeaders()
        }
      );
      
      const estimatedCount = previewResponse.data.resultCount || 0;
      
      // If the count is extremely large, log it for monitoring
      // PropertyRadar can handle up to ~150k properties in a list
      if (estimatedCount > 100000) {
        console.log(`Creating large list with ${estimatedCount} properties`);
      }
      
      // Validate list name length (PropertyRadar has a 50 character limit)
      if (listData.ListName.length > 50) {
        console.warn(`List name exceeds 50 characters, it will be truncated by PropertyRadar`);
        // We don't truncate here as PropertyRadar will do it automatically
      }
      
      // Create the list with proper error handling
      const response = await this.executeWithRetry(() => {
        // Send the complete object structure as per API spec
        const requestBody = {
          ListName: listData.ListName,
          ListType: listData.ListType,
          isMonitored: listData.isMonitored,
          Criteria: listData.Criteria
        };

        console.log('Creating PropertyRadar list with payload:', JSON.stringify(requestBody, null, 2));

        return axios.post(
          `${this.apiBaseUrl}/v1/lists`,
          requestBody,
          {
            headers: this.getAuthHeaders(),
            validateStatus: (status) => status < 500 // Don't throw for 4xx errors
          }
        ).catch(error => {
          if (error.response) {
            console.error('PropertyRadar API error response:', {
              status: error.response.status,
              data: error.response.data,
              headers: error.response.headers
            });
            console.log('AXIOS ERROR', error.response?.data, error.response?.status, error.response?.headers);
          }
          throw error;
        });
      });
      
      if (response.data && response.data.results && response.data.results.length > 0) {
        return response.data.results[0];
      }
      
      throw new Error('No list created in response');
    } catch (error) {
      console.error('Error creating PropertyRadar list:', error);
      throw error;
    }
  }

  /**
   * Execute a function with retry logic
   * @param fn Function to execute
   * @param maxRetries Maximum number of retries
   * @param initialDelay Initial delay in milliseconds
   * @param backoffFactor Factor to increase delay on each retry
   * @returns Promise with the function result
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000,
    backoffFactor: number = 2
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Check if this is a rate limit error (429 status code)
        const isRateLimit = axios.isAxiosError(error) &&
                           error.response?.status === 429;
        
        // Extract retry time from response headers if available
        let waitTime = initialDelay * Math.pow(backoffFactor, attempt);
        if (isRateLimit && axios.isAxiosError(error) && error.response?.headers['retry-after']) {
          const retryAfter = error.response.headers['retry-after'];
          waitTime = parseInt(retryAfter) * 1000;
        }
        
        // Don't retry on the last attempt
        if (attempt >= maxRetries) {
          break;
        }
        
        console.log(`API call failed, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError;
  }

  /**
   * Get authentication headers for PropertyRadar API
   */
  private getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }
}
