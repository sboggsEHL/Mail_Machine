"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListController = void 0;
const PropertyRadarListService_1 = require("../services/PropertyRadarListService");
const BatchJobService_1 = require("../services/BatchJobService");
const BatchJobRepository_1 = require("../repositories/BatchJobRepository");
const CampaignService_1 = require("../services/CampaignService");
const CampaignRepository_1 = require("../repositories/CampaignRepository");
const PropertyOwnerRepository_1 = require("../repositories/PropertyOwnerRepository");
class ListController {
    constructor(pool) {
        this.listService = new PropertyRadarListService_1.PropertyRadarListService(pool);
        const batchJobRepository = new BatchJobRepository_1.BatchJobRepository(pool);
        this.batchJobService = new BatchJobService_1.BatchJobService(batchJobRepository);
        const campaignRepository = new CampaignRepository_1.CampaignRepository(pool);
        const propertyOwnerRepository = new PropertyOwnerRepository_1.PropertyOwnerRepository(pool);
        this.campaignService = new CampaignService_1.CampaignService(campaignRepository, propertyOwnerRepository);
    }
    /**
     * Get all PropertyRadar lists
     */
    getLists(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('ListController.getLists called');
            try {
                const lists = yield this.listService.getLists();
                console.log('Lists fetched successfully:', lists);
                res.json({
                    success: true,
                    lists: lists
                });
            }
            catch (error) {
                console.error('Error in getLists:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch lists'
                });
            }
        });
    }
    /**
     * Get items from a specific list
     */
    getListItems(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('ListController.getListItems called with listId:', req.params.listId);
            try {
                const listId = parseInt(req.params.listId);
                const start = req.query.start ? parseInt(req.query.start) : 0;
                const limit = req.query.limit ? parseInt(req.query.limit) : 1000;
                const items = yield this.listService.getListItems(listId, start, limit);
                console.log(`Retrieved ${items.length} items from list ${listId}`);
                res.json({
                    success: true,
                    items: items,
                    hasMore: items.length === limit
                });
            }
            catch (error) {
                console.error('Error in getListItems:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch list items',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Check for duplicates in a list
     */
    checkDuplicates(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('ListController.checkDuplicates called with listId:', req.params.listId);
            try {
                const listId = parseInt(req.params.listId);
                const page = req.query.page ? parseInt(req.query.page) : 1;
                const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 1000;
                // Get all items from the list
                const items = yield this.listService.getAllListItems(listId);
                console.log(`Retrieved ${items.length} items from list ${listId}`);
                const allRadarIds = items.map(item => item.RadarID);
                // Calculate total pages
                const totalPages = Math.ceil(allRadarIds.length / pageSize);
                // Process all radar IDs at once for better performance
                console.log(`Processing all ${allRadarIds.length} items at once for better performance`);
                const allDuplicates = yield this.listService.checkDuplicates(allRadarIds);
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
            }
            catch (error) {
                console.error('Error in checkDuplicates:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to check duplicates',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Process a list (excluding specified duplicates)
     */
    processList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('ListController.processList called with listId:', req.params.listId);
            try {
                const listId = parseInt(req.params.listId);
                const excludeRadarIds = req.body.excludeRadarIds || [];
                const leadCount = req.body.leadCount ? parseInt(req.body.leadCount) : undefined;
                const campaignId = req.body.campaignId ? parseInt(req.body.campaignId) : undefined;
                console.log(`Processing list ${listId} with ${excludeRadarIds.length} excluded RadarIDs, leadCount: ${leadCount || 'all'}, campaignId: ${campaignId || 'none'}`);
                // Get all items from the list
                const items = yield this.listService.getAllListItems(listId);
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
                const job = yield this.batchJobService.createJob({
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
            }
            catch (error) {
                console.error('Error in processList:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to process list',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Check for duplicates in a batch of radar IDs
     */
    checkDuplicatesBatch(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const duplicates = yield this.listService.checkDuplicates(radarIds);
                console.log(`Found ${duplicates.length} duplicates out of ${radarIds.length} items`);
                res.json({
                    success: true,
                    totalItems: radarIds.length,
                    duplicateCount: duplicates.length,
                    duplicates
                });
            }
            catch (error) {
                console.error('Error in checkDuplicatesBatch:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to check duplicates',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Process multiple lists (excluding specified duplicates)
     */
    processMultipleLists(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('ListController.processMultipleLists called');
            try {
                const { listIds, excludeRadarIds = [], campaignId, newCampaign } = req.body;
                if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid or empty listIds array'
                    });
                    return;
                }
                console.log(`Processing ${listIds.length} lists with ${excludeRadarIds.length} excluded RadarIDs`);
                // Get all items from all lists
                let allItems = [];
                for (const listId of listIds) {
                    const items = yield this.listService.getAllListItems(listId);
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
                    const campaign = yield this.campaignService.createCampaign(newCampaign);
                    if (campaign && campaign.campaign_id) {
                        finalCampaignId = campaign.campaign_id;
                        console.log(`Created new campaign with ID ${finalCampaignId}`);
                    }
                    else {
                        console.error('Failed to create campaign');
                    }
                }
                // Create a batch job with the filtered RadarIDs and campaign ID
                const job = yield this.batchJobService.createJob({
                    status: 'PENDING',
                    criteria: {
                        RadarID: filteredRadarIds,
                        sourceListIds: listIds,
                        campaignId: finalCampaignId
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
            }
            catch (error) {
                console.error('Error in processMultipleLists:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to process lists',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    /**
     * Create a new list
     */
    createList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const createdList = yield this.listService.createList(listData);
                console.log(`List created successfully with ID ${createdList.ListID}`);
                res.json({
                    success: true,
                    list: createdList
                });
            }
            catch (error) {
                console.error('Error in createList:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to create list',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
}
exports.ListController = ListController;
