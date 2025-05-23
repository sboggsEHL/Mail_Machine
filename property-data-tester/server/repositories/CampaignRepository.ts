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
   * Get all loan_ids for a campaign's recipients
   * @param campaignId Campaign ID
   * @param client Optional client for transaction handling
   * @returns Map of loan_id to recipient_id
   */
  async getRecipientLoanIdsByCampaignId(
    campaignId: number,
    client?: PoolClient
  ): Promise<Map<string, number>> {
    const queryExecutor = client || this.pool;
    const result = await queryExecutor.query<{ loan_id: string, recipient_id: number }>(
      `SELECT loan_id, recipient_id FROM mail_recipients WHERE campaign_id = $1`,
      [campaignId]
    );
    const map = new Map<string, any>(); // Use <string, any> to avoid TS inference issue
    result.rows.forEach(row => {
      if (row && typeof row.loan_id === 'string' && typeof row.recipient_id === 'number') {
        map.set(row.loan_id, row.recipient_id);
      }
    });
    return map; // Return type is still Promise<Map<string, number>>
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
   * Search recipients with custom search query
   * @param searchQuery Additional WHERE clause for search
   * @param params Query parameters (campaignId, searchTerm, limit, offset)
   * @param client Optional client for transaction handling
   * @returns Array of matching recipients
   */
  async searchRecipients(
    searchQuery: string,
    params: any[],
    client?: PoolClient
  ): Promise<any[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<any>(`
      SELECT * FROM mail_recipients
      WHERE campaign_id = $1
      ${searchQuery}
      ORDER BY recipient_id
      LIMIT $3 OFFSET $4
    `, params);
    
    return result.rows;
  }

  /**
   * Count recipients matching search criteria
   * @param searchQuery Additional WHERE clause for search
   * @param params Query parameters (campaignId, searchTerm)
   * @param client Optional client for transaction handling
   * @returns Number of matching recipients
   */
  async countSearchRecipients(
    searchQuery: string,
    params: any[],
    client?: PoolClient
  ): Promise<number> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<{ count: string }>(`
      SELECT COUNT(*) as count FROM mail_recipients
      WHERE campaign_id = $1
      ${searchQuery}
    `, params.slice(0, 2)); // Only need campaignId and searchTerm
    
    return parseInt(result.rows[0].count);
  }

  /**
   * Bulk insert recipients into mail_recipients
   * @param recipients Array of recipient objects
   * @param client Optional client for transaction handling
   * @returns Number of inserted rows
   */
  async insertRecipientsBulk(
    recipients: any[],
    client?: PoolClient
  ): Promise<number> {
    if (recipients.length === 0) return 0;
    const queryExecutor = client || this.pool;

    // Get all columns from the first recipient
    const columns = Object.keys(recipients[0]);
    const colNames = columns.map(col => `"${col}"`).join(', ');
    
    // Process in batches to avoid PostgreSQL parameter limit (max 65535)
    const BATCH_SIZE = 500; // Reduced from 1000 to avoid parameter limit issues
    let totalRowsInserted = 0;
    
    // Process recipients in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      
      const values = batch.map(rec =>
        columns.map(col => rec[col])
      );
      
      // Build parameterized values string for this batch
      const valuePlaceholders = values
        .map(
          (row, batchIndex) =>
            `(${row.map((_, j) => `$${batchIndex * columns.length + j + 1}`).join(', ')})`
        )
        .join(', ');

      const flatValues = values.flat();

      const query = `
        INSERT INTO mail_recipients (${colNames})
        VALUES ${valuePlaceholders}
        RETURNING recipient_id
      `;

      const result = await queryExecutor.query(query, flatValues);
      totalRowsInserted += result.rowCount ?? 0;
    }
    
    return totalRowsInserted;
  }

  /**
   * Bulk update recipients in mail_recipients by recipient_id
   * @param recipients Array of recipient objects (must include recipient_id)
   * @param client Optional client for transaction handling
   * @returns Number of updated rows
   */
  async updateRecipientsBulk(
    recipients: any[],
    client?: PoolClient
  ): Promise<number> {
    if (recipients.length === 0) return 0;
    const queryExecutor = client || this.pool;

    // Assume all recipients have the same fields
    const columns = Object.keys(recipients[0]).filter(
      col => col !== 'recipient_id' && col !== 'created_at' // Exclude recipient_id and created_at from update
    );
    
    // Process in batches to avoid PostgreSQL parameter limit (max 65535)
    const BATCH_SIZE = 500; // Smaller batch size for updates since they use more parameters per record
    let totalRowsAffected = 0;
    
    // Process recipients in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      let batchRowsAffected = 0;

      for (const rec of batch) {
        // Build SET clauses for this recipient
        const setClauses = columns
          .map((col, idx) => `"${col}" = $${idx + 1}`)
          .join(', ');

        // Add updated_at separately
        const finalSetClause = `${setClauses}, "updated_at" = NOW()`;

        // Prepare parameters for SET columns
        const setParams = columns.map(col => rec[col]);
        // Add the recipient_id parameter for the WHERE clause
        setParams.push(rec.recipient_id);

        // Construct the UPDATE statement for this recipient
        const updateStatement = `UPDATE mail_recipients SET ${finalSetClause} WHERE "recipient_id" = $${columns.length + 1};`;

        // Execute the UPDATE statement for this recipient
        const result = await queryExecutor.query(updateStatement, setParams);
        batchRowsAffected += result.rowCount ?? 0;
      }

      totalRowsAffected += batchRowsAffected;
    }
    
    return totalRowsAffected;
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

  /**
   * Get leads for a campaign for CSV export
   * @param campaignId Campaign ID
   * @returns Array of leads with required columns
   */
  async getLeadsForCampaignCsv(campaignId: number, client?: PoolClient): Promise<any[]> {
    const queryExecutor = client || this.pool;
    const result = await queryExecutor.query(
      `SELECT
        property_address AS address,
        property_city AS city,
        property_state AS state,
        property_zip AS zip,
        loan_id,
        primary_owner_first_name AS first_name,
        primary_owner_last_name AS last_name
      FROM public.complete_property_view
      WHERE campaign_id = $1
      ORDER BY property_address`,
      [campaignId]
    );
    return result.rows;
  }
}
