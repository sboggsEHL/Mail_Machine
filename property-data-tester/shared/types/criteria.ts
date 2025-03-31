/**
 * Types for PropertyRadar criteria definitions
 */

/**
 * Represents a single criterion definition
 */
export interface CriterionDefinition {
  /** Name of the criterion (e.g., "State", "PropertyType") */
  name: string;
  
  /** Human-readable description */
  description: string;
  
  /** Type of criterion that determines UI input control and validation */
  criteriaType: 
    | 'Boolean' 
    | 'Multiple Values' 
    | 'Multiple Values Beginning With'
    | 'Multiple Range'
    | 'Multiple Range Including Unknowns'
    | 'Single Value'
    | 'PropertyType';
  
  /** Optional example value for guidance */
  example?: {
    value: string | number | boolean | Array<string | number>;
    description?: string;
  };
}

/**
 * Represents a collection of criteria for a specific category
 */
export interface CategoryCriteriaDefinition {
  /** The criteria definitions for a specific category */
  [key: `${string}Criteria`]: CriterionDefinition[];
}

/**
 * Mapping of all criteria by category
 */
export interface AllCriteriaDefinitions {
  /** All criteria organized by category */
  [category: string]: CriterionDefinition[];
}

/**
 * Possible values for a criterion
 */
export type CriterionValue = 
  | string
  | number
  | boolean
  | string[]
  | number[]
  | [number | null, number | null]; // Range with optional min/max
