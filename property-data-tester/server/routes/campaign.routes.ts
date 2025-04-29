import { Router } from 'express';
import { CampaignController } from '../controllers/CampaignController';
import { CampaignService } from '../services/CampaignService';
import { CampaignRepository } from '../repositories/CampaignRepository';
import { PropertyOwnerRepository } from '../repositories/PropertyOwnerRepository';
import { Pool } from 'pg';
import multer from 'multer';

/**
 * Create campaign routes
 * @returns Express router with campaign routes
 */
export function createCampaignRoutes(pool: Pool): Router {
  // Create router
  const router = Router();

  // Create dependencies
  const campaignRepository = new CampaignRepository(pool);
  const propertyOwnerRepository = new PropertyOwnerRepository(pool);
  const campaignService = new CampaignService(campaignRepository, propertyOwnerRepository);
  const campaignController = new CampaignController(campaignService);

  // Multer setup for file upload (memory storage)
  const upload = multer({ storage: multer.memoryStorage() });

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

  // GET /campaigns/:id/recipients - Get recipients with pagination
  router.get('/:id/recipients', (req, res) => campaignController.getRecipients(req, res));

  // GET /campaigns/:id/recipients-csv - Download all recipients as CSV
  router.get('/:id/recipients-csv', (req, res) => campaignController.downloadRecipientsCsv(req, res));

  // POST /campaigns/:id/upload-recipients - Upload recipients via CSV
  router.post('/:id/upload-recipients', upload.single('file'), (req, res) => campaignController.uploadRecipientsCsv(req, res));

  return router;
}
