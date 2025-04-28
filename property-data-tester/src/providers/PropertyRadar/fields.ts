import { FieldDefinition } from '../types';

/**
 * Field definitions specific to the PropertyRadar provider.
 * Extracted from the original AVAILABLE_FIELDS constant in FieldSelector.tsx.
 */
export const fields: FieldDefinition[] = [
  // Basic Info
  { id: 'RadarID', name: 'RadarID', category: 'Basic Info' },
  { id: 'PType', name: 'PType', category: 'Basic Info' },
  { id: 'Address', name: 'Address', category: 'Basic Info' },
  { id: 'City', name: 'City', category: 'Basic Info' },
  { id: 'State', name: 'State', category: 'Basic Info' },
  { id: 'ZipFive', name: 'ZipFive', category: 'Basic Info' },
  { id: 'County', name: 'County', category: 'Basic Info' },
  { id: 'APN', name: 'APN', category: 'Basic Info' },
  // Owner Info
  { id: 'Owner', name: 'Owner', category: 'Owner Info' },
  { id: 'OwnerFirstName', name: 'OwnerFirstName', category: 'Owner Info' },
  { id: 'OwnerLastName', name: 'OwnerLastName', category: 'Owner Info' },
  { id: 'OwnerSpouseFirstName', name: 'OwnerSpouseFirstName', category: 'Owner Info' },
  { id: 'OwnershipType', name: 'OwnershipType', category: 'Owner Info' },
  { id: 'isSameMailingOrExempt', name: 'isSameMailingOrExempt', category: 'Owner Info' },
  { id: 'isMailVacant', name: 'isMailVacant', category: 'Owner Info' },
  { id: 'PhoneAvailability', name: 'PhoneAvailability', category: 'Owner Info' },
  { id: 'EmailAvailability', name: 'EmailAvailability', category: 'Owner Info' },
  // Value and Equity
  { id: 'AVM', name: 'AVM', category: 'Value and Equity' },
  { id: 'AvailableEquity', name: 'AvailableEquity', category: 'Value and Equity' },
  { id: 'EquityPercent', name: 'EquityPercent', category: 'Value and Equity' },
  { id: 'CLTV', name: 'CLTV', category: 'Value and Equity' },
  { id: 'TotalLoanBalance', name: 'TotalLoanBalance', category: 'Value and Equity' },
  { id: 'NumberLoans', name: 'NumberLoans', category: 'Value and Equity' },
  // Loan Info
  { id: 'FirstDate', name: 'FirstDate', category: 'Loan Info' },
  { id: 'FirstAmount', name: 'FirstAmount', category: 'Loan Info' },
  { id: 'FirstRate', name: 'FirstRate', category: 'Loan Info' },
  { id: 'FirstRateType', name: 'FirstRateType', category: 'Loan Info' },
  { id: 'FirstTermInYears', name: 'FirstTermInYears', category: 'Loan Info' },
  { id: 'FirstLoanType', name: 'FirstLoanType', category: 'Loan Info' },
  { id: 'FirstPurpose', name: 'FirstPurpose', category: 'Loan Info' },
  { id: 'SecondDate', name: 'SecondDate', category: 'Loan Info' },
  { id: 'SecondAmount', name: 'SecondAmount', category: 'Loan Info' },
  { id: 'SecondLoanType', name: 'SecondLoanType', category: 'Loan Info' },
  // Tax Info
  { id: 'AnnualTaxes', name: 'AnnualTaxes', category: 'Tax Info' },
  { id: 'EstimatedTaxRate', name: 'EstimatedTaxRate', category: 'Tax Info' },
  // Transaction History
  { id: 'LastTransferRecDate', name: 'LastTransferRecDate', category: 'Transaction History' },
  { id: 'LastTransferValue', name: 'LastTransferValue', category: 'Transaction History' },
  { id: 'LastTransferDownPaymentPercent', name: 'LastTransferDownPaymentPercent', category: 'Transaction History' },
  { id: 'LastTransferSeller', name: 'LastTransferSeller', category: 'Transaction History' },
  // Property Status
  { id: 'isListedForSale', name: 'isListedForSale', category: 'Property Status' },
  { id: 'ListingPrice', name: 'ListingPrice', category: 'Property Status' },
  { id: 'DaysOnMarket', name: 'DaysOnMarket', category: 'Property Status' },
  { id: 'inForeclosure', name: 'inForeclosure', category: 'Property Status' },
  { id: 'ForeclosureStage', name: 'ForeclosureStage', category: 'Property Status' },
  { id: 'DefaultAmount', name: 'DefaultAmount', category: 'Property Status' },
  { id: 'inTaxDelinquency', name: 'inTaxDelinquency', category: 'Property Status' },
  { id: 'DelinquentAmount', name: 'DelinquentAmount', category: 'Property Status' },
  { id: 'DelinquentYear', name: 'DelinquentYear', category: 'Property Status' },
];

// Note: The FieldDefinition interface in types.ts might need refinement
// if more properties (like description, data type) are needed from these fields.
// Added 'category' based on the original structure.