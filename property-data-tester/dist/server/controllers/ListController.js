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
class ListController {
    constructor(pool) {
        this.listService = new PropertyRadarListService_1.PropertyRadarListService(pool);
        const batchJobRepository = new BatchJobRepository_1.BatchJobRepository(pool);
        this.batchJobService = new BatchJobService_1.BatchJobService(batchJobRepository);
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
                // Get radar IDs for the current page
                const startIndex = (page - 1) * pageSize;
                const endIndex = Math.min(startIndex + pageSize, allRadarIds.length);
                const radarIds = allRadarIds.slice(startIndex, endIndex);
                console.log(`Processing page ${page} of ${totalPages} (${radarIds.length} items)`);
                // Check for duplicates for the current page
                const duplicates = yield this.listService.checkDuplicates(radarIds);
                console.log(`Found ${duplicates.length} duplicates out of ${radarIds.length} items on page ${page}`);
                res.json({
                    success: true,
                    totalItems: allRadarIds.length,
                    duplicateCount: duplicates.length,
                    duplicates,
                    pagination: {
                        page,
                        pageSize,
                        totalPages,
                        hasMore: page < totalPages
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
                console.log(`Processing list ${listId} with ${excludeRadarIds.length} excluded RadarIDs`);
                // Get all items from the list
                const items = yield this.listService.getAllListItems(listId);
                console.log(`Retrieved ${items.length} items from list ${listId}`);
                // Filter out excluded RadarIDs
                const filteredRadarIds = items
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
                // Create a batch job with the filtered RadarIDs
                const job = yield this.batchJobService.createJob({
                    status: 'PENDING',
                    criteria: {
                        RadarID: filteredRadarIds,
                        sourceListId: listId // Store list ID in criteria instead
                    },
                    created_by: req.body.userId || 'system',
                    priority: 1
                });
                console.log(`Created batch job ${job.job_id} with ${filteredRadarIds.length} properties`);
                res.json({
                    success: true,
                    jobId: job.job_id,
                    processedCount: filteredRadarIds.length,
                    excludedCount: excludeRadarIds.length
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
}
exports.ListController = ListController;
