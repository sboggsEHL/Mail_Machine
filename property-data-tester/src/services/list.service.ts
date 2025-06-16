import api from './api';
import { PropertyRadarCriteria } from '../types/api'; // Import the type

interface DuplicateCheckJobStatusResult {
  success: boolean;
  jobId: string;
  status: string;
  totalBatches: number;
  completedBatches: number;
  result?: any[];
  error?: string;
}

class ListService {
  /**
   * Get all PropertyRadar lists
   */
  async getLists() {
    const response = await api.get('/lists');
    return response.data;
  }
  
  /**
   * Get items from a specific list
   */
  async getListItems(listId: number, start: number = 0, limit: number = 1000) {
    const response = await api.get(`/lists/${listId}/items`, {
      params: { start, limit }
    });
    return response.data.success ? response.data : { success: true, items: response.data };
  }
  
  /**
   * Get all items from a list (handles pagination)
   */
  async getAllListItems(listId: number) {
    let allItems: any[] = [];
    let hasMore = true;
    let start = 0;
    const limit = 1000;
    
    while (hasMore) {
      const response = await this.getListItems(listId, start, limit);
      if (response.success && response.items) {
        allItems = [...allItems, ...response.items];
        
        // Check if there are more items
        hasMore = response.hasMore === true;
        if (hasMore) {
          start += limit;
        }
      } else {
        hasMore = false;
      }
    }
    
    return { success: true, items: allItems };
  }
  
  /**
   * Check for duplicates in a list (old, direct call - deprecated)
   */
  async checkDuplicates(listId: number) {
    const response = await api.get(`/lists/${listId}/check-duplicates`);
    return response.data;
  }

  /**
   * Start duplicate check as a background job (new)
   */
  async startCheckDuplicatesJob(listId: number): Promise<{ success: boolean; jobId: string }> {
    const response = await api.post(`/lists/${listId}/check-duplicates-job`);
    return response.data;
  }

  /**
   * Poll duplicate check job status/progress/result (new)
   */
  async getCheckDuplicatesJobStatus(listId: number, jobId: string): Promise<DuplicateCheckJobStatusResult> {
    const response = await api.get(`/lists/${listId}/check-duplicates-status/${jobId}`);
    return response.data;
  }
  
  /**
   * Process a list (excluding specified duplicates)
   */
  async processList(
    listId: number, 
    excludeRadarIds: string[] = [], 
    leadCount?: number,
    campaignId?: number
  ) {
    const response = await api.post(`/lists/${listId}/process`, {
      excludeRadarIds,
      leadCount,
      campaignId,
      userId: localStorage.getItem('userId') || 'system'
    });
    return response.data;
  }

  /**
   * Create a new list
   * @param criteria Search criteria
   * @param listName List name
   * @param listType List type (default: 'static')
   * @param isMonitored Whether the list is monitored (default: 0)
   * @returns API response
   */
  async createList(criteria: PropertyRadarCriteria, listName: string, listType = 'static', isMonitored = 0) {
    try {
      // Transform criteria to match PropertyRadar API requirements
      const criteriaArray = Object.entries(criteria)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          // Special handling for PropertyType
          if (key === 'PropertyType' && Array.isArray(value)) {
            return {
              name: key,
              value: [
                {
                  name: 'PType',
                  value: value
                }
              ]
            };
          }
          // Handle boolean values
          if (typeof value === 'boolean') {
            return {
              name: key,
              value: [value ? "1" : "0"]
            };
          }
          // Handle arrays
          if (Array.isArray(value)) {
            return {
              name: key,
              value: value
            };
          }
          // Handle other values
          return {
            name: key,
            value: [value.toString()]
          };
        });

      // Build request body according to PropertyRadar API docs
      const requestBody: any = {
        ListName: listName,
        ListType: listType,
        isMonitored: isMonitored
      };
      // Include Criteria for static and dynamic lists, omit for import lists
      if (listType === 'static' || listType === 'dynamic') {
        requestBody.Criteria = criteriaArray;
      }
      // For import lists, do NOT include Criteria

      const response = await api.post('/lists', requestBody);
      return await response.data;
    } catch (error) {
      console.error('Error creating list:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create list'
      };
    }
  }
  

  /**
   * Preview property count
   * @param criteria Search criteria
   * @returns Preview result with count
   */
  async previewPropertyCount(criteria: PropertyRadarCriteria): Promise<{ success: boolean, count?: number, error?: string }> {
    try {
      // Send the raw criteria object (not transformed) in the 'criteria' property
      const response = await api.post('/properties/preview', { criteria });
      return response.data;
    } catch (error) {
      console.error('Error previewing property count:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to preview count'
      };
    }
  }

  /**
   * Process multiple lists (excluding specified duplicates)
   */
  async processMultipleLists(
    listIds: number[],
    excludeRadarIds: string[] = [],
    campaignId?: number,
    newCampaign?: any,
    leadCount?: number
  ) {
    const response = await api.post(`/lists/process-multiple`, {
      listIds,
      excludeRadarIds,
      campaignId,
      newCampaign,
      leadCount,
      userId: localStorage.getItem('userId') || 'system'
    });
    return response.data;
  }
}

export const listService = new ListService();
