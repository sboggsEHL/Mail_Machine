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
exports.CampaignController = void 0;
/**
 * Controller for handling campaign-related HTTP requests
 */
class CampaignController {
    /**
     * Create a new CampaignController
     * @param campaignService Service for campaign operations
     */
    constructor(campaignService) {
        this.campaignService = campaignService;
    }
    /**
     * Get all campaigns
     * @param req Express request
     * @param res Express response
     */
    getCampaigns(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const campaigns = yield this.campaignService.getCampaigns();
                res.json({
                    success: true,
                    campaigns,
                    count: campaigns.length
                });
            }
            catch (error) {
                console.error('Error getting campaigns:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get campaigns'
                });
            }
        });
    }
    /**
     * Get a campaign by ID
     * @param req Express request
     * @param res Express response
     */
    getCampaignById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid campaign ID'
                    });
                    return;
                }
                const campaign = yield this.campaignService.getCampaignById(id);
                if (!campaign) {
                    res.status(404).json({
                        success: false,
                        error: `Campaign with ID ${id} not found`
                    });
                    return;
                }
                res.json({
                    success: true,
                    campaign
                });
            }
            catch (error) {
                console.error(`Error getting campaign:`, error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get campaign'
                });
            }
        });
    }
    /**
     * Create a new campaign
     * @param req Express request
     * @param res Express response
     */
    createCampaign(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const campaignData = req.body;
                // Validate required fields
                if (!campaignData.campaign_name) {
                    res.status(400).json({
                        success: false,
                        error: 'Campaign name is required'
                    });
                    return;
                }
                if (!campaignData.campaign_date) {
                    res.status(400).json({
                        success: false,
                        error: 'Campaign date is required'
                    });
                    return;
                }
                // Create the campaign
                const campaign = yield this.campaignService.createCampaign(campaignData);
                res.status(201).json({
                    success: true,
                    campaign
                });
            }
            catch (error) {
                console.error('Error creating campaign:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to create campaign'
                });
            }
        });
    }
    /**
     * Update a campaign
     * @param req Express request
     * @param res Express response
     */
    updateCampaign(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid campaign ID'
                    });
                    return;
                }
                const campaignData = req.body;
                // Update the campaign
                const campaign = yield this.campaignService.updateCampaign(id, campaignData);
                if (!campaign) {
                    res.status(404).json({
                        success: false,
                        error: `Campaign with ID ${id} not found`
                    });
                    return;
                }
                res.json({
                    success: true,
                    campaign
                });
            }
            catch (error) {
                console.error('Error updating campaign:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update campaign'
                });
            }
        });
    }
    /**
     * Delete a campaign
     * @param req Express request
     * @param res Express response
     */
    deleteCampaign(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid campaign ID'
                    });
                    return;
                }
                // Delete the campaign
                const deleted = yield this.campaignService.deleteCampaign(id);
                if (!deleted) {
                    res.status(404).json({
                        success: false,
                        error: `Campaign with ID ${id} not found`
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: `Campaign with ID ${id} deleted successfully`
                });
            }
            catch (error) {
                console.error('Error deleting campaign:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to delete campaign'
                });
            }
        });
    }
    /**
     * Get campaign statistics
     * @param req Express request
     * @param res Express response
     */
    getCampaignStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid campaign ID'
                    });
                    return;
                }
                const stats = yield this.campaignService.getCampaignStats(id);
                if (!stats) {
                    res.status(404).json({
                        success: false,
                        error: `Campaign with ID ${id} not found`
                    });
                    return;
                }
                res.json({
                    success: true,
                    stats
                });
            }
            catch (error) {
                console.error('Error getting campaign stats:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get campaign stats'
                });
            }
        });
    }
}
exports.CampaignController = CampaignController;
