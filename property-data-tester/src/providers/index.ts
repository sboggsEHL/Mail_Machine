import * as PropertyRadar from './PropertyRadar';
import * as FirstAmerican from './FirstAmerican';
import { ProviderId, FieldDefinition, CriteriaDefinition, ParameterDefinition } from './types';

// Define a type for the provider modules to ensure consistency
// It expects modules exporting 'fields', 'criteria', and 'parameters' arrays.
type ProviderModule = {
  fields: FieldDefinition[];
  criteria: CriteriaDefinition[];
  parameters: ParameterDefinition[];
};

/**
 * Registry mapping ProviderIds to their corresponding configuration modules.
 * This allows UI components to dynamically load configurations based on the selected provider.
 */
export const PROVIDER_MODULES: { [key in ProviderId]?: ProviderModule } = {
  [ProviderId.PropertyRadar]: PropertyRadar,
  [ProviderId.FirstAmerican]: FirstAmerican,
  // Add future providers here:
  // [ProviderId.SomeOtherProvider]: SomeOtherProvider,
};

// Re-export shared types for convenience
export * from './types';