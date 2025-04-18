import { Campaign, CampaignStats } from '../models';
import { CampaignRepository } from '../repositories/CampaignRepository';
import { AppError, ERROR_CODES } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Service for managing campaigns
 */
export class CampaignService {
  private campaignRepository: CampaignRepository;

  /**
   * Create a new CampaignService
   * @param campaignRepository Repository for campaign operations
   */
  constructor(campaignRepository: CampaignRepository) {
    this.campaignRepository = campaignRepository;
  }

  /**
   * Get all campaigns
   * @returns Array of campaigns
   */
  async getCampaigns(): Promise<Campaign[]> {
    return this.campaignRepository.getCampaigns();
  }

  /**
   * Get a campaign by ID
   * @param id Campaign ID
   * @returns Campaign or null if not found
   */
  async getCampaignById(id: number): Promise<Campaign | null> {
    const campaign = await this.campaignRepository.findById(id);
    if (!campaign) {
      throw new AppError(
        ERROR_CODES.CAMPAIGN_NOT_FOUND,
        `Campaign with ID ${id} not found`,
        404
      );
    }
    return campaign;
  }

  /**
   * Create a new campaign
   * @param campaign Campaign data
   * @returns Created campaign
   */
  async createCampaign(campaign: Campaign): Promise<Campaign> {
    // Ensure status is set
    if (!campaign.status) {
      campaign.status = 'DRAFT';
    }
    
    return this.campaignRepository.create(campaign);
  }

  /**
   * Update a campaign
   * @param id Campaign ID
   * @param campaign Campaign data to update
   * @returns Updated campaign or null if not found
   */
  async updateCampaign(id: number, campaign: Partial<Campaign>): Promise<Campaign | null> {
    const updatedCampaign = await this.campaignRepository.update(id, campaign);
    if (!updatedCampaign) {
      throw new AppError(
        ERROR_CODES.CAMPAIGN_NOT_FOUND,
        `Campaign with ID ${id} not found`,
        404
      );
    }
    return updatedCampaign;
  }

  /**
   * Delete a campaign (soft delete)
   * @param id Campaign ID
   * @returns True if deleted, false otherwise
   */
  async deleteCampaign(id: number): Promise<boolean> {
    const deleted = await this.campaignRepository.softDelete(id);
    if (!deleted) {
      throw new AppError(
        ERROR_CODES.CAMPAIGN_NOT_FOUND,
        `Campaign with ID ${id} not found`,
        404
      );
    }
    return deleted;
  }

  /**
   * Get campaign statistics
   * @param id Campaign ID
   * @returns Campaign statistics or null if not found
   */
  async getCampaignStats(id: number): Promise<CampaignStats> {
    const stats = await this.campaignRepository.getCampaignStats(id);
    if (!stats) {
      throw new AppError(
        ERROR_CODES.CAMPAIGN_NOT_FOUND,
        `Campaign with ID ${id} not found`,
        404
      );
    }
    return stats;
  }

  /**
   * Generate a description from criteria
   * @param criteria Criteria object
   * @returns Generated description
   */
  generateDescriptionFromCriteria(criteria: Record<string, any>): string {
    const parts: string[] = [];
    
    // Extract state information
    if (criteria.State && criteria.State.value && criteria.State.value.length > 0) {
      parts.push(`${criteria.State.value.join(', ')} state(s)`);
    }
    
    // Extract loan type information
    if (criteria.FirstLoanType && criteria.FirstLoanType.value && criteria.FirstLoanType.value.length > 0) {
      parts.push(`${criteria.FirstLoanType.value.join(', ')} loan type(s)`);
    }
    
    // Extract equity information
    if (criteria.AvailableEquity && criteria.AvailableEquity.value && criteria.AvailableEquity.value.length > 0) {
      const ranges = criteria.AvailableEquity.value.map((range: number[]) => {
        if (range.length === 2) {
          if (range[0] === null && range[1] !== null) {
            return `equity up to $${range[1].toLocaleString()}`;
          } else if (range[0] !== null && range[1] === null) {
            return `equity over $${range[0].toLocaleString()}`;
          } else if (range[0] !== null && range[1] !== null) {
            return `equity between $${range[0].toLocaleString()} and $${range[1].toLocaleString()}`;
          }
        }
        return '';
      }).filter(Boolean);
      
      if (ranges.length > 0) {
        parts.push(ranges.join(', '));
      }
    }
    
    // Add more criteria as needed
    
    // Combine all parts
    if (parts.length > 0) {
      return parts.join(', ');
    }
    
    return 'Custom criteria';
  }
}
