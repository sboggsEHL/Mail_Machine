/**
 * Interface representing a mail campaign in the database
 */
export interface Campaign {
  campaign_id?: number;
  campaign_name: string;
  description: string;
  campaign_date: Date;
  status: 'DRAFT' | 'READY' | 'MAILED' | 'COMPLETED' | 'CANCELLED';
  target_loan_types: string[];
  target_states: string[];
  date_range_start?: Date | null;
  date_range_end?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  created_by: string;
}