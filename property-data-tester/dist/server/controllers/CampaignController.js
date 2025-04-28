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
     * Upload recipients via CSV and upsert into mail_recipients
     * @param req Express request
     * @param res Express response
     */
    uploadRecipientsCsv(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Extend req type to include file property from multer
                const reqWithFile = req;
                const id = parseInt(reqWithFile.params.id);
                if (isNaN(id)) {
                    res.status(400).json({ success: false, error: 'Invalid campaign ID' });
                    return;
                }
                if (!reqWithFile.file || !reqWithFile.file.buffer) {
                    res.status(400).json({ success: false, error: 'No file uploaded' });
                    return;
                }
                // Parse CSV using csv-parse
                const csvParse = require('csv-parse');
                const csvBuffer = reqWithFile.file.buffer;
                const csvString = csvBuffer.toString('utf-8');
                csvParse(csvString, { columns: true, skip_empty_lines: true }, (err, records) => __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        res.status(400).json({ success: false, error: 'Failed to parse CSV: ' + err.message });
                        return;
                    }
                    try {
                        // Call service to process records
                        const result = yield this.campaignService.uploadRecipientsFromCsv(id, records);
                        res.json(Object.assign({ success: true }, result));
                    }
                    catch (serviceErr) {
                        res.status(500).json({ success: false, error: serviceErr instanceof Error ? serviceErr.message : 'Failed to process recipients' });
                    }
                }));
            }
            catch (error) {
                res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to upload recipients' });
            }
        });
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
    /**
     * Download leads for a campaign as CSV
     * @param req Express request
     * @param res Express response
     */
    downloadLeadsCsv(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({ success: false, error: 'Invalid campaign ID' });
                    return;
                }
                // Fetch leads
                const leads = yield this.campaignService.getLeadsForCampaignCsv(id);
                // If no leads, return 404
                if (!leads || leads.length === 0) {
                    res.status(404).json({ success: false, error: 'No leads found for this campaign' });
                    return;
                }
                // Prepare CSV header and rows
                const columns = ['address', 'city', 'state', 'zip', 'loan_id', 'first_name', 'last_name'];
                const header = columns.join(',');
                const rows = leads.map(row => columns.map(col => {
                    const value = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
                    // Escape double quotes and wrap in quotes if needed
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(','));
                const csv = [header, ...rows].join('\r\n');
                // Set headers for file download
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="campaign_${id}_leads.csv"`);
                res.status(200).send(csv);
            }
            catch (error) {
                logger_1.default.error('Error downloading leads CSV:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to download leads CSV'
                });
            }
        });
    }
}
exports.CampaignController = CampaignController;
