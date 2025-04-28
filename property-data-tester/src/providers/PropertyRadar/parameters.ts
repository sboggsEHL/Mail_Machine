import { ParameterDefinition } from '../types';

/**
 * Static definitions for basic API parameters specific to the PropertyRadar provider.
 * These are used alongside the dynamic criteria object.
 */
export const parameters: ParameterDefinition[] = [
  {
    id: 'limit',
    name: 'Limit',
    description: 'Maximum number of records to return per request.',
    type: 'number', // Assuming number type based on usage
    defaultValue: 10, // Default from App.tsx initial state
    required: false,
  },
  {
    id: 'start',
    name: 'Start',
    description: 'Starting record number (for pagination).',
    type: 'number', // Assuming number type based on usage
    defaultValue: 1, // Default from App.tsx initial state
    required: false,
  },
  {
    id: 'purchase',
    name: 'Purchase',
    description: 'Flag indicating whether to purchase records (0 or 1).',
    type: 'number', // Assuming number type based on usage (0 or 1)
    defaultValue: 0, // Default from App.tsx initial state
    required: false,
  },
  // Note: The 'criteria' parameter is handled dynamically based on user selections
  // and doesn't have a single static definition here.
  // Note: The 'fields' parameter is also handled dynamically based on FieldSelector.
];

// Refine 'type', 'defaultValue', 'required', etc. based on actual API requirements if needed.
// Added 'description' and inferred 'type'/'defaultValue'/'required'.