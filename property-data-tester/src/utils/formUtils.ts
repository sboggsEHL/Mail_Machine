import { PROPERTY_TYPES } from '../constants/formConstants';

// Get badge color for a category
export const getCategoryColor = (category: string): string => {
  const colorMap: {[key: string]: string} = {
    'location': 'primary',
    'property': 'success',
    'ownerdetails': 'danger',
    'value&equity': 'warning',
    'propertytax': 'info',
    'listing': 'secondary',
    'loans&liens': 'dark',
    'foreclosure': 'danger',
    'transfer': 'primary'
  };
  
  return colorMap[category] || 'info';
};

// Helper function to provide a human-readable explanation of what a criterion does
export const getCriterionExplanation = (name: string, value: any): string => {
  if (value === undefined || value === null) {
    return '';
  }
  
  // Handle specific criteria types with custom explanations
  switch (name) {
    case 'State':
      return `Properties located in ${Array.isArray(value) ? value.join(', ') : value}`;
      
    case 'Address':
      return `Properties with address: ${Array.isArray(value) ? value.join(', ') : value}`;
      
    case 'PropertyType':
      const typeLabels = value.map((v: string) =>
        PROPERTY_TYPES.find(t => t.value === v)?.label || v
      );
      return `Property types: ${typeLabels.join(', ')}`;
      
    case 'Beds':
      if (Array.isArray(value) && value.length === 2) {
        const min = value[0] === null ? 'any' : value[0];
        const max = value[1] === null ? 'any' : value[1];
        return `Properties with ${min} to ${max} bedrooms`;
      }
      return '';
      
    case 'Baths':
      if (Array.isArray(value) && value.length === 2) {
        const min = value[0] === null ? 'any' : value[0];
        const max = value[1] === null ? 'any' : value[1];
        return `Properties with ${min} to ${max} bathrooms`;
      }
      return '';
      
    case 'SquareFeet':
      if (Array.isArray(value) && value.length === 2) {
        const min = value[0] === null ? 'any' : value[0];
        const max = value[1] === null ? 'any' : value[1];
        return `Properties between ${min} and ${max} square feet`;
      }
      return '';
      
    case 'AVM':
      if (Array.isArray(value) && value.length === 2) {
        const min = value[0] === null ? 'any' : `$${value[0]}`;
        const max = value[1] === null ? 'any' : `$${value[1]}`;
        return `Properties valued between ${min} and ${max}`;
      }
      return '';
      
    case 'isSameMailingOrExempt':
      return value ? 'Owner lives in the property' : 'Owner does not live in the property';
      
    case 'isListedForSale':
      return value ? 'Properties currently listed for sale' : 'Properties not listed for sale';
      
    case 'inForeclosure':
      return value ? 'Properties in foreclosure' : 'Properties not in foreclosure';
      
    default:
      return '';
  }
};

// Format criteria value for display
export const formatCriteriaValue = (name: string, value: any): string => {
  if (value === undefined || value === null) {
    return '';
  }
  
  // Handle arrays of values
  if (Array.isArray(value)) {
    // Check if it's a range array with two elements
    if (value.length === 2) {
      const min = value[0] === null ? '0' : value[0];
      const max = value[1] === null ? '∞' : value[1];
      
      // Customize display based on criteria name
      if (name.includes('Rate') || name.includes('Percent')) {
        return `${min}% to ${max}%`;
      } else if (name.includes('Balance') || name.includes('Amount') || name.includes('Value')) {
        return `$${min} to $${max}`;
      } else {
        return `${min} to ${max}`;
      }
    }
    // Regular array of values
    return value.join(', ');
  }
  
  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Default - just convert to string
  return String(value);
};