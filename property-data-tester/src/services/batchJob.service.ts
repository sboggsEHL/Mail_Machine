import api from './api';

/**
 * Interface for batch job
 */
export interface BatchJob {
  job_id?: number;
  campaign_id?: number;
  status: string;
  criteria: Record<string, any>;
  total_records?: number;
  processed_records?: number;
  success_count?: number;
  error_count?: number;
  error_details?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  created_by: string;
}

/**
 * Interface for batch job log
 */
export interface BatchJobLog {
  log_id?: number;
  job_id: number;
  message: string;
  level: string;
  timestamp?: string;
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

/**
 * Interface for queue statistics
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

/**
 * Create a new batch job
 * @param criteria Search criteria
 * @param priority Job priority
 * @returns Created batch job
 */
export const createBatchJob = async (
  criteria: Record<string, any>,
  priority: number = 0
): Promise<BatchJob | null> => {
  try {
    const response = await api.post('/batch-jobs', {
      criteria,
      priority
    });
    
    if (response.data.success) {
      return response.data.job;
    }
    
    return null;
  } catch (error) {
    console.error('Error creating batch job:', error);
    return null;
  }
};

/**
 * Get all batch jobs
 * @param status Optional status filter
 * @param limit Maximum number of jobs to return
 * @param offset Offset for pagination
 * @returns Array of batch jobs
 */
export const getBatchJobs = async (
  status?: string,
  limit: number = 100,
  offset: number = 0
): Promise<BatchJob[]> => {
  try {
    let url = `/batch-jobs?limit=${limit}&offset=${offset}`;
    
    if (status) {
      url += `&status=${status}`;
    }
    
    const response = await api.get(url);
    
    if (response.data.success) {
      return response.data.jobs;
    }
    
    return [];
  } catch (error) {
    console.error('Error getting batch jobs:', error);
    return [];
  }
};

/**
 * Get a batch job by ID
 * @param jobId Job ID
 * @returns Batch job
 */
export const getBatchJobById = async (jobId: number): Promise<BatchJob | null> => {
  try {
    const response = await api.get(`/batch-jobs/${jobId}`);
    
    if (response.data.success) {
      return response.data.job;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting batch job:', error);
    return null;
  }
};

/**
 * Get job logs
 * @param jobId Job ID
 * @param limit Maximum number of logs to return
 * @param offset Offset for pagination
 * @returns Array of job logs
 */
export const getJobLogs = async (
  jobId: number,
  limit: number = 100,
  offset: number = 0
): Promise<BatchJobLog[]> => {
  try {
    const response = await api.get(`/batch-jobs/${jobId}/logs?limit=${limit}&offset=${offset}`);
    
    if (response.data.success) {
      return response.data.logs;
    }
    
    return [];
  } catch (error) {
    console.error('Error getting job logs:', error);
    return [];
  }
};

/**
 * Get job progress
 * @param jobId Job ID
 * @returns Job progress
 */
export const getJobProgress = async (jobId: number): Promise<BatchJobProgress | null> => {
  try {
    const response = await api.get(`/batch-jobs/${jobId}/progress`);
    
    if (response.data.success) {
      return response.data.progress;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting job progress:', error);
    return null;
  }
};

/**
 * Get queue statistics
 * @returns Queue statistics
 */
export const getQueueStats = async (): Promise<QueueStats | null> => {
  try {
    const response = await api.get('/batch-jobs/queue/stats');
    
    if (response.data.success) {
      return response.data.stats;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return null;
  }
};
