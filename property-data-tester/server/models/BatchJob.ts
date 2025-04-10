/**
 * Interface for batch job
 */
export interface BatchJob {
  job_id?: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  criteria: Record<string, any>;
  total_records?: number;
  processed_records?: number;
  success_count?: number;
  error_count?: number;
  error_details?: string;
  created_at?: Date;
  updated_at?: Date;
  completed_at?: Date;
  created_by: string;
  priority?: number;
  attempts?: number;
  max_attempts?: number;
}

/**
 * Interface for batch job log
 */
export interface BatchJobLog {
  log_id?: number;
  job_id: number;
  message: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  timestamp?: Date;
}

/**
 * Interface for batch job progress
 */
export interface BatchJobProgress {
  job_id: number;
  processed_records: number;
  total_records: number;
  success_count: number;
  error_count: number;
  percent_complete: number;
}