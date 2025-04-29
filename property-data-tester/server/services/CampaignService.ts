import { Campaign, CampaignStats } from '../models';
import { CampaignRepository } from '../repositories/CampaignRepository';
import { PropertyOwnerRepository } from '../repositories/PropertyOwnerRepository';
import { AppError, ERROR_CODES } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Service for managing campaigns
 */
export class CampaignService {
  private campaignRepository: CampaignRepository;
  private propertyOwnerRepository: PropertyOwnerRepository;

  /**
   * Create a new CampaignService
   * @param campaignRepository Repository for campaign operations
   * @param propertyOwnerRepository Repository for property owner operations
   */
  constructor(
    campaignRepository: CampaignRepository,
    propertyOwnerRepository: PropertyOwnerRepository
  ) {
    this.campaignRepository = campaignRepository;
    this.propertyOwnerRepository = propertyOwnerRepository;
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

  /**
   * Get leads for a campaign for CSV export
   * @param campaignId Campaign ID
   * @returns Array of leads with required columns
   */
  async getLeadsForCampaignCsv(campaignId: number): Promise<any[]> {
    return this.campaignRepository.getLeadsForCampaignCsv(campaignId);
  }

  /**
   * Upload recipients from CSV and upsert into mail_recipients
   * @param campaignId Campaign ID
   * @param records Parsed CSV records
   */
  async uploadRecipientsFromCsv(campaignId: number, records: any[]): Promise<any> {
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    let ownersUpdated = 0;

    // Get all existing loan_ids for this campaign
    const loanIdMap = await this.campaignRepository.getRecipientLoanIdsByCampaignId(campaignId);

    // Date calculations (mimic Python logic)
    const now = new Date();
    const addDays = (date: Date, days: number) => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    };
    const monthName = (date: Date) => date.toLocaleString('default', { month: 'long' });

    const closeMonth = monthName(addDays(now, 21));
    const skipMonth = monthName(addDays(now, 21 + 32));
    const nextPayMonth = monthName(addDays(now, 21 + 32 + 32));

    // Next Friday for mail_date
    const daysUntilFriday = (5 - now.getDay() + 7) % 7;
    const mailDate = addDays(now, daysUntilFriday);
    const mailDateStr = mailDate.toISOString().slice(0, 10);

    const phoneNumber = '855-235-5834';
    const qrBaseUrl = 'https://elevated.loans/my-loan/';

    const toInsert: any[] = [];
    const toUpdate: any[] = [];
    const ownerUpdates: {owner_id: number, first_name: string}[] = [];

    for (const row of records) {
      try {
        const loan_id = row['loan_id']?.trim();
        if (!loan_id) {
          errors.push(`Missing loan_id in row: ${JSON.stringify(row)}`);
          continue;
        }

        // Map CSV fields to DB columns
        const recipient: any = {
          campaign_id: campaignId,
          loan_id,
          first_name: row['first_name'] || null,
          last_name: row['last_name'] || null,
          address: row['address'] || null,
          city: row['city'] || null,
          state: row['state'] || null,
          zip_code: row['zip'] || row['zip_code'] || null,
          city_state_zip: row['city-state-zip'] || row['city_state_zip'] || null,
          presort_tray: row['presorttrayid'] || row['presort_tray'] || null,
          barcode: row['encodedimbno'] || row['barcode'] || null,
          status: 'MAILED',
          mailed_date: now,
          close_month: closeMonth,
          skip_month: skipMonth,
          next_pay_month: nextPayMonth,
          mail_date: mailDateStr,
          phone_number: phoneNumber,
          "#qrLink": qrBaseUrl + loan_id,
          created_at: now,
          updated_at: now
        };

        // Removed duplicated block here

        if (loanIdMap.has(loan_id)) {
          // Update existing
          recipient.recipient_id = loanIdMap.get(loan_id);
          // Ensure created_at is not included in the update object
          delete recipient.created_at; 
          toUpdate.push(recipient);
          
          // If first_name is provided and owner_id exists, queue owner update
          if (recipient.first_name && recipient.owner_id) {
            ownerUpdates.push({
              owner_id: recipient.owner_id,
              first_name: recipient.first_name
            });
          }
        } else {
          // Insert new
          toInsert.push(recipient);
        }
      } catch (e: any) {
        errors.push(`Error processing row: ${JSON.stringify(row)} - ${e.message}`);
      }
    }

    if (toInsert.length > 0) {
      inserted = await this.campaignRepository.insertRecipientsBulk(toInsert);
    }
    if (toUpdate.length > 0) {
      updated = await this.campaignRepository.updateRecipientsBulk(toUpdate);
    }

    // Update property_owners first_name field
    if (ownerUpdates.length > 0) {
      ownersUpdated = await this.propertyOwnerRepository.updateFirstNameBulk(ownerUpdates);
      logger.info(`Updated ${ownersUpdated} property owners with new first_name values`);
    }

    return { inserted, updated, ownersUpdated, errors };
  }
}
