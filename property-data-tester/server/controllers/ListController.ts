import { Request, Response } from 'express';
import { PropertyRadarListService } from '../services/PropertyRadarListService';
import { BatchJobService } from '../services/BatchJobService';
import { BatchJobRepository } from '../repositories/BatchJobRepository';
import { CampaignService } from '../services/CampaignService';
import { CampaignRepository } from '../repositories/CampaignRepository';
import { PropertyOwnerRepository } from '../repositories/PropertyOwnerRepository';
import { Pool } from 'pg';

export class ListController {
  private listService: PropertyRadarListService;
  private batchJobService: BatchJobService;
  private campaignService: CampaignService;
  
  constructor(pool: Pool) {
    this.listService = new PropertyRadarListService(pool);
    const batchJobRepository = new BatchJobRepository(pool);
    this.batchJobService = new BatchJobService(batchJobRepository);
    const campaignRepository = new CampaignRepository(pool);
    const propertyOwnerRepository = new PropertyOwnerRepository(pool);
    this.campaignService = new CampaignService(campaignRepository, propertyOwnerRepository);
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
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 1000;
      
      // Get all items from the list
      const items = await this.listService.getAllListItems(listId);
      console.log(`Retrieved ${items.length} items from list ${listId}`);
      const allRadarIds = items.map(item => item.RadarID);
      
      // Calculate total pages
      const totalPages = Math.ceil(allRadarIds.length / pageSize);
      
      // Process all radar IDs at once for better performance
      console.log(`Processing all ${allRadarIds.length} items at once for better performance`);
      const allDuplicates = await this.listService.checkDuplicates(allRadarIds);
      console.log(`Found ${allDuplicates.length} duplicates out of ${allRadarIds.length} items`);
      
      // Return only the duplicates for the current page
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, allDuplicates.length);
      const pageDuplicates = allDuplicates.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        totalItems: allRadarIds.length,
        duplicateCount: allDuplicates.length,
        duplicates: pageDuplicates,
        pagination: {
          page,
          pageSize,
          totalPages: Math.ceil(allDuplicates.length / pageSize),
          hasMore: page < Math.ceil(allDuplicates.length / pageSize)
        }
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
