/**
 * Defines shared types and identifiers for data providers.
 */

/**
 * Enum for consistent provider identification.
 * Values should match the 'id' field in src/constants/providers.ts
 */
export enum ProviderId {
  PropertyRadar = 'PropertyRadar',
  FirstAmerican = 'FirstAmerican',
  // Add other provider IDs here as they are supported
}

/**
 * Placeholder interface for a field definition.
 * TODO: Refine this based on actual data structure needed by FieldSelector.
 */
export interface FieldDefinition {
  id: string;         // Unique identifier for the field (often the API name)
  name: string;       // Display name for the UI
  category?: string;  // Optional category for UI grouping
  // Add other properties as needed (e.g., description, dataType)
}

/**
 * Interface for a criteria definition.
 * This accommodates structures found in both static definitions (like criteriaDefinitions.ts)
 * and potentially dynamic ones from APIs.
 */
export interface CriteriaDefinition {
  name: string;         // Name/ID used internally and potentially for API calls
  // Use the specific union type expected by child components
  criteriaType:
    | 'Boolean'
    | 'Multiple Values'
    | 'Multiple Values Beginning With'
    | 'Multiple Range'
    | 'Multiple Range Including Unknowns'
    | 'Single Value'
    | 'PropertyType';
  description: string;  // User-facing description
  category?: string;    // Optional category for UI grouping (present in API version)
  example?: any;        // Optional example value (present in static definitions)
}

/**
 * Placeholder interface for an API parameter definition.
 * Defines the structure for an API parameter, used for UI generation or validation.
 */
export interface ParameterDefinition {
  id: string;           // Parameter name used in the API call (e.g., 'limit')
  name: string;         // Display name for the UI (e.g., 'Limit')
  description?: string; // Optional description for UI tooltips or help text
  type?: string;        // Optional data type (e.g., 'number', 'string', 'boolean') for UI input rendering/validation
  defaultValue?: any;   // Optional default value
  required?: boolean;   // Optional flag indicating if the parameter is required
  // Add other properties as needed (e.g., validation rules, options for select inputs)
}

// You can add more shared types or interfaces related to providers here.