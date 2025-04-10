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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignController = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
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
                logger_1.default.error('Error getting campaigns:', error);
                if (error instanceof errors_1.AppError) {
                    throw error;
                }
                throw new errors_1.AppError(errors_1.ERROR_CODES.SYSTEM_UNEXPECTED_ERROR, 'An unexpected error occurred while getting campaigns', 500, error);
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
                    throw new errors_1.AppError(errors_1.ERROR_CODES.VALIDATION_ERROR, 'Invalid campaign ID', 400);
                }
                const campaign = yield this.campaignService.getCampaignById(id);
                if (!campaign) {
                    throw new errors_1.AppError(errors_1.ERROR_CODES.CAMPAIGN_NOT_FOUND, `Campaign with ID ${id} not found`, 404);
                }
                res.json({
                    success: true,
                    campaign
                });
            }
            catch (error) {
                logger_1.default.error(`Error getting campaign:`, error);
                if (error instanceof errors_1.AppError) {
                    throw error;
                }
                throw new errors_1.AppError(errors_1.ERROR_CODES.SYSTEM_UNEXPECTED_ERROR, 'An unexpected error occurred while getting campaign', 500, error);
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
                    throw new errors_1.AppError(errors_1.ERROR_CODES.VALIDATION_ERROR, 'Campaign name is required', 400);
                }
                if (!campaignData.campaign_date) {
                    throw new errors_1.AppError(errors_1.ERROR_CODES.VALIDATION_ERROR, 'Campaign date is required', 400);
                }
                // Create the campaign
                const campaign = yield this.campaignService.createCampaign(campaignData);
                res.status(201).json({
                    success: true,
                    campaign
                });
            }
            catch (error) {
                logger_1.default.error('Error creating campaign:', error);
                if (error instanceof errors_1.AppError) {
                    throw error;
                }
                throw new errors_1.AppError(errors_1.ERROR_CODES.SYSTEM_UNEXPECTED_ERROR, 'An unexpected error occurred while creating campaign', 500, error);
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
                    throw new errors_1.AppError(errors_1.ERROR_CODES.VALIDATION_ERROR, 'Invalid campaign ID', 400);
                }
                const campaignData = req.body;
                // Update the campaign
                const campaign = yield this.campaignService.updateCampaign(id, campaignData);
                if (!campaign) {
                    throw new errors_1.AppError(errors_1.ERROR_CODES.CAMPAIGN_NOT_FOUND, `Campaign with ID ${id} not found`, 404);
                }
                res.json({
                    success: true,
                    campaign
                });
            }
            catch (error) {
                logger_1.default.error(`Error getting campaign:`, error);
                if (error instanceof errors_1.AppError) {
                    throw error;
                }
                throw new errors_1.AppError(errors_1.ERROR_CODES.SYSTEM_UNEXPECTED_ERROR, 'An unexpected error occurred while getting campaign', 500, error);
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
                    throw new errors_1.AppError(errors_1.ERROR_CODES.VALIDATION_ERROR, 'Invalid campaign ID', 400);
                }
                // Delete the campaign
                const deleted = yield this.campaignService.deleteCampaign(id);
                if (!deleted) {
                    throw new errors_1.AppError(errors_1.ERROR_CODES.CAMPAIGN_NOT_FOUND, `Campaign with ID ${id} not found`, 404);
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
                    throw new errors_1.AppError(errors_1.ERROR_CODES.CAMPAIGN_NOT_FOUND, `Campaign with ID ${id} not found`, 404);
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
