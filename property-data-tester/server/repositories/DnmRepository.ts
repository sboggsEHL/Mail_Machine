import { Pool, PoolClient } from 'pg';
import { DnmRegistry } from '../../shared/types/database';
import { BaseRepository } from './BaseRepository';

/**
 * Repository for Do Not Mail registry
 */
export class DnmRepository extends BaseRepository<DnmRegistry> {
  constructor(pool: Pool) {
    super(pool, 'dnm_registry');
  }

  /**
   * Check if an entity is in the DNM registry
   * @param identifiers Object with identifying fields (loan_id, property_id, or radar_id)
   * @param client Optional client for transaction handling
   * @returns Whether the entity is in the DNM registry
   */
  async isInDnmRegistry(
    identifiers: {
      loan_id?: string;
      property_id?: number;
      radar_id?: string;
    },
    client?: PoolClient
  ): Promise<boolean> {
    const queryExecutor = client || this.pool;
    
    // Build the query conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (identifiers.loan_id) {
      conditions.push(`loan_id = $${paramIndex++}`);
      params.push(identifiers.loan_id);
    }
    
    if (identifiers.property_id) {
      conditions.push(`property_id = $${paramIndex++}`);
      params.push(identifiers.property_id);
    }
    
    if (identifiers.radar_id) {
      conditions.push(`radar_id = $${paramIndex++}`);
      params.push(identifiers.radar_id);
    }
    
    if (conditions.length === 0) {
      throw new Error('At least one identifier (loan_id, property_id, or radar_id) is required');
    }
    
    // Query the dnm_registry
    const result = await queryExecutor.query<DnmRegistry>(
      `SELECT * FROM ${this.tableName} 
       WHERE (${conditions.join(' OR ')}) AND is_active = TRUE
       LIMIT 1`,
      params
    );
    
    return result.rows.length > 0;
  }

  /**
   * Find DNM registry entries for a property
   * @param propertyId Property ID
   * @param client Optional client for transaction handling
   * @returns Array of DNM registry entries
   */
  async findByPropertyId(propertyId: number, client?: PoolClient): Promise<DnmRegistry[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<DnmRegistry>(
      `SELECT * FROM ${this.tableName} 
       WHERE property_id = $1 AND is_active = TRUE
       ORDER BY blocked_at DESC`,
      [propertyId]
    );
    
    return result.rows;
  }

  /**
   * Find DNM registry entries for a loan
   * @param loanId Loan ID
   * @param client Optional client for transaction handling
   * @returns Array of DNM registry entries
   */
  async findByLoanId(loanId: string, client?: PoolClient): Promise<DnmRegistry[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<DnmRegistry>(
      `SELECT * FROM ${this.tableName} 
       WHERE loan_id = $1 AND is_active = TRUE
       ORDER BY blocked_at DESC`,
      [loanId]
    );
    
    return result.rows;
  }

  /**
   * Find DNM registry entries for a radar ID
   * @param radarId PropertyRadar ID
   * @param client Optional client for transaction handling
   * @returns Array of DNM registry entries
   */
  async findByRadarId(radarId: string, client?: PoolClient): Promise<DnmRegistry[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<DnmRegistry>(
      `SELECT * FROM ${this.tableName} 
       WHERE radar_id = $1 AND is_active = TRUE
       ORDER BY blocked_at DESC`,
      [radarId]
    );
    
    return result.rows;
  }

  /**
   * Find active DNM radar_ids from a list.
   * @param radarIds List of radar_ids to check
   * @returns List of radar_ids present and active in DNM
   */
  async findActiveRadarIds(radarIds: string[]): Promise<string[]> {
    if (!radarIds.length) return [];
    const result = await this.pool.query(
      `SELECT radar_id FROM ${this.tableName} WHERE radar_id = ANY($1) AND is_active = TRUE`,
      [radarIds]
    );
    return result.rows.map(row => row.radar_id);
  }

  /**
   * Find DNM entries by multiple loan IDs
   * @param loanIds Array of loan IDs to check
   * @returns Array of DNM registry entries
   */
  async findByLoanIds(loanIds: string[]): Promise<DnmRegistry[]> {
    if (!loanIds.length) return [];
    
    const result = await this.pool.query<DnmRegistry>(
      `SELECT * FROM ${this.tableName} 
       WHERE loan_id = ANY($1) AND is_active = TRUE
       ORDER BY blocked_at DESC`,
      [loanIds]
    );
    
    return result.rows;
  }

  /**
   * Find DNM entries by multiple property IDs
   * @param propertyIds Array of property IDs to check
   * @returns Array of DNM registry entries
   */
  async findByPropertyIds(propertyIds: number[]): Promise<DnmRegistry[]> {
    if (!propertyIds.length) return [];
    
    const result = await this.pool.query<DnmRegistry>(
      `SELECT * FROM ${this.tableName} 
       WHERE property_id = ANY($1) AND is_active = TRUE
       ORDER BY blocked_at DESC`,
      [propertyIds]
    );
    
    return result.rows;
  }

  /**
   * Find DNM registry entries by source
   * @param source Source of the DNM entry
   * @param limit Maximum number of entries to return
   * @param offset Offset for pagination
   * @param client Optional client for transaction handling
   * @returns Array of DNM registry entries
   */
  async findBySource(
    source: string,
    limit: number = 100,
    offset: number = 0,
    client?: PoolClient
  ): Promise<DnmRegistry[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<DnmRegistry>(
      `SELECT * FROM ${this.tableName} 
       WHERE source = $1 AND is_active = TRUE
       ORDER BY blocked_at DESC
       LIMIT $2 OFFSET $3`,
      [source, limit, offset]
    );
    
    return result.rows;
  }

  /**
   * Find DNM registry entries by blocked by
   * @param blockedBy Username who blocked the entity
   * @param limit Maximum number of entries to return
   * @param offset Offset for pagination
   * @param client Optional client for transaction handling
   * @returns Array of DNM registry entries
   */
  async findByBlockedBy(
    blockedBy: string,
    limit: number = 100,
    offset: number = 0,
    client?: PoolClient
  ): Promise<DnmRegistry[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<DnmRegistry>(
      `SELECT * FROM ${this.tableName} 
       WHERE blocked_by = $1 AND is_active = TRUE
       ORDER BY blocked_at DESC
       LIMIT $2 OFFSET $3`,
      [blockedBy, limit, offset]
    );
    
    return result.rows;
  }

  /**
   * Add an entity to the DNM registry
   * @param data DNM registry entry data
   * @param client Optional client for transaction handling
   * @returns The created DNM registry entry
   */
  async addToDnm(
    data: {
      loan_id?: string;
      property_id?: number;
      radar_id?: string;
      reason?: string;
      reason_category?: string;
      source: string;
      blocked_by: string;
      notes?: string;
    },
    client?: PoolClient
  ): Promise<DnmRegistry> {
    // Validate required fields
    if (!data.loan_id && !data.property_id && !data.radar_id) {
      throw new Error('At least one identifier (loan_id, property_id, or radar_id) is required');
    }
    
    // Set default values
    const dnmEntry: Partial<DnmRegistry> = {
      loan_id: data.loan_id,
      property_id: data.property_id,
      radar_id: data.radar_id,
      reason: data.reason || 'User requested',
      reason_category: data.reason_category || 'Manual',
      source: data.source,
      blocked_by: data.blocked_by,
      blocked_at: new Date(),
      is_active: true,
      notes: data.notes
    };
    
    return this.create(dnmEntry, client);
  }

  /**
   * Remove an entity from the DNM registry
   * @param dnmId DNM registry entry ID
   * @param client Optional client for transaction handling
   * @returns Whether the entity was removed from the DNM registry
   */
  async removeFromDnm(dnmId: number, client?: PoolClient): Promise<boolean> {
    return this.softDelete(dnmId, client);
  }

  /**
   * Override the ID field name for DNM registry
   */
  protected getIdFieldName(): string {
    return 'dnm_id';
  }
}
