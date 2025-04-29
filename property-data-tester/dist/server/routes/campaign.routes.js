"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCampaignRoutes = void 0;
const express_1 = require("express");
const CampaignController_1 = require("../controllers/CampaignController");
const CampaignService_1 = require("../services/CampaignService");
const CampaignRepository_1 = require("../repositories/CampaignRepository");
const PropertyOwnerRepository_1 = require("../repositories/PropertyOwnerRepository");
const multer_1 = __importDefault(require("multer"));
/**
 * Create campaign routes
 * @returns Express router with campaign routes
 */
function createCampaignRoutes(pool) {
    // Create router
    const router = (0, express_1.Router)();
    // Create dependencies
    const campaignRepository = new CampaignRepository_1.CampaignRepository(pool);
    const propertyOwnerRepository = new PropertyOwnerRepository_1.PropertyOwnerRepository(pool);
    const campaignService = new CampaignService_1.CampaignService(campaignRepository, propertyOwnerRepository);
    const campaignController = new CampaignController_1.CampaignController(campaignService);
    // Multer setup for file upload (memory storage)
    const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
    // GET /campaigns - Get all campaigns
    router.get('/', (req, res) => campaignController.getCampaigns(req, res));
    // GET /campaigns/:id - Get a campaign by ID
    router.get('/:id', (req, res) => campaignController.getCampaignById(req, res));
    // POST /campaigns - Create a new campaign
    router.post('/', (req, res) => campaignController.createCampaign(req, res));
    // PUT /campaigns/:id - Update a campaign
    router.put('/:id', (req, res) => campaignController.updateCampaign(req, res));
    // DELETE /campaigns/:id - Delete a campaign
    router.delete('/:id', (req, res) => campaignController.deleteCampaign(req, res));
    // GET /campaigns/:id/stats - Get campaign statistics
    router.get('/:id/stats', (req, res) => campaignController.getCampaignStats(req, res));
    // GET /campaigns/:id/leads-csv - Download leads as CSV
    router.get('/:id/leads-csv', (req, res) => campaignController.downloadLeadsCsv(req, res));
    // POST /campaigns/:id/upload-recipients - Upload recipients via CSV
    router.post('/:id/upload-recipients', upload.single('file'), (req, res) => campaignController.uploadRecipientsCsv(req, res));
    return router;
}
exports.createCampaignRoutes = createCampaignRoutes;
