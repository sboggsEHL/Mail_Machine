import { ProviderApi } from './providerApi';
import { PropertyRadarApi } from './propertyRadarApi';
// import { ProviderXApi } from './providerXApi'; // future providers

export function getProviderApi(providerName: string): ProviderApi {
  switch (providerName) {
    case 'PropertyRadar':
      return new PropertyRadarApi();
    // case 'ProviderX':
    //   return new ProviderXApi();
    default:
      return new PropertyRadarApi();
  }
}
