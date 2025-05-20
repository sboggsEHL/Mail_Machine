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
  private dnmRepository: import('../repositories/DnmRepository').DnmRepository;

  /**
   * Create a new CampaignService
   * @param campaignRepository Repository for campaign operations
   * @param propertyOwnerRepository Repository for property owner operations
   * @param dnmRepository Repository for DNM operations
   */
  constructor(
    campaignRepository: CampaignRepository,
    propertyOwnerRepository: PropertyOwnerRepository,
    dnmRepository: import('../repositories/DnmRepository').DnmRepository
  ) {
    this.campaignRepository = campaignRepository;
    this.propertyOwnerRepository = propertyOwnerRepository;
    this.dnmRepository = dnmRepository;
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
   * Get recipients for a campaign with pagination
   * @param campaignId Campaign ID
   * @param limit Maximum number of recipients to return
   * @param offset Offset for pagination
   * @returns Array of recipients
   */
  async getRecipientsByCampaignId(campaignId: number, limit: number = 10, offset: number = 0): Promise<any[]> {
    return this.campaignRepository.getRecipientsByCampaignId(campaignId, limit, offset);
  }

  /**
   * Count recipients for a campaign
   * @param campaignId Campaign ID
   * @returns Number of recipients
   */
  async countRecipientsByCampaignId(campaignId: number): Promise<number> {
    return this.campaignRepository.countRecipientsByCampaignId(campaignId);
  }

  /**
   * Get all recipients for a campaign
   * @param campaignId Campaign ID
   * @returns Array of all recipients
   */
  async getAllRecipientsByCampaignId(campaignId: number): Promise<any[]> {
    // Get total count first
    const count = await this.campaignRepository.countRecipientsByCampaignId(campaignId);
    
    // If there are no recipients, return empty array
    if (count === 0) {
      return [];
    }
    
    // Fetch all recipients at once
    return this.campaignRepository.getRecipientsByCampaignId(campaignId, count, 0);
  }

  /**
   * Search recipients for a campaign with pagination
   * @param campaignId Campaign ID
   * @param searchTerm Search term
   * @param searchType Type of search (loan_id, name, address, all)
   * @param limit Maximum number of recipients to return
   * @param offset Offset for pagination
   * @returns Array of matching recipients
   */
  async searchRecipients(
    campaignId: number,
    searchTerm: string,
    searchType: string = 'all',
    limit: number = 10,
    offset: number = 0
  ): Promise<any[]> {
    // If no search term, just return regular paginated results
    if (!searchTerm) {
      return this.campaignRepository.getRecipientsByCampaignId(campaignId, limit, offset);
    }

    // Build search query based on search type
    let searchQuery = '';
    let searchParams: any[] = [campaignId];
    
    // Add search term to params
    searchParams.push(`%${searchTerm}%`);
    
    switch (searchType) {
      case 'loan_id':
        // Exact match for loan_id
        searchQuery = 'AND loan_id ILIKE $2';
        break;
      case 'name':
        // Fuzzy match for first_name or last_name
        searchQuery = 'AND (first_name ILIKE $2 OR last_name ILIKE $2)';
        break;
      case 'address':
        // Parse address to get street number and street name
        const match = searchTerm.match(/^(\d+)\s+(.+)$/);
        if (match) {
          const [_, streetNumber, streetName] = match;
          // Exact match for street number, fuzzy match for street name
          searchQuery = 'AND address ILIKE $2';
          // Replace the search term with a pattern that matches the street number exactly
          searchParams[1] = `${streetNumber}%${streetName}%`;
        } else {
          // If no street number found, do a regular fuzzy search
          searchQuery = 'AND address ILIKE $2';
        }
        break;
      default:
        // Search all fields
        searchQuery = 'AND (loan_id ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2 OR address ILIKE $2)';
        break;
    }
    
    // Add pagination parameters
    searchParams.push(limit, offset);
    
    // Execute search query
    return this.campaignRepository.searchRecipients(
      searchQuery,
      searchParams
    );
  }

  /**
   * Count recipients matching search criteria
   * @param campaignId Campaign ID
   * @param searchTerm Search term
   * @param searchType Type of search (loan_id, name, address, all)
   * @returns Number of matching recipients
   */
  async countSearchRecipients(
    campaignId: number,
    searchTerm: string,
    searchType: string = 'all'
  ): Promise<number> {
    // If no search term, just return total count
    if (!searchTerm) {
      return this.campaignRepository.countRecipientsByCampaignId(campaignId);
    }

    // Build search query based on search type
    let searchQuery = '';
    let searchParams: any[] = [campaignId];
    
    // Add search term to params
    searchParams.push(`%${searchTerm}%`);
    
    switch (searchType) {
      case 'loan_id':
        // Exact match for loan_id
        searchQuery = 'AND loan_id ILIKE $2';
        break;
      case 'name':
        // Fuzzy match for first_name or last_name
        searchQuery = 'AND (first_name ILIKE $2 OR last_name ILIKE $2)';
        break;
      case 'address':
        // Parse address to get street number and street name
        const match = searchTerm.match(/^(\d+)\s+(.+)$/);
        if (match) {
          const [_, streetNumber, streetName] = match;
          // Exact match for street number, fuzzy match for street name
          searchQuery = 'AND address ILIKE $2';
          // Replace the search term with a pattern that matches the street number exactly
          searchParams[1] = `${streetNumber}%${streetName}%`;
        } else {
          // If no street number found, do a regular fuzzy search
          searchQuery = 'AND address ILIKE $2';
        }
        break;
      default:
        // Search all fields
        searchQuery = 'AND (loan_id ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2 OR address ILIKE $2)';
        break;
    }
    
    // Execute count query
    return this.campaignRepository.countSearchRecipients(
      searchQuery,
      searchParams
    );
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

    try {
      logger.info(`Starting CSV upload for campaign ${campaignId} with ${records.length} records`);

      // Get all existing loan_ids for this campaign
      const loanIdMap = await this.campaignRepository.getRecipientLoanIdsByCampaignId(campaignId);
      logger.info(`Found ${loanIdMap.size} existing recipients for campaign ${campaignId}`);

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
          zip_code: row['zip'] ? row['zip'].trim().substring(0, 10) : (row['zip_code'] ? row['zip_code'].trim().substring(0, 10) : null),
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
      logger.info(`Updating ${ownerUpdates.length} property owners with new first_name values`);
      try {
        ownersUpdated = await this.propertyOwnerRepository.updateFirstNameBulk(ownerUpdates);
        logger.info(`Successfully updated ${ownersUpdated} property owners with new first_name values`);
      } catch (ownerUpdateError) {
        logger.error(`Error updating property owners: ${ownerUpdateError instanceof Error ? ownerUpdateError.message : 'Unknown error'}`);
        errors.push(`Failed to update property owners: ${ownerUpdateError instanceof Error ? ownerUpdateError.message : 'Unknown error'}`);
      }
    }

    logger.info(`CSV upload complete: ${inserted} inserted, ${updated} updated, ${ownersUpdated} owners updated, ${errors.length} errors`);
    return { inserted, updated, ownersUpdated, errors };
    } catch (error) {
      logger.error(`Unexpected error in uploadRecipientsFromCsv: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
