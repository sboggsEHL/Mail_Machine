// API Types
export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  count?: number;
  [key: string]: any;
}

export interface PropertyRadarCriteria {
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
}

export interface PropertyRadarApiParams {
  fields: string[];
  limit: number;
  start: number;
  purchase: number;
  criteria: PropertyRadarCriteria;
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
  Owner?: string;
  OwnerFirstName?: string;
  OwnerLastName?: string;
  OwnerSpouseFirstName?: string;
  PhoneAvailability?: string;
  EmailAvailability?: string;
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
  LoanID?: string;
  [key: string]: any;
}

export interface DnmForm {
  loanId: string;
  propertyId: string;
  radarId: string;
  reason: string;
  reasonCategory: string;
  notes: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
