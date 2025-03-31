import { Request, Response } from 'express';
import { CampaignService } from '../services/CampaignService';
import { Campaign } from '../models';

/**
 * Controller for handling campaign-related HTTP requests
 */
export class CampaignController {
  private campaignService: CampaignService;

  /**
   * Create a new CampaignController
   * @param campaignService Service for campaign operations
   */
  constructor(campaignService: CampaignService) {
    this.campaignService = campaignService;
  }

  /**
   * Get all campaigns
   * @param req Express request
   * @param res Express response
   */
  async getCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const campaigns = await this.campaignService.getCampaigns();
      
      res.json({
        success: true,
        campaigns,
        count: campaigns.length
      });
    } catch (error) {
      console.error('Error getting campaigns:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get campaigns'
      });
    }
  }

  /**
   * Get a campaign by ID
   * @param req Express request
   * @param res Express response
   */
  async getCampaignById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid campaign ID'
        });
        return;
      }
      
      const campaign = await this.campaignService.getCampaignById(id);
      
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
    } catch (error) {
      console.error(`Error getting campaign:`, error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get campaign'
      });
    }
  }

  /**
   * Create a new campaign
   * @param req Express request
   * @param res Express response
   */
  async createCampaign(req: Request, res: Response): Promise<void> {
    try {
      const campaignData = req.body as Campaign;
      
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
      const campaign = await this.campaignService.createCampaign(campaignData);
      
      res.status(201).json({
        success: true,
        campaign
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create campaign'
      });
    }
  }

  /**
   * Update a campaign
   * @param req Express request
   * @param res Express response
   */
  async updateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid campaign ID'
        });
        return;
      }
      
      const campaignData = req.body as Partial<Campaign>;
      
      // Update the campaign
      const campaign = await this.campaignService.updateCampaign(id, campaignData);
      
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
    } catch (error) {
      console.error('Error updating campaign:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update campaign'
      });
    }
  }

  /**
   * Delete a campaign
   * @param req Express request
   * @param res Express response
   */
  async deleteCampaign(req: Request, res: Response): Promise<void> {
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
      const deleted = await this.campaignService.deleteCampaign(id);
      
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
    } catch (error) {
      console.error('Error deleting campaign:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete campaign'
      });
    }
  }

  /**
   * Get campaign statistics
   * @param req Express request
   * @param res Express response
   */
  async getCampaignStats(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid campaign ID'
        });
        return;
      }
      
      const stats = await this.campaignService.getCampaignStats(id);
      
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
    } catch (error) {
      console.error('Error getting campaign stats:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get campaign stats'
      });
    }
  }
}