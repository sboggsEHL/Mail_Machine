/**
 * Interface for batch file status
 */
export interface BatchFileStatus {
  file_id?: number;
  file_path: string;
  campaign_id: string;
  batch_number: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at?: Date;
  processed_at?: Date;
  error_details?: string;
  properties_count?: number;
  success_count?: number;
  error_count?: number;
  processing_time_ms?: number;
}