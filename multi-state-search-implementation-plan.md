# Implementation Plan: Multi-State Search for PropertyRadar API

## Overview

This document outlines the implementation plan for enhancing our PropertyRadar API integration to support multi-state searches. Currently, the UI allows users to select multiple states, but the PropertyRadar API can only process one state at a time. This plan details the necessary changes to make multiple API calls (one per state) and combine the results into a single batch job.

## Goals

1. Allow users to select multiple states in the UI (already implemented)
2. Process each selected state as a separate API call to PropertyRadar
3. Combine results from multiple state queries into a single batch job
4. Ensure batch job details and campaign notes include all selected states
5. Maintain accurate tracking of which properties came from which state query

## Implementation Phases

### Phase 1: Backend Service Modifications

#### 1.1 Update PropertyRadarCriteriaInput Interface

**File:** `property-data-tester/server/services/lead-providers/propertyradar/types.ts`

Change the `state` property to accept an array of strings:

```typescript
export interface PropertyRadarCriteriaInput {
  state?: string | string[];  // Modified to accept array of states
  // other fields remain the same
}
```

#### 1.2 Modify PropertyRadarCriteriaMapper

**File:** `property-data-tester/server/services/lead-providers/propertyradar/PropertyRadarCriteriaMapper.ts`

Update the state handling logic to work with arrays:

```typescript
// Add state if present
if (criteriaObj.state) {
  if (Array.isArray(criteriaObj.state)) {
    // Store the full array for reference, but we'll process one state at a time
    result.push({
      name: "State",
      value: [criteriaObj.state[0]]  // Use first state for initial query
    });
  } else {
    result.push({
      name: "State",
      value: [criteriaObj.state]
    });
  }
}
```

#### 1.3 Enhance PropertyBatchService

**File:** `property-data-tester/server/services/PropertyBatchService.ts`

Add functionality to handle multiple states:

```typescript
/**
 * Get properties with support for multiple states
 * @param criteria Search criteria
 * @param limit Maximum number of results per state
 * @param offset Offset for pagination
 * @returns Combined batch of properties from all states
 */
async getPropertiesMultiState(
  criteria: Record<string, any>,
  limit: number = 400,
  offset: number = 0
): Promise<PropertyBatchResult> {
  try {
    let allProperties: any[] = [];
    let totalCount = 0;
    let hasMore = false;
    
    // Extract states from criteria
    const states = Array.isArray(criteria.state) ? criteria.state : [criteria.state];
    
    // Process each state
    for (const state of states) {
      // Create a copy of criteria with just this state
      const stateCriteria = { ...criteria, state };
      
      // Get properties for this state
      const stateResult = await this.getProperties(stateCriteria, limit, offset);
      
      // Add properties to combined result
      allProperties = [...allProperties, ...stateResult.properties];
      
      // Update total count
      totalCount += stateResult.totalCount || 0;
      
      // If any state has more results, the combined result has more
      hasMore = hasMore || stateResult.hasMore;
      
      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return {
      properties: allProperties,
      hasMore,
      totalCount
    };
  } catch (error) {
    console.error('Error getting properties from multiple states:', error);
    return {
      properties: [],
      hasMore: false,
      totalCount: 0
    };
  }
}
```

#### 1.4 Update JobQueueService

**File:** `property-data-tester/server/services/JobQueueService.ts`

Modify the `processJob` method to use the new multi-state functionality:

```typescript
private async processJob(job: BatchJob): Promise<void> {
  try {
    const { criteria, job_id: jobId } = job;
    const batchSize = 400; // Default batch size
    
    // Update job status to PROCESSING
    await this.batchJobService.updateJobStatus(jobId!, 'PROCESSING');
    await this.batchJobService.logJobProgress(jobId!, 'Job started processing');
    
    // Check if this is a multi-state query
    const isMultiState = Array.isArray(criteria.state) && criteria.state.length > 1;
    
    if (isMultiState) {
      await this.batchJobService.logJobProgress(
        jobId!, 
        `Processing multi-state query for states: ${criteria.state.join(', ')}`
      );
      
      // Get total count across all states
      const totalCountResult = await this.propertyService.getEstimatedCount(criteria);
      const totalCount = totalCountResult.count || 0;
      
      // Update job with total count
      await this.batchJobService.updateJobProgress(jobId!, 0, totalCount, 0, 0);
      
      // Process in batches using multi-state method
      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;
      let hasMoreRecords = true;
      let startIndex = 0;
      
      while (hasMoreRecords) {
        await this.batchJobService.logJobProgress(
          jobId!, 
          `Fetching batch starting at index ${startIndex} across ${criteria.state.length} states`
        );
        
        const batchResult = await this.propertyService.getPropertiesMultiState(
          criteria,
          batchSize,
          startIndex
        );
        
        // Process the rest of the batch as before...
        // [existing batch processing code]
      }
    } else {
      // Process single state query using existing method
      // [existing single state processing code]
    }
    
    // Mark job as completed
    // [existing completion code]
  } catch (error: any) {
    // [existing error handling code]
  }
}
```

### Phase 2: Data Model Enhancements

#### 2.1 Update BatchJob Model

**File:** `property-data-tester/server/models/BatchJob.ts`

Add a field to track the original states for multi-state queries:

```typescript
export interface BatchJob {
  // existing fields
  original_states?: string[];  // Track original states for multi-state queries
}
```

#### 2.2 Update BatchJobRepository

**File:** `property-data-tester/server/repositories/BatchJobRepository.ts`

Add support for storing and retrieving the original states:

```typescript
async createJob(job: BatchJob): Promise<BatchJob> {
  // Extract original states if present in criteria
  const originalStates = Array.isArray(job.criteria.state) ? job.criteria.state : undefined;
  
  // Create job with original states if applicable
  const query = `
    INSERT INTO batch_jobs (
      status, criteria, created_by, priority, original_states
    ) VALUES (
      $1, $2, $3, $4, $5
    ) RETURNING *
  `;
  
  const result = await this.pool.query(query, [
    job.status,
    JSON.stringify(job.criteria),
    job.created_by,
    job.priority || 0,
    originalStates ? JSON.stringify(originalStates) : null
  ]);
  
  return result.rows[0];
}
```

### Phase 3: Frontend Enhancements

#### 3.1 Update BatchJobDetails Component

**File:** `property-data-tester/src/components/BatchJobDetails.tsx`

Enhance the display of job details to show all states:

```tsx
// Format criteria as string with special handling for states
const formatCriteria = (criteria: Record<string, any>, originalStates?: string[]): string => {
  try {
    // If we have original states, ensure they're displayed properly
    if (originalStates && originalStates.length > 0) {
      const criteriaCopy = { ...criteria };
      criteriaCopy.state = originalStates;
      return JSON.stringify(criteriaCopy, null, 2);
    }
    return JSON.stringify(criteria, null, 2);
  } catch (err) {
    return 'Invalid criteria format';
  }
};

// In the render function:
<pre className="bg-light p-2 rounded">
  {formatCriteria(job.criteria, job.original_states)}
</pre>
```

#### 3.2 Update BatchJobService (Frontend)

**File:** `property-data-tester/src/services/batchJob.service.ts`

Update the service to handle the new original_states field:

```typescript
export interface BatchJob {
  // existing fields
  original_states?: string[];
}

// Update the API call functions to handle the new field
```

## Database Schema Updates

Add the original_states column to the batch_jobs table:

```sql
ALTER TABLE batch_jobs 
ADD COLUMN original_states JSONB;
```

## Testing Plan

1. **Unit Tests:**
   - Test PropertyRadarCriteriaMapper with multiple states
   - Test PropertyBatchService.getPropertiesMultiState with various state combinations
   - Test JobQueueService with multi-state criteria

2. **Integration Tests:**
   - Test end-to-end flow from UI selection to API calls to database storage
   - Verify that all states are properly tracked and displayed

3. **Manual Testing Scenarios:**
   - Select multiple states and verify separate API calls are made
   - Verify combined results are displayed correctly
   - Verify batch job details show all selected states
   - Test with various combinations of states and other criteria

## Rollout Plan

1. **Development Phase:**
   - Implement backend changes
   - Update database schema
   - Implement frontend changes
   - Write tests

2. **Testing Phase:**
   - Run unit and integration tests
   - Perform manual testing
   - Fix any issues discovered

3. **Deployment:**
   - Deploy database schema changes
   - Deploy backend changes
   - Deploy frontend changes
   - Monitor for any issues

4. **Post-Deployment:**
   - Verify functionality in production
   - Monitor API usage and performance
   - Collect user feedback

## Timeline

| Phase | Task | Estimated Duration |
|-------|------|-------------------|
| 1 | Backend Service Modifications | 3 days |
| 2 | Data Model Enhancements | 2 days |
| 3 | Frontend Enhancements | 2 days |
| 4 | Database Schema Updates | 1 day |
| 5 | Testing | 3 days |
| 6 | Deployment | 1 day |
| 7 | Post-Deployment Monitoring | 2 days |

**Total Estimated Time:** 2 weeks

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PropertyRadar API rate limits | Could slow down multi-state queries | Implement backoff strategy and delay between requests |
| Increased database load | Could affect performance | Monitor database performance, optimize queries |
| UI complexity | Could confuse users | Add clear indicators of multi-state processing |
| Data inconsistency | Could lead to incorrect results | Implement robust error handling and validation |

## Success Criteria

1. Users can select multiple states in the UI
2. System makes separate API calls for each selected state
3. Results are combined into a single batch job
4. Batch job details show all selected states
5. Campaign notes include all criteria used, including all states
6. Performance remains acceptable even with multiple API calls

## Future Enhancements

1. Parallel processing of state queries for improved performance
2. Caching of results to reduce API calls
3. More granular progress tracking per state
4. Enhanced UI to show progress of multi-state queries