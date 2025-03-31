import { PropertyRadarProvider } from './PropertyRadarProvider';
import { PropertyRadarCriteriaMapper } from './PropertyRadarCriteriaMapper';
import * as types from './types';

export {
  PropertyRadarProvider,
  PropertyRadarCriteriaMapper,
  types
};

/**
 * Create and configure a PropertyRadar provider instance
 * @param apiToken The API token for PropertyRadar
 * @returns Configured PropertyRadar provider
 */
export function createPropertyRadarProvider(apiToken: string): PropertyRadarProvider {
  return new PropertyRadarProvider(apiToken);
}
