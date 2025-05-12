# Step 4: Update List Processing Logic (server/controllers/ListController.ts)

The ListController needs to be modified to create parent jobs for lists and split them into child jobs for parallel processing. This involves updating the `processList` and `processMultipleLists` methods.

## Changes Required

### 1. Update processList method

Replace the current `processList` method with this version that creates parent and child jobs:

```typescript
/**
 * Process a list (excluding specified duplicates)
 */
async processList(req: Request, res: Response): Promise<void> {
  console.log('ListController.processList called with listId:', req.params.listId);
  try {
    const listId = parseInt(req.params.listId);
    const excludeRadarIds = req.body.excludeRadarIds || [];
    const leadCount = req.body.leadCount ? parseInt(req.body.leadCount) : undefined;
    const campaignId = req.body.campaignId ? parseInt(req.body.campaignId) : undefined;
    const batchSize = req.body.batchSize || 400; // Default batch size
    
    console.log(`Processing list ${listId} with ${excludeRadarIds.length} excluded RadarIDs, leadCount: ${leadCount || 'all'}, campaignId: ${campaignId || 'none'}`);
    
    // Get all items from the list
    const items = await this.listService.getAllListItems(listId);
    console.log(`Retrieved ${items.length} items from list ${listId}`);
    
    // Filter out excluded RadarIDs
    let filteredRadarIds = items
      .map(item => item.RadarID)
      .filter(id => !excludeRadarIds.includes(id));
    
    console.log(`After filtering, ${filteredRadarIds.length} items remain to be processed`);
    
    // Apply lead count limit if specified
    if (leadCount && leadCount > 0 && leadCount < filteredRadarIds.length) {
      console.log(`Limiting to ${leadCount} leads as requested`);
      filteredRadarIds = filteredRadarIds.slice(0, leadCount);
    }
    
    if (filteredRadarIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No properties to process after exclusions'
      });
      return;
    }
    
    // Create a parent job for the full list
    const parentJob = await this.batchJobService.createParentJob({
      status: 'PENDING',
      criteria: {
        RadarID: filteredRadarIds,
        sourceListId: listId,
        campaign_id: campaignId
      },
      total_records: filteredRadarIds.length,
      processed_records: 0,
      created_by: req.body.userId || 'system',
      priority: 1,
      is_parent: true
    });
    
    console.log(`Created parent job ${parentJob.job_id} for ${filteredRadarIds.length} properties`);
    
    // Create child jobs for each batch
    const childJobs = await this.batchJobService.createChildJobsFromList(
      parentJob.job_id!,
      parentJob.criteria,
      batchSize,
      req.body.userId || 'system'
    );
    
    console.log(`Created ${childJobs.length} child jobs for parent job ${parentJob.job_id}`);
    
    res.json({
      success: true,
      parentJobId: parentJob.job_id,
      childJobs: childJobs.length,
      processedCount: filteredRadarIds.length,
      excludedCount: excludeRadarIds.length,
      campaignId: campaignId
    });
  } catch (error) {
    console.error('Error in processList:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process list',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### 2. Update processMultipleLists method

Replace the current `processMultipleLists` method with this version that supports parent-child job creation:

```typescript
/**
 * Process multiple lists (excluding specified duplicates)
 */
async processMultipleLists(req: Request, res: Response): Promise<void> {
  console.log('ListController.processMultipleLists called');
  try {
    const { listIds, excludeRadarIds = [], campaignId, newCampaign, leadCount } = req.body;
    const batchSize = req.body.batchSize || 400; // Default batch size
    
    if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid or empty listIds array'
      });
      return;
    }
    
    console.log(`Processing ${listIds.length} lists with ${excludeRadarIds.length} excluded RadarIDs, leadCount: ${leadCount || 'all'}`);
    
    // Get all items from all lists
    let allItems: any[] = [];
    for (const listId of listIds) {
      const items = await this.listService.getAllListItems(listId);
      allItems = [...allItems, ...items];
    }
    
    console.log(`Retrieved ${allItems.length} total items from all lists`);
    
    // Filter out excluded RadarIDs
    let filteredRadarIds = allItems
      .map(item => item.RadarID)
      .filter(id => !excludeRadarIds.includes(id));
    
    console.log(`After filtering, ${filteredRadarIds.length} items remain to be processed`);
    
    if (filteredRadarIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No properties to process after exclusions'
      });
      return;
    }
    
    // Handle campaign creation or selection
    let finalCampaignId = campaignId;
    if (newCampaign && !campaignId) {
      // Create a new campaign
      const campaign = await this.campaignService.createCampaign(newCampaign);
      if (campaign && campaign.campaign_id) {
        finalCampaignId = campaign.campaign_id;
        console.log(`Created new campaign with ID ${finalCampaignId}`);
      } else {
        console.error('Failed to create campaign');
      }
    }
    
    // Apply lead count limit if specified
    if (leadCount && leadCount > 0 && leadCount < filteredRadarIds.length) {
      console.log(`Limiting to ${leadCount} leads as requested`);
      filteredRadarIds = filteredRadarIds.slice(0, leadCount);
    }
    
    // Create a parent job for the full list
    const parentJob = await this.batchJobService.createParentJob({
      status: 'PENDING',
      criteria: {
        RadarID: filteredRadarIds,
        sourceListIds: listIds,
        campaignId: finalCampaignId
      },
      total_records: filteredRadarIds.length,
      processed_records: 0,
      created_by: req.body.userId || 'system',
      priority: 1,
      is_parent: true
    });
    
    console.log(`Created parent job ${parentJob.job_id} for ${filteredRadarIds.length} properties`);
    
    // Create child jobs for each batch
    const childJobs = await this.batchJobService.createChildJobsFromList(
      parentJob.job_id!,
      parentJob.criteria,
      batchSize,
      req.body.userId || 'system'
    );
    
    console.log(`Created ${childJobs.length} child jobs for parent job ${parentJob.job_id}`);
    
    res.json({
      success: true,
      parentJobId: parentJob.job_id,
      childJobs: childJobs.length,
      campaignId: finalCampaignId,
      processedCount: filteredRadarIds.length,
      excludedCount: excludeRadarIds.length
    });
  } catch (error) {
    console.error('Error in processMultipleLists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process lists',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}