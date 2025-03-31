"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCampaignRoutes = createCampaignRoutes;
const express_1 = require("express");
const CampaignController_1 = require("../controllers/CampaignController");
const CampaignService_1 = require("../services/CampaignService");
const CampaignRepository_1 = require("../repositories/CampaignRepository");
/**
 * Create campaign routes
 * @returns Express router with campaign routes
 */
function createCampaignRoutes(pool) {
    // Create router
    const router = (0, express_1.Router)();
    // Create dependencies
    const campaignRepository = new CampaignRepository_1.CampaignRepository(pool);
    const campaignService = new CampaignService_1.CampaignService(campaignRepository);
    const campaignController = new CampaignController_1.CampaignController(campaignService);
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
    return router;
}
