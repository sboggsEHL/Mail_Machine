import { Router } from 'express';
import { CampaignController } from '../controllers/CampaignController';
import { CampaignService } from '../services/CampaignService';
import { CampaignRepository } from '../repositories/CampaignRepository';
import { Pool } from 'pg';

/**
 * Create campaign routes
 * @returns Express router with campaign routes
 */
export function createCampaignRoutes(pool: Pool): Router {
  // Create router
  const router = Router();

  // Create dependencies
  const campaignRepository = new CampaignRepository(pool);
  const campaignService = new CampaignService(campaignRepository);
  const campaignController = new CampaignController(campaignService);

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