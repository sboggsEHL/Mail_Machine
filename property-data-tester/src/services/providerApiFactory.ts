import { ProviderApi } from './providerApi';
import { PropertyRadarApi } from './propertyRadarApi';

// Stub implementation for FirstAmerican
class FirstAmericanApi implements ProviderApi {
  async fetchProperties(params: any): Promise<any> {
    return { success: true, properties: [] };
  }
  async insertProperties(data: any): Promise<any> {
    return { success: false, message: 'Not implemented' };
  }
  async createCampaign(data: any): Promise<any> {
    return { success: false, message: 'Not implemented' };
  }
  async fetchAllCriteria(): Promise<any> {
    return { success: true, criteria: [] };
  }
}

export function getProviderApi(providerName: string): ProviderApi {
  switch (providerName) {
    case 'PropertyRadar':
      return new PropertyRadarApi();
    case 'FirstAmerican':
      return new FirstAmericanApi();
    // case 'ProviderX':
    //   return new ProviderXApi();
    default:
      return new PropertyRadarApi();
  }
}
