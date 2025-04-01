import axios from 'axios';
import { Pool } from 'pg';
import dotenv from 'dotenv';

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
  created_at: Date;
  last_campaign_id?: number;
  last_campaign_name?: string;
  last_campaign_date?: Date;
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
    
    try {
      console.log(`Checking for duplicates among ${radarIds.length} RadarIDs`);
      
      // Use the complete_property_view as suggested by the user
      const result = await this.pool.query(`
        SELECT
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
        ORDER BY cpv.property_created_at DESC
      `, [radarIds]);
      
      console.log(`Found ${result.rows.length} matching properties in the database`);
      
      // Group by radar_id to get the latest campaign for each property
      const duplicateMap = new Map<string, DuplicateProperty>();
      
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
      
      return Array.from(duplicateMap.values());
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      throw error;
    }
    
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