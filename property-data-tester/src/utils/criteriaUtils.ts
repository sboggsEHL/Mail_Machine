/**
 * Utility functions for working with PropertyRadar criteria
 */

// Define criteria categories
export const CRITERIA_CATEGORIES = [
  { key: 'location', label: 'Location' },
  { key: 'property', label: 'Property' },
  { key: 'ownerdetails', label: 'Owner Details' },
  { key: 'value&equity', label: 'Value & Equity' },
  { key: 'propertytax', label: 'Property Tax' },
  { key: 'listing', label: 'Listing' },
  { key: 'loans&liens', label: 'Loans & Liens' },
  { key: 'foreclosure', label: 'Foreclosure' },
  { key: 'transfer', label: 'Transfer' }
];

// Function to load criteria definitions
export const loadCriteriaDefinitions = async (category: string) => {
  try {
    const response = await fetch(`/docs/PropertyRadar/criteria-${category}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load criteria for ${category}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error loading criteria for ${category}:`, error);
    return { [`${category}Criteria`]: [] };
  }
};

// Get appropriate React component type based on criteria type
export const getCriteriaInputType = (criteriaType: string) => {
  switch (criteriaType) {
    case 'Boolean':
      return 'boolean';
    case 'Multiple Values':
    case 'Multiple Values Beginning With':
      return 'multiSelect';
    case 'Multiple Range':
    case 'Multiple Range Including Unknowns':
      return 'range';
    case 'Single Value':
      return 'singleSelect';
    case 'PropertyType':
      return 'propertyType';
    default:
      return 'text';
  }
};

// Format value for display in active criteria badges
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

// Get the appropriate badge color for a criteria category
export const getCriteriaBadgeColor = (category: string): string => {
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

// Determine which category a criteria belongs to
export const getCriteriaCategory = (criteriaName: string): string => {
  // This is a simplistic mapping - in a real implementation, you would have a more 
  // comprehensive mapping of all criteria names to their categories
  const categoryMap: {[key: string]: string} = {
    // Location criteria
    'State': 'location',
    'County': 'location',
    'City': 'location',
    'ZipFive': 'location',
    'Address': 'location',
    'RadarID': 'location',
    
    // Property criteria
    'PropertyType': 'property',
    'OwnerOccupied': 'property',
    'OwnershipType': 'property',
    'Beds': 'property',
    'Baths': 'property',
    'SquareFeet': 'property',
    'YearBuilt': 'property',
    'Pool': 'property',
    'Vacant': 'property',
    
    // Owner details criteria
    'OwnerFirstName': 'ownerdetails',
    'OwnerLastName': 'ownerdetails',
    'isSameMailingOrExempt': 'ownerdetails',
    'isMailVacant': 'ownerdetails',
    'SameMailingAddress': 'ownerdetails',
    
    // Value & equity criteria
    'AVM': 'value&equity',
    'AvailableEquity': 'value&equity',
    'EquityPercent': 'value&equity',
    'CLTV': 'value&equity',
    
    // Property tax criteria
    'AnnualTaxes': 'propertytax',
    'EstimatedTaxRate': 'propertytax',
    'inTaxDelinquency': 'propertytax',
    
    // Listing criteria
    'isListedForSale': 'listing',
    'ListingPrice': 'listing',
    'DaysOnMarket': 'listing',
    
    // Loans & liens criteria
    'TotalLoanBalance': 'loans&liens',
    'NumberLoans': 'loans&liens',
    'FirstLoanType': 'loans&liens',
    'FirstRate': 'loans&liens',
    'loanTypes': 'loans&liens',
    
    // Foreclosure criteria
    'inForeclosure': 'foreclosure',
    'ForeclosureStage': 'foreclosure',
    'DefaultAmount': 'foreclosure',
    
    // Transfer criteria
    'LastTransferRecDate': 'transfer',
    'LastTransferValue': 'transfer',
    'LastTransferDownPaymentPercent': 'transfer'
  };
  
  return categoryMap[criteriaName] || 'other';
};
