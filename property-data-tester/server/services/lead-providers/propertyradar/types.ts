/**
 * Types specific to PropertyRadar API integration
 */

// Request types
export interface PropertyRadarCriterion {
  name: string;
  value: any[];
}

export interface PropertyRadarRequest {
  Criteria: PropertyRadarCriterion[];
}

// Response types
export interface PropertyRadarApiResponse {
  success: boolean;
  count?: number;
  results: PropertyRadarProperty[];
  error?: string;
  errorMessage?: string;
}

export interface PropertyRadarProperty {
  RadarID: string;
  Address: string;
  City: string;
  State: string;
  ZipFive: string;
  PType: string;
  County: string;
  APN: string;
  OwnershipType: string;
  isSameMailingOrExempt: boolean;
  isMailVacant: boolean;
  Owner?: string;
  OwnerFirstName?: string;
  OwnerLastName?: string;
  OwnerSpouseFirstName?: string;
  PhoneAvailability?: string;
  EmailAvailability?: string;
  AVM?: number;
  AvailableEquity?: number;
  EquityPercent?: number;
  CLTV?: number;
  TotalLoanBalance?: number;
  NumberLoans?: number;
  AnnualTaxes?: number;
  EstimatedTaxRate?: number;
  LastTransferRecDate?: string;
  LastTransferValue?: number;
  LastTransferDownPaymentPercent?: number;
  LastTransferSeller?: string;
  isListedForSale?: boolean;
  ListingPrice?: number;
  DaysOnMarket?: number;
  inForeclosure?: boolean;
  ForeclosureStage?: string;
  DefaultAmount?: number;
  inTaxDelinquency?: boolean;
  DelinquentAmount?: number;
  DelinquentYear?: number;
  FirstDate?: string;
  FirstAmount?: number;
  FirstLoanType?: string;
  FirstRate?: number;
  FirstRateType?: string;
  FirstTermInYears?: number;
  FirstPurpose?: string;
  SecondDate?: string;
  SecondAmount?: number;
  SecondLoanType?: string;
  [key: string]: any;
}

// User-facing criteria
export interface PropertyRadarCriteriaInput {
  state?: string;
  propertyTypes?: string[];
  loanTypes?: string[];
  isSameMailingOrExempt?: boolean;
  isMailVacant?: boolean;
  inForeclosure?: boolean;
  isListedForSale?: boolean;
  equityPercent?: string;
  totalLoanBalance?: string;
  firstRate?: string;
  limit?: number;
  start?: number;
  purchase?: number;
  Criteria?: PropertyRadarCriterion[]; // For when criteria is already in API format
  [key: string]: any;
}
