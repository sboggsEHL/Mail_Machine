# Step 3: Update Service Layer (server/services/BatchJobService.ts)

The BatchJobService needs to be enhanced to support parent-child relationships between jobs, including methods for creating parent jobs, creating child jobs from lists, tracking progress across child jobs, and managing the completion of parent jobs.

## Changes Required

### 1. Add methods for parent-child job management

Add the following methods to the `BatchJobService` class:

```typescript
/**
 * Create a parent job for a list
 * @param job The batch job data
 * @returns The created parent job
 */
async createParentJob(job: BatchJob): Promise<BatchJob> {
  return this.batchJobRepository.createParentJob(job);
}

/**
 * Create a child job for a parent job
 * @param parentJobId The parent job ID
 * @param job The batch job data
 * @param batchNumber The batch number
 * @param batchOffset The offset in the original list
 * @param batchSize The size of this batch
 * @returns The created child job
 */
async createChildJob(
  parentJobId: number,
  job: BatchJob,
  batchNumber: number,
  batchOffset: number,
  batchSize: number
): Promise<BatchJob> {
  return this.batchJobRepository.createChildJob(
    parentJobId,
    job,
    batchNumber,
    batchOffset,
    batchSize
  );
}

/**
 * Create child jobs from a list of RadarIDs
 * @param parentJobId The parent job ID
 * @param criteria The criteria with the RadarIDs to split
 * @param batchSize The size of each batch
 * @param createdBy Who created the jobs
 * @returns Array of created child jobs
 */
async createChildJobsFromList(
  parentJobId: number,
  criteria: Record<string, any>,
  batchSize: number = 400,
  createdBy: string = 'system'
): Promise<BatchJob[]> {
  // Extract the RadarIDs from the criteria
  if (!criteria.RadarID || !Array.isArray(criteria.RadarID)) {
    throw new AppError(
      ERROR_CODES.INVALID_CRITERIA,
      'Invalid criteria: RadarID array is required',
      400
    );
  }
  
  const radarIds = criteria.RadarID;
  const totalRecords = radarIds.length;
  
  // Log the batch creation process
  await this.logJobProgress(
    parentJobId,
    `Creating child jobs for ${totalRecords} properties with batch size ${batchSize}`
  );
  
  const childJobs: BatchJob[] = [];
  
  // Split the list into batches
  for (let offset = 0; offset < totalRecords; offset += batchSize) {
    const batchNumber = Math.floor(offset / batchSize) + 1;
    const batchRadarIds = radarIds.slice(offset, offset + batchSize);
    const actualBatchSize = batchRadarIds.length;
    
    // Create a new criteria object with just this batch's RadarIDs
    const batchCriteria = { ...criteria, RadarID: batchRadarIds };
    
    // Create a child job for this batch
    const childJob = await this.createChildJob(
      parentJobId,
      {
        status: 'PENDING',
        criteria: batchCriteria,
        total_records: actualBatchSize,
        processed_records: 0,
        created_by: createdBy,
        priority: criteria.priority || 0
      },
      batchNumber,
      offset,
      actualBatchSize
    );
    
    childJobs.push(childJob);
    
    // Log the creation of this batch job
    await this.logJobProgress(
      parentJobId,
      `Created child job ${childJob.job_id} for batch ${batchNumber} with ${actualBatchSize} properties`
    );
  }
  
  // Log completion of batch creation
  await this.logJobProgress(
    parentJobId,
    `Created ${childJobs.length} child jobs for parent job ${parentJobId}`
  );
  
  return childJobs;
}

/**
 * Get all child jobs for a parent job
 * @param parentJobId The parent job ID
 * @returns Array of child jobs
 */
async getChildJobs(parentJobId: number): Promise<BatchJob[]> {
  return this.batchJobRepository.getChildJobs(parentJobId);
}

/**
 * Update parent job progress based on child jobs
 * @param parentJobId The parent job ID
 * @returns The updated parent job
 */
async updateParentJobProgress(parentJobId: number): Promise<BatchJob | null> {
  return this.batchJobRepository.updateParentJobProgress(parentJobId);
}

/**
 * Check and update parent job status based on child jobs
 * @param parentJobId The parent job ID
 * @returns The updated parent job or null if no update needed
 */
async updateParentJobStatus(parentJobId: number): Promise<BatchJob | null> {
  const statusCounts = await this.batchJobRepository.getChildJobStatusCounts(parentJobId);
  
  // Log the current status of child jobs
  await this.logJobProgress(
    parentJobId,
    `Child jobs status: ${statusCounts.completed} completed, ${statusCounts.failed} failed, ${statusCounts.processing} processing, ${statusCounts.pending} pending out of ${statusCounts.total} total`
  );
  
  const updatedParentJob = await this.batchJobRepository.updateParentJobStatus(parentJobId);
  
  if (updatedParentJob && updatedParentJob.status === 'COMPLETED') {
    // If the parent job was just completed, log it
    await this.logJobProgress(
      parentJobId,
      `All child jobs processed. Job completed with ${updatedParentJob.success_count} successes and ${updatedParentJob.error_count} errors.`,
      updatedParentJob.error_count > 0 ? 'WARNING' : 'INFO'
    );
  }
  
  return updatedParentJob;
}

/**
 * Check if a job is a parent job
 * @param jobId The job ID
 * @returns True if the job is a parent job
 */
async isParentJob(jobId: number): Promise<boolean> {
  const job = await this.getJobById(jobId);
  return job.is_parent === true;
}
```

### 2. Add a method to handle batch-specific processing

```typescript
/**
 * Process a specific batch of a list based on batch information
 * @param job The child job containing batch information
 * @param propertyService The property batch service to use for processing
 * @returns The result of processing the batch
 */
async processBatch(job: BatchJob, propertyService: any): Promise<{
  processedCount: number;
  successCount: number;
  errorCount: number;
}> {
  if (!job.batch_offset && job.batch_offset !== 0 || !job.batch_size) {
    throw new AppError(
      ERROR_CODES.INVALID_BATCH_INFO,
      'Missing batch information in job',
      400
    );
  }
  
  // Extract batch-specific RadarIDs from the job criteria
  const batchRadarIds = job.criteria.RadarID;
  
  if (!batchRadarIds || !Array.isArray(batchRadarIds)) {
    throw new AppError(
      ERROR_CODES.INVALID_CRITERIA,
      'Invalid batch criteria: RadarID array is required',
      400
    );
  }
  
  // Log the start of batch processing
  await this.logJobProgress(
    job.job_id!,
    `Processing batch ${job.batch_number} with ${batchRadarIds.length} properties`
  );
  
  // Call the property service to process just this batch
  const result = await propertyService.processPropertyBatch(
    job.job_id!.toString(),
    batchRadarIds,
    job.criteria
  );
  
  // Update this job's progress
  await this.updateJobProgress(
    job.job_id!,
    result.processedCount,
    batchRadarIds.length,
    result.successCount,
    result.errorCount
  );
  
  // Log completion of this batch
  await this.logJobProgress(
    job.job_id!,
    `Completed batch ${job.batch_number}: Processed ${result.processedCount} properties with ${result.successCount} successes and ${result.errorCount} errors`
  );
  
  // If this job has a parent, update the parent's progress
  if (job.parent_job_id) {
    await this.updateParentJobProgress(job.parent_job_id);
    await this.updateParentJobStatus(job.parent_job_id);
  }
  
  return result;
}