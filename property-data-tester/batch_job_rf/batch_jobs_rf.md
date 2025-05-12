Required File Modifications
1. Update Models (server/models/BatchJob.ts)
Add fields for parent-child relationship:

export interface BatchJob {
  job_id?: number;
  parent_job_id?: number;  // New field for child jobs
  is_parent?: boolean;     // Flag to indicate if this is a parent job
  batch_number?: number;   // For tracking which batch this is
  batch_offset?: number;   // Starting index for this batch
  batch_size?: number;     // Size of this batch
  // ... existing fields
}

typescript


2. Update Repository (server/repositories/BatchJobRepository.ts)
Add methods for:

Creating parent jobs
Creating child jobs
Getting child jobs for a parent
Updating parent job progress based on children
3. Update Service Layer (server/services/BatchJobService.ts)
Add methods for:

Creating parent/child job relationships
Tracking overall progress across child jobs
Completing parent jobs when all children are done
4. Update List Processing Logic (server/controllers/ListController.ts)
Modify the processList and processMultipleLists methods to:

Create a parent job for the overall list
Split the list into batches of 400 records
Create child jobs for each batch with references to the parent
5. Update Job Queue Service (server/services/JobQueueService.ts)
Modify the service to:

Process individual batch/child jobs
Update parent job progress as children complete
Mark parent job as complete when all children are done
Detailed Implementation Steps
Step 1: Create SQL Migration Script
Create a migration script to update the database schema.

Step 2: Update BatchJob Model
Update the model to include the new fields required for parent-child relationships.

Step 3: Update BatchJobRepository
Add methods for managing parent and child jobs:

async createParentJob(job: BatchJob): Promise<BatchJob> {
  // Set is_parent to true
  const parentJob = { ...job, is_parent: true };
  return this.createJob(parentJob);
}

async createChildJob(parentJobId: number, job: BatchJob, batchNumber: number, 
                    batchOffset: number, batchSize: number): Promise<BatchJob> {
  const childJob = { 
    ...job, 
    parent_job_id: parentJobId,
    batch_number: batchNumber,
    batch_offset: batchOffset,
    batch_size: batchSize
  };
  return this.createJob(childJob);
}

async getChildJobs(parentJobId: number): Promise<BatchJob[]> {
  // Get all child jobs for a parent
}

async updateParentJobProgress(parentJobId: number): Promise<BatchJob | null> {
  // Calculate total progress from child jobs and update parent
}

typescript



Step 4: Update BatchJobService
Add methods for managing parent-child relationship:

async createParentJob(job: BatchJob): Promise<BatchJob> {
  return this.batchJobRepository.createParentJob(job);
}

async createChildJobsFromList(parentJobId: number, criteria: any, 
                             batchSize: number = 400): Promise<BatchJob[]> {
  // Logic to split list and create child jobs
}

async updateParentJobProgress(parentJobId: number): Promise<BatchJob | null> {
  return this.batchJobRepository.updateParentJobProgress(parentJobId);
}

async checkAndCompleteParentJob(parentJobId: number): Promise<void> {
  // Check if all child jobs are complete and update parent if necessary
}

typescript



Step 5: Update ListController
Modify the process list methods to create parent and child jobs:

// In processList and processMultipleLists
// Create parent job
const parentJob = await this.batchJobService.createParentJob({
  status: 'PENDING',
  criteria: {
    RadarID: filteredRadarIds,
    sourceListId: listId,
    campaign_id: campaignId
  },
  created_by: req.body.userId || 'system',
  priority: 1,
  is_parent: true
});

// Create child jobs (one per batch)
const childJobs = await this.batchJobService.createChildJobsFromList(
  parentJob.job_id!,
  parentJob.criteria,
  400 // batch size
);

typescript


Step 6: Update JobQueueService
Modify the service to handle parent and child jobs correctly:

private async processJob(job: BatchJob): Promise<void> {
  // Check if this is a parent job - if so, skip direct processing
  if (job.is_parent) {
    await this.batchJobService.updateParentJobProgress(job.job_id!);
    return;
  }
  
  // Process this child job normally
  // Use batch_offset and batch_size to process just this batch
  
  // After processing, update parent progress
  if (job.parent_job_id) {
    await this.batchJobService.updateParentJobProgress(job.parent_job_id);
    await this.batchJobService.checkAndCompleteParentJob(job.parent_job_id);
  }
}