/**
 * Interface representing a mail recipient in the database
 */
export interface Recipient {
  recipient_id?: number;
  campaign_id: number;
  property_id: number;
  loan_id: string;
  owner_id: number;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  city_state_zip: string;
  close_month?: string;
  skip_month?: string;
  next_pay_month?: string;
  mail_date?: Date;
  phone_number?: string;
  presort_tray?: string;
  barcode?: string;
  status: 'PENDING' | 'MAILED' | 'RETURNED' | 'RESPONDED';
  mailed_date?: Date | null;
  response_date?: Date | null;
  loan_type?: string;
  loan_balance?: number;
  lender_name?: string;
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
}