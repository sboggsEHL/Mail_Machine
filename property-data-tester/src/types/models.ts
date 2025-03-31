// Database models
export interface LeadProvider {
  provider_id: number;
  provider_name: string;
  provider_code: string;
  api_key?: string;
  api_endpoint?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Property {
  property_id: number;
  provider_id: number;
  radar_id: string;
  property_address: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  property_type: string;
  county: string;
  apn: string;
  ownership_type: string;
  is_same_mailing_or_exempt: boolean;
  is_mail_vacant: boolean;
  avm?: number;
  available_equity?: number;
  equity_percent?: number;
  cltv?: number;
  total_loan_balance?: number;
  number_loans?: number;
  annual_taxes?: number;
  estimated_tax_rate?: number;
  last_transfer_rec_date?: Date;
  last_transfer_value?: number;
  last_transfer_down_payment_percent?: number;
  last_transfer_seller?: string;
  is_listed_for_sale?: boolean;
  listing_price?: number;
  days_on_market?: number;
  in_foreclosure?: boolean;
  foreclosure_stage?: string;
  default_amount?: number;
  in_tax_delinquency?: boolean;
  delinquent_amount?: number;
  delinquent_year?: number;
}

export interface PropertyOwner {
  owner_id: number;
  property_id: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  owner_type: 'PRIMARY' | 'SPOUSE' | 'OTHER';
  is_primary_contact: boolean;
  phone_availability?: boolean;
  email_availability?: boolean;
}

export interface Loan {
  loan_id: number;
  property_id: number;
  loan_type?: string;
  loan_amount?: number;
  interest_rate?: number;
  rate_type?: string;
  term_years?: number;
  loan_purpose?: string;
  loan_position: number;
  origination_date?: Date;
  first_date?: Date;
  first_amount?: number;
  first_rate?: number;
  first_rate_type?: string;
  first_term_in_years?: number;
  first_loan_type?: string;
  first_purpose?: string;
  second_date?: Date;
  second_amount?: number;
  second_loan_type?: string;
}

export interface DnmRegistry {
  dnm_id: number;
  loan_id?: string;
  property_id?: number;
  radar_id?: string;
  reason: string;
  reason_category: string;
  source: string;
  blocked_by: string;
  blocked_at: Date;
  is_active: boolean;
  notes?: string;
}

export interface User {
  id: number;
  username: string;
}
