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
exports.CampaignRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
/**
 * Repository for managing campaigns in the database
 */
class CampaignRepository extends BaseRepository_1.BaseRepository {
    /**
     * Create a new CampaignRepository
     * @param pool Database connection pool
     */
    constructor(pool) {
        super(pool, 'mail_campaigns');
    }
    /**
     * Get all campaigns ordered by campaign date
     * @param client Optional client for transaction handling
     * @returns Array of campaigns
     */
    getCampaigns(client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`
      SELECT * FROM mail_campaigns
      ORDER BY campaign_date DESC
    `);
            return result.rows;
        });
    }
    /**
     * Get campaign statistics
     * @param id Campaign ID
     * @param client Optional client for transaction handling
     * @returns Campaign statistics or null if not found
     */
    getCampaignStats(id, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`
      SELECT 
        c.campaign_id, 
        c.campaign_name, 
        c.description,
        c.campaign_date,
        c.status,
        c.target_loan_types,
        c.target_states,
        c.date_range_start,
        c.date_range_end,
        c.created_at,
        c.updated_at,
        c.created_by,
        COUNT(r.recipient_id) AS total_recipients,
        SUM(CASE WHEN r.status = 'MAILED' THEN 1 ELSE 0 END) AS mailed_count,
        SUM(CASE WHEN r.response_date IS NOT NULL THEN 1 ELSE 0 END) AS response_count
      FROM 
        mail_campaigns c
      LEFT JOIN 
        mail_recipients r ON c.campaign_id = r.campaign_id
      WHERE 
        c.campaign_id = $1
      GROUP BY 
        c.campaign_id, c.campaign_name, c.description, c.campaign_date, 
        c.status, c.target_loan_types, c.target_states, c.date_range_start,
        c.date_range_end, c.created_at, c.updated_at, c.created_by
    `, [id]);
            if (result.rows.length === 0) {
                return null;
            }
            const stats = result.rows[0];
            // Calculate response rate if there are mailed items
            if (stats.mailed_count > 0) {
                stats.response_rate = (stats.response_count / stats.mailed_count) * 100;
            }
            return stats;
        });
    }
    /**
     * Get recipients for a campaign
     * @param campaignId Campaign ID
     * @param limit Maximum number of recipients to return
     * @param offset Offset for pagination
     * @param client Optional client for transaction handling
     * @returns Array of recipients
     */
    getRecipientsByCampaignId(campaignId_1) {
        return __awaiter(this, arguments, void 0, function* (campaignId, limit = 100, offset = 0, client) {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`
      SELECT * FROM mail_recipients
      WHERE campaign_id = $1
      ORDER BY recipient_id
      LIMIT $2 OFFSET $3
    `, [campaignId, limit, offset]);
            return result.rows;
        });
    }
    /**
     * Count recipients for a campaign
     * @param campaignId Campaign ID
     * @param client Optional client for transaction handling
     * @returns Number of recipients
     */
    countRecipientsByCampaignId(campaignId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`
      SELECT COUNT(*) as count FROM mail_recipients
      WHERE campaign_id = $1
    `, [campaignId]);
            return parseInt(result.rows[0].count);
        });
    }
    /**
     * Override the getIdFieldName method to return the correct ID field name
     */
    getIdFieldName() {
        return 'campaign_id';
    }
    /**
     * Override findAll to not use is_active column
     * @param client Optional client for transaction handling
     * @returns Array of campaigns
     */
    findAll(client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`
      SELECT * FROM ${this.tableName}
    `);
            return result.rows;
        });
    }
    /**
     * Override softDelete to use a different approach since is_active doesn't exist
     * @param id Campaign ID
     * @param client Optional client for transaction handling
     * @returns True if the campaign was deleted, false otherwise
     */
    softDelete(id, client) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const queryExecutor = client || this.pool;
            const idField = this.getIdFieldName();
            // Instead of setting is_active to false, we'll set status to 'CANCELLED'
            const result = yield queryExecutor.query(`UPDATE ${this.tableName}
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE ${idField} = $1
       RETURNING ${idField}`, [id]);
            return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
        });
    }
}
exports.CampaignRepository = CampaignRepository;
