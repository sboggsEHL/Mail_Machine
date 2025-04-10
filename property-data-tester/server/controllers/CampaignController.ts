import { Request, Response } from 'express';
import { CampaignService } from '../services/CampaignService';
import { Campaign } from '../models';
import { AppError, ERROR_CODES } from '../utils/errors';
import logger from '../utils/logger';

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
      logger.error('Error getting campaigns:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.SYSTEM_UNEXPECTED_ERROR,
        'An unexpected error occurred while getting campaigns',
        500,
        error
      );
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
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid campaign ID',
          400
        );
      }
      
      const campaign = await this.campaignService.getCampaignById(id);
      
      if (!campaign) {
        throw new AppError(
          ERROR_CODES.CAMPAIGN_NOT_FOUND,
          `Campaign with ID ${id} not found`,
          404
        );
      }
      
      res.json({
        success: true,
        campaign
      });
    } catch (error) {
      logger.error(`Error getting campaign:`, error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.SYSTEM_UNEXPECTED_ERROR,
        'An unexpected error occurred while getting campaign',
        500,
        error
      );
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
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Campaign name is required',
          400
        );
      }
      
      if (!campaignData.campaign_date) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Campaign date is required',
          400
        );
      }
      
      // Create the campaign
      const campaign = await this.campaignService.createCampaign(campaignData);
      
      res.status(201).json({
        success: true,
        campaign
      });
    } catch (error) {
      logger.error('Error creating campaign:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.SYSTEM_UNEXPECTED_ERROR,
        'An unexpected error occurred while creating campaign',
        500,
        error
      );
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
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid campaign ID',
          400
        );
      }
      
      const campaignData = req.body as Partial<Campaign>;
      
      // Update the campaign
      const campaign = await this.campaignService.updateCampaign(id, campaignData);
      
      if (!campaign) {
        throw new AppError(
          ERROR_CODES.CAMPAIGN_NOT_FOUND,
          `Campaign with ID ${id} not found`,
          404
        );
      }
      
      res.json({
        success: true,
        campaign
      });
    } catch (error) {
      logger.error(`Error getting campaign:`, error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.SYSTEM_UNEXPECTED_ERROR,
        'An unexpected error occurred while getting campaign',
        500,
        error
      );
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
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid campaign ID',
          400
        );
      }
      
      // Delete the campaign
      const deleted = await this.campaignService.deleteCampaign(id);
      
      if (!deleted) {
        throw new AppError(
          ERROR_CODES.CAMPAIGN_NOT_FOUND,
          `Campaign with ID ${id} not found`,
          404
        );
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
        throw new AppError(
          ERROR_CODES.CAMPAIGN_NOT_FOUND,
          `Campaign with ID ${id} not found`,
          404
        );
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
