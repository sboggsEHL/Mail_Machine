import api from './api';
import { ProviderApi } from './providerApi';

export class PropertyRadarApi implements ProviderApi {
  async fetchProperties(params: any): Promise<any> {
    try {
      const response = await api.post('/fetch-properties', params);
      return response.data;
    } catch (error) {
      console.error('Error in fetchProperties:', error);
      throw error;
    }
  }

  async insertProperties(data: any): Promise<any> {
    try {
      const response = await api.post('/insert-properties', { properties: data });
      return response.data;
    } catch (error) {
      console.error('Error in insertProperties:', error);
      throw error;
    }
  }

  async createBatchJob(data: any): Promise<any> {
    try {
      const response = await api.post('/create-batch-job', data);
      return response.data;
    } catch (error) {
      console.error('Error in createBatchJob:', error);
      throw error;
    }
  }

  async createCampaign(data: any): Promise<any> {
    try {
      const response = await api.post('/create-campaign', data);
      return response.data;
    } catch (error) {
      console.error('Error in createCampaign:', error);
      throw error;
    }
  }

  async processPropertyFiles(params: { limit: number; cleanup: boolean }): Promise<any> {
    try {
      const response = await api.post('/property-files/process', params);
      return response.data;
    } catch (error) {
      console.error('Error in processPropertyFiles:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const response = await api.get('/current-user', { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      throw error;
    }
  }

  async addToDnm(data: any): Promise<any> {
    try {
      const response = await api.post('/add-to-dnm', data, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error in addToDnm:', error);
      throw error;
    }
  }
  async fetchCampaigns(): Promise<any> {
    try {
      const response = await api.get('/campaigns');
      return response.data;
    } catch (error) {
      console.error('Error in fetchCampaigns:', error);
      throw error;
    }
  }

  async fetchCampaignById(campaignId: number): Promise<any> {
    try {
      const response = await api.get(`/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      console.error('Error in fetchCampaignById:', error);
      throw error;
    }
  }

  async fetchCampaignStats(campaignId: number): Promise<any> {
    try {
      const response = await api.get(`/campaigns/${campaignId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error in fetchCampaignStats:', error);
      throw error;
    }
  }

  async fetchAllCriteria(): Promise<any> {
    try {
      const response = await api.get('/criteria');
      return response.data;
    } catch (error) {
      console.error('Error in fetchAllCriteria:', error);
      throw error;
    }
  }
}
