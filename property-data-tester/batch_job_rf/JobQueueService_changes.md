# Step 5: Update Job Queue Service (server/services/JobQueueService.ts)

The JobQueueService needs to be modified to handle parent and child jobs correctly, including processing individual batch jobs, updating parent job progress as children complete, and marking parent jobs as complete when all children are done.

## Changes Required

### 1. Update the processJob method

Replace the current `processJob` method with this version that handles parent vs. child jobs:

```typescript
/**
 * Process a job
 * @param job The job to process
 */
private async processJob(job: BatchJob): Promise<void> {
  try {
    // Check if this is a parent job - if so, just update its progress
    if (job.is_parent) {
      await this.batchJobService.logJobProgress(job.job_id!, 'Parent job - updating progress only');
      await this.batchJobService.updateParentJobProgress(job.job_id!);
      await this.batchJobService.updateParentJobStatus(job.job_id!);
      return;
    }

    const { criteria, job_id: jobId } = job;
    
    // Update job status to PROCESSING
    await this.batchJobService.updateJobStatus(jobId!, 'PROCESSING');
    await this.batchJobService.logJobProgress(jobId!, 'Job started processing');
    
    // Check if this is a child job
    if (job.parent_job_id) {
      await this.batchJobService.logJobProgress(
        jobId!,
        `Processing as child job for parent ${job.parent_job_id}, batch ${job.batch_number}`
      );
    }
    
    // For child jobs, use the batch-specific processing
    if (job.parent_job_id && job.batch_number && job.batch_size) {
      // Process just this batch
      await this.processBatchJob(job);
    } else {
      // For backward compatibility, process as a regular job
      await this.processRegularJob(job);
    }
    
    // Mark job as completed
    await this.batchJobService.updateJobStatus(jobId!, 'COMPLETED');
    
    // If this is a child job, update the parent's progress
    if (job.parent_job_id) {
      await this.batchJobService.updateParentJobProgress(job.parent_job_id);
      await this.batchJobService.updateParentJobStatus(job.parent_job_id);
    }
    
  } catch (error: any) {
    // Log error and update job status
    logger.error(`Job ${job.job_id} failed:`, error);
    await this.batchJobService.updateJobStatus(job.job_id!, 'FAILED', error.message);
    await this.batchJobService.logJobProgress(job.job_id!, `Job failed: ${error.message}`, 'ERROR');
    
    // If this is a child job, update the parent's progress even after failure
    if (job.parent_job_id) {
      await this.batchJobService.updateParentJobProgress(job.parent_job_id);
      await this.batchJobService.updateParentJobStatus(job.parent_job_id);
    }
    
    throw error;
  }
}
```

### 2. Add method for processing batch jobs

Add a new method for processing batch (child) jobs:

```typescript
/**
 * Process a batch job (child job)
 * @param job The batch job to process
 */
private async processBatchJob(job: BatchJob): Promise<void> {
  try {
    const { criteria, job_id: jobId, batch_number: batchNumber } = job;
    
    // Get batch-specific IDs from criteria
    const batchRadarIds = criteria.RadarID;
    if (!batchRadarIds || !Array.isArray(batchRadarIds)) {
      throw new Error('Invalid batch criteria: RadarID array required');
    }
    
    await this.batchJobService.logJobProgress(
      jobId!,
      `Processing batch ${batchNumber} with ${batchRadarIds.length} properties`
    );
    
    // Update job with total count for this batch
    const totalCount = batchRadarIds.length;
    await this.batchJobService.updateJobProgress(jobId!, 0, totalCount, 0, 0);
    
    // Process and store the properties
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // Add batch job criteria to each property
    const propertiesWithCriteria = batchRadarIds.map(radarId => ({
      RadarID: radarId,
      batchJobCriteria: criteria
    }));
    
    // Use the provider code from criteria or default to PR
    let providerCode = criteria.provider_code || this.propertyService.getProviderCode();
    
    try {
      // Process the batch properties
      // Use the saveProperties method to save to database
      const savedProperties = await this.propertyService.saveProperties(
        providerCode,
        propertiesWithCriteria
      );
      
      processedCount = batchRadarIds.length;
      successCount = savedProperties.length;
      errorCount = batchRadarIds.length - savedProperties.length;
      
      await this.batchJobService.logJobProgress(
        jobId!,
        `Batch ${batchNumber}: Processed ${processedCount} properties with ${successCount} successes and ${errorCount} errors`
      );
    } catch (error) {
      logger.error('Error processing batch:', error);
      processedCount = batchRadarIds.length;
      successCount = 0;
      errorCount = batchRadarIds.length;
      
      await this.batchJobService.logJobProgress(
        jobId!,
        `Failed to process batch ${batchNumber}: ${error instanceof Error ? error.message : String(error)}`,
        'ERROR'
      );
      throw error;
    } finally {
      // Update progress
      await this.batchJobService.updateJobProgress(
        jobId!,
        processedCount,
        totalCount,
        successCount,
        errorCount
      );
    }
  } catch (error) {
    logger.error(`Error processing batch job ${job.job_id}:`, error);
    throw error;
  }
}
```

### 3. Rename existing implementation to processRegularJob

Extract the existing implementation to a new method for backward compatibility:

```typescript
/**
 * Process a regular job (non-batch)
 * @param job The regular job to process
 */
private async processRegularJob(job: BatchJob): Promise<void> {
  try {
    const { criteria, job_id: jobId } = job;
    const batchSize = 400; // Default batch size
    
    // Get total count (could be an estimate)
    const totalCountResult = await this.propertyService.getEstimatedCount(criteria);
    const totalCount = totalCountResult.count || 0;
    
    // Update job with total count
    await this.batchJobService.updateJobProgress(jobId!, 0, totalCount, 0, 0);
    await this.batchJobService.logJobProgress(jobId!, `Estimated total records: ${totalCount}`);
    
    // Check if this job has already processed batches
    // This prevents duplicate processing if a job is restarted
    const existingBatches = await this.checkExistingBatches(jobId!.toString());
    const processedBatchNumbers = existingBatches.map(b => b.batch_number);
    
    if (existingBatches.length > 0) {
      await this.batchJobService.logJobProgress(
        jobId!,
        `Found ${existingBatches.length} existing batches (${processedBatchNumbers.join(', ')}). Will not reprocess these batches.`,
        'WARNING'
      );
    }
    
    // Process in batches
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let hasMoreRecords = true;
    let startIndex = 0;
    let batchCount = 0;
    
    while (hasMoreRecords) {
      batchCount++;
      // Only log every 5 batches to reduce logging
      const shouldLog = batchCount % 5 === 0;
      
      // Fetch batch from PropertyRadar
      if (shouldLog) {
        await this.batchJobService.logJobProgress(jobId!, `Fetching batch ${batchCount} starting at index ${startIndex}`);
      }
      
      const batchResult = await this.propertyService.getProperties(
        criteria,
        job.job_id?.toString() || 'batch-job',  // Use job_id as campaign ID
        batchSize,
        startIndex
      );
      
      // Process and store the batch
      const batchRecords = batchResult.properties || [];
      
      // Process and store the records in the database
      let batchSuccessCount = 0;
      let batchErrorCount = 0;
      
      try {
        // Add batch job criteria to each property
        const propertiesWithCriteria = batchRecords.map(property => ({
          ...property,
          batchJobCriteria: criteria
        }));
        
        // Check if provider_id is in the criteria
        let providerCode = this.propertyService.getProviderCode();
        
        // Use the saveProperties method to save to database
        const savedProperties = await this.propertyService.saveProperties(
          providerCode,
          propertiesWithCriteria
        );
      
        batchSuccessCount = savedProperties.length;
        batchErrorCount = batchRecords.length - savedProperties.length;
        
        if (shouldLog) {
          await this.batchJobService.logJobProgress(
            jobId!,
            `Batch ${batchCount}: Saved ${batchSuccessCount} properties (${batchErrorCount} errors)`
          );
        }
      } catch (error) {
        logger.error('Error saving batch to database:', error);
        batchSuccessCount = 0;
        batchErrorCount = batchRecords.length;
        
        await this.batchJobService.logJobProgress(
          jobId!,
          `Failed to save batch ${batchCount} to database: ${error instanceof Error ? error.message : String(error)}`,
          'ERROR'
        );
      }
      
      // Update counts
      processedCount += batchRecords.length;
      successCount += batchSuccessCount;
      errorCount += batchErrorCount;
      
      // Update progress
      await this.batchJobService.updateJobProgress(
        jobId!,
        processedCount,
        totalCount,
        successCount,
        errorCount
      );
      
      // Report progress only every 5 batches or at the end
      const percentComplete = Math.floor((processedCount / totalCount) * 100);
      if (shouldLog || !batchResult.hasMore) {
        await this.batchJobService.logJobProgress(
          jobId!,
          `Processed ${processedCount} of ${totalCount} records (${percentComplete}%)`
        );
      }
      
      // Check if we need to continue
      hasMoreRecords = batchResult.hasMore || false;
      startIndex += batchSize;
      
      // Add a small delay to avoid hitting rate limits
      if (hasMoreRecords) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Final log
    await this.batchJobService.logJobProgress(
      jobId!,
      `Job completed. Processed ${processedCount} records with ${successCount} successes and ${errorCount} errors.`
    );
  } catch (error: any) {
    // Log error and update job status
    logger.error(`Job ${job.job_id} failed:`, error);
    throw error;
  }
}
```

### 4. Update the acquireJob method to filter out parent jobs

Modify the acquireJob method to ensure it doesn't select parent jobs for direct processing:

```typescript
/**
 * Acquire a job for processing
 * @returns The acquired job or null if none available
 */
private async acquireJob(): Promise<BatchJob | null> {
  if (!this.pool) {
    // If pool is not provided, use the repository's getNextPendingJob method
    const job = await this.batchJobService.getNextPendingJob();
    
    if (job) {
      // Mark as processing
      await this.batchJobService.updateJobStatus(job.job_id!, 'PROCESSING');
      await this.batchJobService.incrementJobAttempt(job.job_id!);
      return job;
    }
    
    return null;
  }
  
  // Use a transaction to safely get and lock a job
  const client = await this.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get the next available job
    // IMPORTANT: We only select jobs with status 'PENDING' to prevent failed jobs from being automatically reprocessed
    // Failed jobs must be manually reset to 'PENDING' status if they need to be retried
    // Also, we now filter out parent jobs (is_parent = true)
    const result = await client.query(`
      UPDATE batch_jobs
      SET 
        status = 'PROCESSING',
        locked_at = NOW(),
        locked_by = $1,
        attempts = COALESCE(attempts, 0) + 1
      WHERE job_id = (
        SELECT job_id
        FROM batch_jobs
        WHERE 
          status = 'PENDING'
          AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
          AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '10 minutes')
          AND (is_parent = false OR is_parent IS NULL)
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `, [this.workerName]);
    
    await client.query('COMMIT');
    
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error acquiring job:', error);
    return null;
  } finally {
    client.release();
  }
}