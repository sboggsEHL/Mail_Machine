import { Request, Response } from 'express';
import { PropertyRadarListService } from '../services/PropertyRadarListService';
import { BatchJobService } from '../services/BatchJobService';
import { BatchJobRepository } from '../repositories/BatchJobRepository';
import { DnmRepository } from '../repositories/DnmRepository';
import { DnmService } from '../services/DnmService';
import { CampaignService } from '../services/CampaignService';
import { CampaignRepository } from '../repositories/CampaignRepository';
import { PropertyOwnerRepository } from '../repositories/PropertyOwnerRepository';
import { Pool } from 'pg';
import { duplicateCheckJobService } from '../services/DuplicateCheckJobService';

export class ListController {
  private listService: PropertyRadarListService;
  private batchJobService: BatchJobService;
  private campaignService: CampaignService;
  
  constructor(pool: Pool) {
    this.listService = new PropertyRadarListService(pool);
    const batchJobRepository = new BatchJobRepository(pool);
    const dnmRepository = new DnmRepository(pool);
    const dnmService = new DnmService(dnmRepository);
    this.batchJobService = new BatchJobService(batchJobRepository, dnmService);
    const campaignRepository = new CampaignRepository(pool);
    const propertyOwnerRepository = new PropertyOwnerRepository(pool);
    this.campaignService = new CampaignService(campaignRepository, propertyOwnerRepository, dnmRepository);
  }

  /**
   * Get status/progress/result of a duplicate check job
   */
  async getCheckDuplicatesJobStatus(req: Request, res: Response): Promise<void> {
    const jobId = req.params.jobId;
    const job = duplicateCheckJobService.getJob(jobId);
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    res.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      totalBatches: job.totalBatches,
      completedBatches: job.completedBatches,
      result: job.status === 'completed' ? job.result : undefined,
      error: job.status === 'failed' ? job.error : undefined,
    });
  }

  /**
   * Stream duplicate check job updates via SSE
   */
  async streamDuplicateCheck(req: Request, res: Response): Promise<void> {
    const jobId = req.params.jobId;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendUpdate = () => {
      const job = duplicateCheckJobService.getJob(jobId);
      if (!job) {
        res.write(`event: error\ndata: Job not found\n\n`);
        clearInterval(interval);
        res.end();
        return;
      }
      res.write(`data: ${JSON.stringify(job)}\n\n`);
      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(interval);
        res.end();
      }
    };

    const interval = setInterval(sendUpdate, 2000);
    req.on('close', () => clearInterval(interval));
  }

  /**
   * Start duplicate check as a background job and return jobId
   */
  async startCheckDuplicatesJob(req: Request, res: Response): Promise<void> {
    try {
      const listId = parseInt(req.params.listId);
      if (isNaN(listId)) {
        res.status(400).json({ success: false, error: 'Invalid list ID' });
        return;
      }
      // Get all items for the list (fetch ALL)
      const items = await this.listService.getAllListItems(listId);

      // For the new single-query method we treat the whole list as one batch
      const jobId = duplicateCheckJobService.createJob(1);
      res.json({ success: true, jobId });

      // Start background processing
      (async () => {
        try {
          duplicateCheckJobService.setJobInProgress(jobId);
          const mergedProperties = await this.listService.checkDuplicatesAll(items);

          duplicateCheckJobService.incrementBatch(jobId, mergedProperties);
          duplicateCheckJobService.setJobCompleted(jobId, mergedProperties);
        } catch (err: any) {
          duplicateCheckJobService.setJobFailed(jobId, err?.message || 'Unknown error');
        }
      })();
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to start duplicate check job' });
    }
  }

  /**
   * Download duplicates as CSV for a list
   */
  async downloadDuplicatesCsv(req: Request, res: Response): Promise<void> {
    try {
      const listId = parseInt(req.params.listId);
      if (isNaN(listId)) {
        res.status(400).json({ success: false, error: 'Invalid list ID' });
        return;
      }

      // Get all items for the list
      const items = await this.listService.getAllListItems(listId);

      if (!items.length) {
        res.status(404).json({ success: false, error: 'No items found for this list' });
        return;
      }

      // Find duplicates using the new method
      const allResults = await this.listService.checkDuplicatesAll(items);
      const duplicateRadarIds = allResults.filter(r => r.is_duplicate).map(r => r.radar_id);

      if (!duplicateRadarIds.length) {
        res.status(404).json({ success: false, error: 'No duplicates found for this list' });
        return;
      }

      const leads = allResults.filter(r => r.is_duplicate);
      const columns = ['address', 'city', 'state', 'zip_code', 'radar_id'];
      const header = columns.join(',');
      const rows = leads.map((row: any) =>
        columns.map(col => {
          const value = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );
      const csv = [header, ...rows].join('\r\n');

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="list_${listId}_duplicates.csv"`);
      res.status(200).send(csv);
    } catch (error) {
      console.error('Error downloading duplicates CSV:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download duplicates CSV'
      });
    }
  }
  
  /**
   * Get all PropertyRadar lists
   */
  async getLists(req: Request, res: Response): Promise<void> {
    console.log('ListController.getLists called');
    try {
      const lists = await this.listService.getLists();
      console.log('Lists fetched successfully:', lists);
      res.json({
        success: true,
        lists: lists
      });
    } catch (error) {
      console.error('Error in getLists:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch lists'
      });
    }
  }
  
  /**
   * Get items from a specific list
   */
  async getListItems(req: Request, res: Response): Promise<void> {
    console.log('ListController.getListItems called with listId:', req.params.listId);
    try {
      const listId = parseInt(req.params.listId);
      const start = req.query.start ? parseInt(req.query.start as string) : 0;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
      
      const items = await this.listService.getListItems(listId, start, limit);
      console.log(`Retrieved ${items.length} items from list ${listId}`);
      
      res.json({
        success: true,
        items: items,
        hasMore: items.length === limit
      });
    } catch (error) {
      console.error('Error in getListItems:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch list items',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Check for duplicates in a list
   */
  async checkDuplicates(req: Request, res: Response): Promise<void> {
    console.log('ListController.checkDuplicates called with listId:', req.params.listId);
    try {
      const listId = parseInt(req.params.listId);

      // Get all items from the list
      const items = await this.listService.getAllListItems(listId);
      console.log(`Retrieved ${items.length} items from list ${listId}`);
      const allRadarIds = items.map(item => item.RadarID);

      // Process all radar IDs at once for better performance
      console.log(`Processing all ${allRadarIds.length} items at once for better performance`);
      const allDuplicates = await this.listService.checkDuplicates(allRadarIds);
      console.log(`Found ${allDuplicates.length} duplicates out of ${allRadarIds.length} items`);

      res.json({
        success: true,
        totalItems: allRadarIds.length,
        duplicateCount: allDuplicates.length,
        duplicates: allDuplicates
      });
    } catch (error) {
      console.error('Error in checkDuplicates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check duplicates',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
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
      
      // Create a batch job with the filtered RadarIDs
      const job = await this.batchJobService.createJob({
        status: 'PENDING',
        criteria: {
          RadarID: filteredRadarIds,
          sourceListId: listId,
          campaign_id: campaignId // Include campaign ID if provided
        },
        created_by: req.body.userId || 'system',
        priority: 1
      });
      
      console.log(`Created batch job ${job.job_id} with ${filteredRadarIds.length} properties${campaignId ? ` and campaign ID ${campaignId}` : ''}`);
      
      res.json({
        success: true,
        jobId: job.job_id,
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
  
  /**
   * Check for duplicates in a batch of radar IDs
   */
  async checkDuplicatesBatch(req: Request, res: Response): Promise<void> {
    console.log('ListController.checkDuplicatesBatch called with listId:', req.params.listId);
    try {
      const listId = parseInt(req.params.listId);
      const { radarIds } = req.body;
      
      if (!radarIds || !Array.isArray(radarIds)) {
        res.status(400).json({
          success: false,
          error: 'Invalid radarIds array'
        });
        return;
      }
      
      console.log(`Checking ${radarIds.length} radar IDs for duplicates`);
      
      // Check for duplicates
      const duplicates = await this.listService.checkDuplicates(radarIds);
      console.log(`Found ${duplicates.length} duplicates out of ${radarIds.length} items`);
      
      res.json({
        success: true,
        totalItems: radarIds.length,
        duplicateCount: duplicates.length,
        duplicates
      });
    } catch (error) {
      console.error('Error in checkDuplicatesBatch:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check duplicates',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Process multiple lists (excluding specified duplicates)
   */
  async processMultipleLists(req: Request, res: Response): Promise<void> {
    console.log('ListController.processMultipleLists called');
    try {
      const { listIds, excludeRadarIds = [], campaignId, newCampaign, leadCount } = req.body;
      
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
      const filteredRadarIds = allItems
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
      
      // Create a batch job with the filtered RadarIDs and campaign ID
      const job = await this.batchJobService.createJob({
        status: 'PENDING',
        criteria: {
          RadarID: filteredRadarIds,
          sourceListIds: listIds,
          campaignId: finalCampaignId,
          // Apply lead count limit if specified
          ...(leadCount && leadCount > 0 && leadCount < filteredRadarIds.length ? { leadCount } : {})
        },
        created_by: req.body.userId || 'system',
        priority: 1
      });
      
      console.log(`Created batch job ${job.job_id} with ${filteredRadarIds.length} properties`);
      
      res.json({
        success: true,
        jobId: job.job_id,
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

  /**
   * Create a new list
   */
  async createList(req: Request, res: Response): Promise<void> {
    console.log('ListController.createList called');
    try {
      const { criteria, listName, listType = 'static', isMonitored = 0 } = req.body;
      
      if (!criteria || !listName) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters'
        });
        return;
      }
      
      // Validate list name
      if (!listName.trim()) {
        res.status(400).json({
          success: false,
          error: 'List name cannot be empty'
        });
        return;
      }
      
      const listData = {
        Criteria: criteria,
        ListName: listName,
        ListType: listType,
        isMonitored: isMonitored
      };
      
      console.log(`Creating list "${listName}" with type ${listType}`);
      const createdList = await this.listService.createList(listData);
      console.log(`List created successfully with ID ${createdList.ListID}`);
      
      res.json({
        success: true,
        list: createdList
      });
    } catch (error) {
      console.error('Error in createList:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create list',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
