type DuplicateCheckJobStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

interface DuplicateCheckJob {
  jobId: string;
  status: DuplicateCheckJobStatus;
  totalBatches: number;
  completedBatches: number;
  result: any[] | null;
  partialResults: any[]; // Store partial results for incremental UI updates
  error?: string;
}

export class DuplicateCheckJobService {
  private jobs: Map<string, DuplicateCheckJob> = new Map();

  createJob(totalBatches: number): string {
    const jobId = Math.random().toString(36).substring(2, 10);
    this.jobs.set(jobId, {
      jobId,
      status: 'pending',
      totalBatches,
      completedBatches: 0,
      result: null,
      partialResults: [],
    });
    return jobId;
  }

  setJobInProgress(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job) job.status = 'in_progress';
  }

  incrementBatch(jobId: string, partialBatch: any[]) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.completedBatches += 1;
      job.partialResults = job.partialResults.concat(partialBatch);
    }
  }

  setJobCompleted(jobId: string, result: any[]) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.result = result;
    }
  }

  setJobFailed(jobId: string, error: string) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error;
    }
  }

  getJob(jobId: string): DuplicateCheckJob | undefined {
    return this.jobs.get(jobId);
  }

  // Optional: cleanup old jobs
  deleteJob(jobId: string) {
    this.jobs.delete(jobId);
  }
}

export const duplicateCheckJobService = new DuplicateCheckJobService();
