// Criteria categories
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

// US States for dropdown
export const US_STATES: string[] = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Property Types
export const PROPERTY_TYPES: { value: string; label: string }[] = [
  { value: 'SFR', label: 'Single Family Residence' },
  { value: 'CND', label: 'Condo' },
  { value: 'MFR', label: 'Multi-Family Residence' },
  { value: 'MH', label: 'Mobile Home' },
  { value: 'LND', label: 'Land' }
];

// Loan Types - commented out as currently unused
// export const LOAN_TYPES: { value: string; label: string }[] = [
//   { value: 'C', label: 'Conventional' },
//   { value: 'F', label: 'FHA' },
//   { value: 'V', label: 'VA' },
//   { value: 'P', label: 'Private' }
// ];