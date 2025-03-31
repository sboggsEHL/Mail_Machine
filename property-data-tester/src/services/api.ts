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

export default api;