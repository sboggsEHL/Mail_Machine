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
  async processList(listId: number, excludeRadarIds: string[] = []) {
    const response = await api.post(`/lists/${listId}/process`, {
      excludeRadarIds,
      userId: localStorage.getItem('userId') || 'system'
    });
    return response.data;
  }
}

export const listService = new ListService();