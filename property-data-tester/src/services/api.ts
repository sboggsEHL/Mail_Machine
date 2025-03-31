import axios from 'axios';

// Base URL for API requests
const API_BASE_URL = '/api';

// Axios instance with common configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Interface for API response
 * @template T The type of data contained in the response
 */
interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  [key: string]: any;
}

/**
 * Interface for criteria definition
 */
export interface CriteriaDefinition {
  name: string;
  criteriaType: string;
  description: string;
  category?: string;
}

/**
 * Interface for criteria response
 */
interface CriteriaResponse extends ApiResponse<CriteriaDefinition[]> {
  criteria: CriteriaDefinition[];
  count: number;
}

/**
 * Fetch all criteria
 * @returns Promise with criteria response
 */
export const fetchAllCriteria = async (): Promise<CriteriaResponse> => {
  try {
    const response = await api.get<CriteriaResponse>('/criteria');
    return response.data;
  } catch (error) {
    console.error('Error fetching criteria:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch criteria',
      criteria: [],
      count: 0
    };
  }
};

/**
 * Fetch criteria by category
 * @param category The category to fetch criteria for
 * @returns Promise with criteria response
 */
export const fetchCriteriaByCategory = async (category: string): Promise<CriteriaResponse> => {
  try {
    const response = await api.get<CriteriaResponse>(`/criteria/${category}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching criteria for category ${category}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to fetch criteria for category ${category}`,
      criteria: [],
      count: 0
    };
  }
};

/**
 * Fetch criteria type map
 * @returns Promise with criteria type map response
 */
export const fetchCriteriaTypeMap = async (): Promise<ApiResponse<Record<string, string>>> => {
  try {
    const response = await api.get<ApiResponse<Record<string, string>>>('/criteria/types');
    return response.data;
  } catch (error) {
    console.error('Error fetching criteria type map:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch criteria type map',
      criteriaTypeMap: {}
    };
  }
};

/**
 * Fetch properties from PropertyRadar API
 * @param criteria The criteria to use for the search
 * @param fields The fields to include in the response
 * @param limit The maximum number of results to return
 * @param start The starting index for pagination
 * @returns Promise with properties response
 */
export const fetchProperties = async (
  criteria: Record<string, any>,
  fields: string[],
  limit: number = 10,
  start: number = 0
): Promise<ApiResponse<any[]>> => {
  try {
    const response = await api.post('/properties/fetch', {
      criteria,
      fields,
      limit,
      start
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching properties:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch properties',
      properties: [],
      count: 0
    };
  }
};

/**
 * Insert properties into the database
 * @param properties The properties to insert
 * @returns Promise with inserted properties response
 */
export const insertProperties = async (properties: any[]): Promise<ApiResponse<any[]>> => {
  try {
    const response = await api.post('/properties/insert', {
      properties
    });
    return response.data;
  } catch (error) {
    console.error('Error inserting properties:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to insert properties',
      properties: [],
      count: 0
    };
  }
};

/**
 * Search for properties in the database
 * @param criteria The criteria to use for the search
 * @param limit The maximum number of results to return
 * @param offset The offset for pagination
 * @returns Promise with properties response
 */
export const searchProperties = async (
  criteria: Record<string, any>,
  limit: number = 100,
  offset: number = 0
): Promise<ApiResponse<any[]>> => {
  try {
    const response = await api.post('/properties/search', {
      criteria,
      limit,
      offset
    });
    return response.data;
  } catch (error) {
    console.error('Error searching properties:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search properties',
      properties: [],
      count: 0,
      totalCount: 0
    };
  }
};

/**
 * Get a property by ID
 * @param id The property ID
 * @returns Promise with property response
 */
export const getProperty = async (id: number): Promise<ApiResponse<any>> => {
  try {
    const response = await api.get(`/properties/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting property ${id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to get property ${id}`,
      property: null
    };
  }
};

/**
 * Interface for campaign
 */
export interface Campaign {
  campaign_id?: number;
  campaign_name: string;
  description: string;
  campaign_date: string;
  status: string;
  target_loan_types: string[];
  target_states: string[];
  date_range_start?: string | null;
  date_range_end?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by: string;
}

/**
 * Interface for campaign stats
 */
export interface CampaignStats extends Campaign {
  total_recipients: number;
  mailed_count: number;
  response_count: number;
  response_rate?: number;
}

/**
 * Interface for campaign response
 */
interface CampaignResponse extends ApiResponse<Campaign> {
  campaign: Campaign;
}

/**
 * Interface for campaigns response
 */
interface CampaignsResponse extends ApiResponse<Campaign[]> {
  campaigns: Campaign[];
  count: number;
}

/**
 * Interface for campaign stats response
 */
interface CampaignStatsResponse extends ApiResponse<CampaignStats> {
  stats: CampaignStats;
}

/**
 * Fetch all campaigns
 * @returns Promise with campaigns response
 */
export const fetchCampaigns = async (): Promise<CampaignsResponse> => {
  try {
    const response = await api.get<CampaignsResponse>('/campaigns');
    return response.data;
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch campaigns',
      campaigns: [],
      count: 0
    };
  }
};

/**
 * Fetch campaign by ID
 * @param id The campaign ID
 * @returns Promise with campaign response
 */
export const fetchCampaignById = async (id: number): Promise<CampaignResponse> => {
  try {
    const response = await api.get<CampaignResponse>(`/campaigns/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching campaign ${id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to fetch campaign ${id}`,
      campaign: {} as Campaign
    };
  }
};

/**
 * Create campaign
 * @param campaign The campaign to create
 * @returns Promise with campaign response
 */
export const createCampaign = async (campaign: Campaign): Promise<CampaignResponse> => {
  try {
    const response = await api.post<CampaignResponse>('/campaigns', campaign);
    return response.data;
  } catch (error) {
    console.error('Error creating campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create campaign',
      campaign: {} as Campaign
    };
  }
};

/**
 * Update campaign
 * @param id The campaign ID
 * @param campaign The campaign data to update
 * @returns Promise with campaign response
 */
export const updateCampaign = async (id: number, campaign: Partial<Campaign>): Promise<CampaignResponse> => {
  try {
    const response = await api.put<CampaignResponse>(`/campaigns/${id}`, campaign);
    return response.data;
  } catch (error) {
    console.error(`Error updating campaign ${id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to update campaign ${id}`,
      campaign: {} as Campaign
    };
  }
};

/**
 * Delete campaign
 * @param id The campaign ID
 * @returns Promise with delete response
 */
export const deleteCampaign = async (id: number): Promise<ApiResponse> => {
  try {
    const response = await api.delete<ApiResponse>(`/campaigns/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting campaign ${id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to delete campaign ${id}`
    };
  }
};

/**
 * Fetch campaign stats
 * @param id The campaign ID
 * @returns Promise with campaign stats response
 */
export const fetchCampaignStats = async (id: number): Promise<CampaignStatsResponse> => {
  try {
    const response = await api.get<CampaignStatsResponse>(`/campaigns/${id}/stats`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching campaign stats ${id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to fetch campaign stats ${id}`,
      stats: {} as CampaignStats
    };
  }
};

export default api;