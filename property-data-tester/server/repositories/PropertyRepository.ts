import { Pool, PoolClient } from 'pg';
import { Property } from '../../shared/types/database';
import { BaseRepository } from './BaseRepository';

/**
 * Repository for properties
 */
export class PropertyRepository extends BaseRepository<Property> {
  constructor(pool: Pool) {
    super(pool, 'properties');
  }

  /**
   * Find a property by its RadarID
   * @param radarId PropertyRadar ID
   * @param client Optional client for transaction handling
   * @returns The property or null if not found
   */
  async findByRadarId(radarId: string, client?: PoolClient): Promise<Property | null> {
    const queryExecutor = client || this.pool;
    
    // Ensure radarId is a string and use explicit type casting in the query
    const radarIdString = String(radarId);
    
    const result = await queryExecutor.query<Property>(
      `SELECT * FROM ${this.tableName} WHERE radar_id = $1::VARCHAR AND is_active = true`,
      [radarIdString]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find properties by address and city
   * @param address Property address
   * @param city Property city
   * @param state Property state (optional)
   * @param client Optional client for transaction handling
   * @returns Array of matching properties
   */
  async findByAddress(
    address: string,
    city: string,
    state?: string,
    client?: PoolClient
  ): Promise<Property[]> {
    const queryExecutor = client || this.pool;
    
    let query = `
      SELECT * FROM ${this.tableName} 
      WHERE property_address ILIKE $1 
      AND property_city ILIKE $2`;
    
    const params: any[] = [`%${address}%`, `%${city}%`];
    
    if (state) {
      query += ` AND property_state = $3`;
      params.push(state);
    }
    
    query += ` AND is_active = true`;
    
    const result = await queryExecutor.query<Property>(query, params);
    
    return result.rows;
  }

  /**
   * Find properties by provider ID
   * @param providerId Lead provider ID
   * @param limit Maximum number of properties to return
   * @param offset Offset for pagination
   * @param client Optional client for transaction handling
   * @returns Array of properties
   */
  async findByProviderId(
    providerId: number,
    limit: number = 100,
    offset: number = 0,
    client?: PoolClient
  ): Promise<Property[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<Property>(
      `SELECT * FROM ${this.tableName} 
       WHERE provider_id = $1 AND is_active = true
       ORDER BY property_id DESC
       LIMIT $2 OFFSET $3`,
      [providerId, limit, offset]
    );
    
    return result.rows;
  }

  /**
   * Find properties with specific criteria
   * @param criteria Object with property field criteria
   * @param limit Maximum number of properties to return
   * @param offset Offset for pagination
   * @param client Optional client for transaction handling
   * @returns Array of properties matching criteria
   */
  async findByCriteria(
    criteria: Partial<Property> & { [key: string]: any },
    limit: number = 100,
    offset: number = 0,
    client?: PoolClient
  ): Promise<Property[]> {
    const queryExecutor = client || this.pool;
    
    // Filter out undefined values and build WHERE clauses
    const entries = Object.entries(criteria).filter(([_, value]) => value !== undefined);
    
    if (entries.length === 0) {
      return this.findAll(client);
    }
    
    const whereClauses = entries.map(([key], index) => {
      if (typeof criteria[key] === 'string') {
        if (!['provider_id', 'property_id', 'radar_id'].includes(key)) {
          return `${key} ILIKE $${index + 1}`;
        } else if (key === 'radar_id') {
          // Use explicit type casting for radar_id
          return `${key} = $${index + 1}::VARCHAR`;
        }
      }
      return `${key} = $${index + 1}`;
    });
    
    const values = entries.map(([key, value]) => {
      if (typeof value === 'string') {
        if (!['provider_id', 'property_id', 'radar_id'].includes(key)) {
          return `%${value}%`;
        } else if (key === 'radar_id') {
          // Ensure radar_id is a string
          return String(value);
        }
      }
      return value;
    });
    
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE ${whereClauses.join(' AND ')} AND is_active = true
      ORDER BY property_id DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    
    const result = await queryExecutor.query<Property>(
      query,
      [...values, limit, offset]
    );
    
    return result.rows;
  }

  /**
   * Count properties with specific criteria
   * @param criteria Object with property field criteria
   * @param client Optional client for transaction handling
   * @returns Count of properties matching criteria
   */
  async countByCriteria(
    criteria: Partial<Property> & { [key: string]: any },
    client?: PoolClient
  ): Promise<number> {
    const queryExecutor = client || this.pool;
    
    // Filter out undefined values and build WHERE clauses
    const entries = Object.entries(criteria).filter(([_, value]) => value !== undefined);
    
    if (entries.length === 0) {
      const result = await queryExecutor.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_active = true`
      );
      return parseInt(result.rows[0].count, 10);
    }
    
    const whereClauses = entries.map(([key], index) => {
      if (typeof criteria[key] === 'string') {
        if (!['provider_id', 'property_id', 'radar_id'].includes(key)) {
          return `${key} ILIKE $${index + 1}`;
        } else if (key === 'radar_id') {
          // Use explicit type casting for radar_id
          return `${key} = $${index + 1}::VARCHAR`;
        }
      }
      return `${key} = $${index + 1}`;
    });
    
    const values = entries.map(([key, value]) => {
      if (typeof value === 'string') {
        if (!['provider_id', 'property_id', 'radar_id'].includes(key)) {
          return `%${value}%`;
        } else if (key === 'radar_id') {
          // Ensure radar_id is a string
          return String(value);
        }
      }
      return value;
    });
    
    const query = `
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE ${whereClauses.join(' AND ')} AND is_active = true
    `;
    
    const result = await queryExecutor.query<{ count: string }>(query, values);
    
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get the complete property data with owners and loans
   * @param propertyId Property ID
   * @param client Optional client for transaction handling
   * @returns Complete property data or null if not found
   */
  async getCompletePropertyData(
    propertyId: number,
    client?: PoolClient
  ): Promise<any | null> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query(
      `SELECT * FROM complete_property_view WHERE property_id = $1`,
      [propertyId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Override the ID field name to use property_id instead of propertie_id
   * @returns The correct ID field name
   */
  protected getIdFieldName(): string {
    return 'property_id';  // Override to return the correct column name
  }
}
