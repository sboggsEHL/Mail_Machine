import 'express'; // Import express types to help resolve namespace augmentation
import { Request, Response } from 'express';
import { CampaignService } from '../services/CampaignService';
import { Campaign } from '../models';
import { AppError, ERROR_CODES } from '../utils/errors';
import logger from '../utils/logger';
import { parse } from 'csv-parse';

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
   * Upload recipients via CSV and upsert into mail_recipients
   * @param req Express request
   * @param res Express response
   */
  async uploadRecipientsCsv(req: Request, res: Response): Promise<void> {
    try {
      // Extend req type to include file property from multer
      const reqWithFile = req as Request & { file?: Express.Multer.File };
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
      const csvBuffer = reqWithFile.file.buffer;
      const csvString = csvBuffer.toString('utf-8');

      try {
        // Log CSV parsing attempt
        logger.info(`Attempting to parse CSV for campaign ${id}, CSV length: ${csvString.length} bytes`);
        
        parse(csvString, { columns: true, skip_empty_lines: true }, async (err: any, records: any[]) => {
          if (err) {
            logger.error(`CSV parsing error: ${err.message}`);
            res.status(400).json({ success: false, error: 'Failed to parse CSV: ' + err.message });
            return;
          }
          
          try {
            // Log successful parsing
            logger.info(`Successfully parsed CSV with ${records.length} records`);
            
            // Call service to process records
            const result = await this.campaignService.uploadRecipientsFromCsv(id, records);
            res.json({
              success: true,
              ...result
            });
          } catch (serviceErr) {
            logger.error(`Error processing CSV records: ${serviceErr instanceof Error ? serviceErr.message : 'Unknown error'}`);
            res.status(500).json({ success: false, error: serviceErr instanceof Error ? serviceErr.message : 'Failed to process recipients' });
          }
        });
      } catch (parseErr) {
        logger.error(`Error in CSV parse function: ${parseErr instanceof Error ? parseErr.message : 'Unknown error'}`);
        res.status(500).json({ success: false, error: parseErr instanceof Error ? parseErr.message : 'Failed to parse CSV' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to upload recipients' });
    }
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

  /**
   * Get recipients for a campaign with pagination and search
   * @param req Express request
   * @param res Express response
   */
  async getRecipients(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid campaign ID' });
        return;
      }

      // Get pagination parameters
      const limit = parseInt(req.query.limit as string) || 10;
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;
      
      // Get search parameters
      const searchTerm = req.query.search as string || '';
      const searchType = req.query.searchType as string || 'all';

      // Fetch recipients with pagination and search
      const recipients = await this.campaignService.searchRecipients(
        id, 
        searchTerm, 
        searchType, 
        limit, 
        offset
      );
      
      // Get total count for pagination with search applied
      const totalCount = await this.campaignService.countSearchRecipients(
        id, 
        searchTerm, 
        searchType
      );
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        recipients,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages
        }
      });
    } catch (error) {
      logger.error('Error getting recipients:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recipients'
      });
    }
  }

  /**
   * Download leads for a campaign as CSV
   * @param req Express request
   * @param res Express response
   */
  async downloadLeadsCsv(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid campaign ID' });
        return;
      }

      // Fetch leads
      const leads = await this.campaignService.getLeadsForCampaignCsv(id);

      // If no leads, return 404
      if (!leads || leads.length === 0) {
        res.status(404).json({ success: false, error: 'No leads found for this campaign' });
        return;
      }

      // Prepare CSV header and rows
      const columns = ['address', 'city', 'state', 'zip', 'loan_id', 'first_name', 'last_name'];
      const header = columns.join(',');
      const rows = leads.map(row =>
        columns.map(col => {
          const value = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
          // Escape double quotes and wrap in quotes if needed
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );
      const csv = [header, ...rows].join('\r\n');

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="campaign_${id}_leads.csv"`);
      res.status(200).send(csv);
    } catch (error) {
      logger.error('Error downloading leads CSV:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download leads CSV'
      });
    }
  }

  /**
   * Download all recipients for a campaign as CSV
   * @param req Express request
   * @param res Express response
   */
  async downloadRecipientsCsv(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        logger.error(`Invalid campaign ID for downloadRecipientsCsv: ${req.params.id}`);
        res.status(400).json({ success: false, error: 'Invalid campaign ID' });
        return;
      }

      logger.info(`Starting download of recipients CSV for campaign ${id}`);

      // Fetch all recipients, excluding those in the DNM registry
      logger.info(`Fetching recipients for campaign ${id} with DNM filtering`);
      const recipients = await this.campaignService.getAllRecipientsByCampaignId(id, true);

      // If no recipients, return 404
      if (!recipients || recipients.length === 0) {
        logger.warn(`No recipients found for campaign ${id}`);
        res.status(404).json({ success: false, error: 'No recipients found for this campaign' });
        return;
      }

      logger.info(`Found ${recipients.length} recipients for campaign ${id} after DNM filtering`);

      // Helper function to capitalize first letter of each word (like Excel's PROPER function)
      const proper = (str: string | null | undefined): string => {
        if (!str) return '';
        return str.toLowerCase().replace(/(?:^|\s)\S/g, match => match.toUpperCase());
      };

      // Helper function to get first word (for first_name)
      const getFirstWord = (str: string | null | undefined): string => {
        if (!str) return '';
        const firstSpace = str.indexOf(' ');
        return firstSpace > 0 ? str.substring(0, firstSpace) : str;
      };

  // Format currency without decimals
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    // Format with dollar sign but no decimals
    return `$${Math.round(value).toLocaleString('en-US')}`;
  };

      // Specify the columns to include in the CSV
      const columns = [
        'loan_id', 'owner_id', 'first_name', 'last_name', 'address', 'city', 'state', 'zip_code',
        'city_state_zip', 'close_month', 'skip_month', 'next_pay_month', 'mail_date', 'phone_number',
        'presort_tray', 'barcode', 'status', 'mailed_date', '#qrLink', 'loan_type', 'loan_balance', 'lender_name'
      ];
      
      const header = columns.join(',');
      
      // Create CSV rows with normalized data
      const rows = recipients.map(row => {
        // Apply normalization to specific fields
        if (row.first_name) {
          // If "TRUST" is in the first name (case-insensitive), use as-is. Otherwise, use proper case of first word.
          if (row.first_name.toUpperCase().includes("TRUST")) {
            // Use as-is
            row.first_name = row.first_name;
          } else {
            row.first_name = proper(getFirstWord(row.first_name));
          }
        }
        
        if (row.last_name) {
          row.last_name = proper(row.last_name);
        }
        
        if (row.city) {
          row.city = proper(row.city);
        }
        
        return columns.map(col => {
          let value: string;
          
          // Special handling for loan_balance
          if (col === 'loan_balance' && row[col] !== undefined && row[col] !== null) {
            value = formatCurrency(row[col]);
          } else {
            value = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
          }
          
          // Escape double quotes and wrap in quotes if needed
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
      });
      
      const csv = [header, ...rows].join('\r\n');

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="campaign_${id}_recipients.csv"`);
      res.status(200).send(csv);
    } catch (error) {
      logger.error('Error downloading recipients CSV:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download recipients CSV'
      });
    }
  }
}
