import { Pool, PoolClient } from 'pg';
import { BaseRepository } from './BaseRepository';
import { Campaign, CampaignStats, Recipient } from '../models';

/**
 * Repository for managing campaigns in the database
 */
export class CampaignRepository extends BaseRepository<Campaign> {
  /**
   * Create a new CampaignRepository
   * @param pool Database connection pool
   */
  constructor(pool: Pool) {
    super(pool, 'mail_campaigns');
  }

  /**
   * Get all campaigns ordered by campaign date
   * @param client Optional client for transaction handling
   * @returns Array of campaigns
   */
  async getCampaigns(client?: PoolClient): Promise<Campaign[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<Campaign>(`
      SELECT * FROM mail_campaigns
      ORDER BY campaign_date DESC
    `);
    
    return result.rows;
  }

  /**
   * Get campaign statistics
   * @param id Campaign ID
   * @param client Optional client for transaction handling
   * @returns Campaign statistics or null if not found
   */
  async getCampaignStats(id: number, client?: PoolClient): Promise<CampaignStats | null> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<CampaignStats>(`
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
  }

  /**
   * Get recipients for a campaign
   * @param campaignId Campaign ID
   * @param limit Maximum number of recipients to return
   * @param offset Offset for pagination
   * @param client Optional client for transaction handling
   * @returns Array of recipients
   */
  async getRecipientsByCampaignId(
    campaignId: number, 
    limit: number = 100, 
    offset: number = 0,
    client?: PoolClient
  ): Promise<Recipient[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<Recipient>(`
      SELECT * FROM mail_recipients
      WHERE campaign_id = $1
      ORDER BY recipient_id
      LIMIT $2 OFFSET $3
    `, [campaignId, limit, offset]);
    
    return result.rows;
  }

  /**
   * Count recipients for a campaign
   * @param campaignId Campaign ID
   * @param client Optional client for transaction handling
   * @returns Number of recipients
   */
  async countRecipientsByCampaignId(campaignId: number, client?: PoolClient): Promise<number> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<{ count: string }>(`
      SELECT COUNT(*) as count FROM mail_recipients
      WHERE campaign_id = $1
    `, [campaignId]);
    
    return parseInt(result.rows[0].count);
  }

  /**
   * Override the getIdFieldName method to return the correct ID field name
   */
  protected getIdFieldName(): string {
    return 'campaign_id';
  }

  /**
   * Override findAll to not use is_active column
   * @param client Optional client for transaction handling
   * @returns Array of campaigns
   */
  async findAll(client?: PoolClient): Promise<Campaign[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<Campaign>(`
      SELECT * FROM ${this.tableName}
    `);
    
    return result.rows;
  }

  /**
   * Override softDelete to use a different approach since is_active doesn't exist
   * @param id Campaign ID
   * @param client Optional client for transaction handling
   * @returns True if the campaign was deleted, false otherwise
   */
  async softDelete(id: number | string, client?: PoolClient): Promise<boolean> {
    const queryExecutor = client || this.pool;
    const idField = this.getIdFieldName();
    
    // Instead of setting is_active to false, we'll set status to 'CANCELLED'
    const result = await queryExecutor.query(
      `UPDATE ${this.tableName}
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE ${idField} = $1
       RETURNING ${idField}`,
      [id]
    );
    
    return (result.rowCount ?? 0) > 0;
  }
}