"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignService = void 0;
/**
 * Service for managing campaigns
 */
class CampaignService {
    /**
     * Create a new CampaignService
     * @param campaignRepository Repository for campaign operations
     */
    constructor(campaignRepository) {
        this.campaignRepository = campaignRepository;
    }
    /**
     * Get all campaigns
     * @returns Array of campaigns
     */
    getCampaigns() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.campaignRepository.getCampaigns();
        });
    }
    /**
     * Get a campaign by ID
     * @param id Campaign ID
     * @returns Campaign or null if not found
     */
    getCampaignById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.campaignRepository.findById(id);
        });
    }
    /**
     * Create a new campaign
     * @param campaign Campaign data
     * @returns Created campaign
     */
    createCampaign(campaign) {
        return __awaiter(this, void 0, void 0, function* () {
            // Ensure status is set
            if (!campaign.status) {
                campaign.status = 'DRAFT';
            }
            return this.campaignRepository.create(campaign);
        });
    }
    /**
     * Update a campaign
     * @param id Campaign ID
     * @param campaign Campaign data to update
     * @returns Updated campaign or null if not found
     */
    updateCampaign(id, campaign) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.campaignRepository.update(id, campaign);
        });
    }
    /**
     * Delete a campaign (soft delete)
     * @param id Campaign ID
     * @returns True if deleted, false otherwise
     */
    deleteCampaign(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.campaignRepository.softDelete(id);
        });
    }
    /**
     * Get campaign statistics
     * @param id Campaign ID
     * @returns Campaign statistics or null if not found
     */
    getCampaignStats(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.campaignRepository.getCampaignStats(id);
        });
    }
    /**
     * Generate a description from criteria
     * @param criteria Criteria object
     * @returns Generated description
     */
    generateDescriptionFromCriteria(criteria) {
        const parts = [];
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
            const ranges = criteria.AvailableEquity.value.map((range) => {
                if (range.length === 2) {
                    if (range[0] === null && range[1] !== null) {
                        return `equity up to $${range[1].toLocaleString()}`;
                    }
                    else if (range[0] !== null && range[1] === null) {
                        return `equity over $${range[0].toLocaleString()}`;
                    }
                    else if (range[0] !== null && range[1] !== null) {
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
exports.CampaignService = CampaignService;
