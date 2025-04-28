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
const errors_1 = require("../utils/errors");
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
            const campaign = yield this.campaignRepository.findById(id);
            if (!campaign) {
                throw new errors_1.AppError(errors_1.ERROR_CODES.CAMPAIGN_NOT_FOUND, `Campaign with ID ${id} not found`, 404);
            }
            return campaign;
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
            const updatedCampaign = yield this.campaignRepository.update(id, campaign);
            if (!updatedCampaign) {
                throw new errors_1.AppError(errors_1.ERROR_CODES.CAMPAIGN_NOT_FOUND, `Campaign with ID ${id} not found`, 404);
            }
            return updatedCampaign;
        });
    }
    /**
     * Delete a campaign (soft delete)
     * @param id Campaign ID
     * @returns True if deleted, false otherwise
     */
    deleteCampaign(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const deleted = yield this.campaignRepository.softDelete(id);
            if (!deleted) {
                throw new errors_1.AppError(errors_1.ERROR_CODES.CAMPAIGN_NOT_FOUND, `Campaign with ID ${id} not found`, 404);
            }
            return deleted;
        });
    }
    /**
     * Get campaign statistics
     * @param id Campaign ID
     * @returns Campaign statistics or null if not found
     */
    getCampaignStats(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield this.campaignRepository.getCampaignStats(id);
            if (!stats) {
                throw new errors_1.AppError(errors_1.ERROR_CODES.CAMPAIGN_NOT_FOUND, `Campaign with ID ${id} not found`, 404);
            }
            return stats;
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
    /**
     * Get leads for a campaign for CSV export
     * @param campaignId Campaign ID
     * @returns Array of leads with required columns
     */
    getLeadsForCampaignCsv(campaignId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.campaignRepository.getLeadsForCampaignCsv(campaignId);
        });
    }
    /**
     * Upload recipients from CSV and upsert into mail_recipients
     * @param campaignId Campaign ID
     * @param records Parsed CSV records
     */
    uploadRecipientsFromCsv(campaignId, records) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const errors = [];
            let inserted = 0;
            let updated = 0;
            // Get all existing loan_ids for this campaign
            const loanIdMap = yield this.campaignRepository.getRecipientLoanIdsByCampaignId(campaignId);
            // Date calculations (mimic Python logic)
            const now = new Date();
            const addDays = (date, days) => {
                const d = new Date(date);
                d.setDate(d.getDate() + days);
                return d;
            };
            const monthName = (date) => date.toLocaleString('default', { month: 'long' });
            const closeMonth = monthName(addDays(now, 21));
            const skipMonth = monthName(addDays(now, 21 + 32));
            const nextPayMonth = monthName(addDays(now, 21 + 32 + 32));
            // Next Friday for mail_date
            const daysUntilFriday = (5 - now.getDay() + 7) % 7;
            const mailDate = addDays(now, daysUntilFriday);
            const mailDateStr = mailDate.toISOString().slice(0, 10);
            const phoneNumber = '855-235-5834';
            const qrBaseUrl = 'https://elevated.loans/my-loan/';
            const toInsert = [];
            const toUpdate = [];
            for (const row of records) {
                try {
                    const loan_id = (_a = row['loan_id']) === null || _a === void 0 ? void 0 : _a.trim();
                    if (!loan_id) {
                        errors.push(`Missing loan_id in row: ${JSON.stringify(row)}`);
                        continue;
                    }
                    // Map CSV fields to DB columns
                    const recipient = {
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
                    }
                    else {
                        // Insert new
                        toInsert.push(recipient);
                    }
                }
                catch (e) {
                    errors.push(`Error processing row: ${JSON.stringify(row)} - ${e.message}`);
                }
            }
            if (toInsert.length > 0) {
                inserted = yield this.campaignRepository.insertRecipientsBulk(toInsert);
            }
            if (toUpdate.length > 0) {
                updated = yield this.campaignRepository.updateRecipientsBulk(toUpdate);
            }
            return { inserted, updated, errors };
        });
    }
}
exports.CampaignService = CampaignService;
