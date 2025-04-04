import api from './api';

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
   * Check for duplicates in a list
   */
  async checkDuplicates(listId: number, page: number = 1, pageSize: number = 1000) {
    const response = await api.get(`/lists/${listId}/check-duplicates`, {
      params: { page, pageSize }
    });
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
  async createList(criteria: any[], listName: string, listType = 'static', isMonitored = 0) {
    try {
      const response = await api.post('/lists', {
        criteria,
        listName,
        listType,
        isMonitored
      });
      
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
   * Process multiple lists (excluding specified duplicates)
   */
  async processMultipleLists(
    listIds: number[],
    excludeRadarIds: string[] = [],
    campaignId?: number,
    newCampaign?: any
  ) {
    const response = await api.post(`/lists/process-multiple`, {
      listIds,
      excludeRadarIds,
      campaignId,
      newCampaign,
      userId: localStorage.getItem('userId') || 'system'
    });
    return response.data;
  }
}

export const listService = new ListService();
