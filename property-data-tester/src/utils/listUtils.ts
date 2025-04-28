import { PropertyRadarApiParams } from '../types/api';

/**
 * Generate a descriptive list name based on search criteria
 * @param apiParams API parameters with criteria
 * @param totalRecords Total matching records
 * @returns Generated list name
 */
export function generateListName(apiParams: PropertyRadarApiParams, totalRecords: number): string {
  const { criteria } = apiParams;
  const nameParts: string[] = [];
  
  // State criteria
  if (criteria.State) {
    nameParts.push(criteria.State.join(', ') + ' Properties');
  }
  
  // Property Type
  if (criteria.PropertyType && criteria.PropertyType.length > 0) {
    const propertyTypeMap: Record<string, string> = {
      'SFR': 'Single Family',
      'CND': 'Condo',
      'MFR': 'Multi-Family',
      'MH': 'Mobile Home',
      'LND': 'Land'
    };
    
    const types = criteria.PropertyType
      .map(type => propertyTypeMap[type] || type)
      .join(', ');
    
    nameParts.push(types);
  }
  
  // Loan Types
  if (criteria.FirstLoanType && criteria.FirstLoanType.length > 0) {
    nameParts.push(criteria.FirstLoanType.join(', ') + ' Loans');
  }
  
  // Add record count
  nameParts.push(`(${totalRecords} Records)`);
  
  // Join parts with appropriate separators
  let name = nameParts.join(': ');
  
  // Validate and truncate if necessary (PropertyRadar has a 50 character limit)
  if (name.length > 50) {
    name = name.substring(0, 47) + '...';
  }
  
  return name;
}

/**
 * Validate and format a list name
 * @param name Proposed list name
 * @returns Formatted list name
 */
export function validateListName(name: string): string {
  // Remove any characters that might cause issues
  let sanitized = name.replace(/[^\w\s\-:,()]/g, '');
  
  // Trim to 50 characters (PropertyRadar limit)
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 47) + '...';
  }
  
  return sanitized;
}