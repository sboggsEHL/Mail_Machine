import { Pool, PoolClient } from 'pg';
import { PropertyOwner } from '../../shared/types/database';
import { BaseRepository } from './BaseRepository';

/**
 * Repository for property owners
 */
export class PropertyOwnerRepository extends BaseRepository<PropertyOwner> {
  constructor(pool: Pool) {
    super(pool, 'property_owners');
  }

  /**
   * Find primary owners for a property
   * @param propertyId Property ID
   * @param client Optional client for transaction handling
   * @returns The primary property owner or null if not found
   */
  async findPrimaryByPropertyId(propertyId: number, client?: PoolClient): Promise<PropertyOwner | null> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<PropertyOwner>(
      `SELECT * FROM ${this.tableName} 
       WHERE property_id = $1 
       AND is_primary_contact = true
       AND is_active = true`,
      [propertyId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find all owners for a property
   * @param propertyId Property ID
   * @param client Optional client for transaction handling
   * @returns Array of property owners
   */
  async findByPropertyId(propertyId: number, client?: PoolClient): Promise<PropertyOwner[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<PropertyOwner>(
      `SELECT * FROM ${this.tableName} 
       WHERE property_id = $1 
       AND is_active = true
       ORDER BY is_primary_contact DESC, owner_id ASC`,
      [propertyId]
    );
    
    return result.rows;
  }

  /**
   * Find owners by name
   * @param name Full or partial name to search for
   * @param limit Maximum number of owners to return
   * @param offset Offset for pagination
   * @param client Optional client for transaction handling
   * @returns Array of property owners
   */
  async findByName(
    name: string,
    limit: number = 100,
    offset: number = 0,
    client?: PoolClient
  ): Promise<PropertyOwner[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<PropertyOwner>(
      `SELECT * FROM ${this.tableName} 
       WHERE (
         full_name ILIKE $1 
         OR first_name ILIKE $1 
         OR last_name ILIKE $1
       )
       AND is_active = true
       ORDER BY owner_id DESC
       LIMIT $2 OFFSET $3`,
      [`%${name}%`, limit, offset]
    );
    
    return result.rows;
  }

  /**
   * Find owners with available contact information
   * @param type Contact type ('phone', 'email', or 'both')
   * @param limit Maximum number of owners to return
   * @param offset Offset for pagination
   * @param client Optional client for transaction handling
   * @returns Array of property owners
   */
  async findWithContactInfo(
    type: 'phone' | 'email' | 'both',
    limit: number = 100,
    offset: number = 0,
    client?: PoolClient
  ): Promise<PropertyOwner[]> {
    const queryExecutor = client || this.pool;
    
    let whereClause = '';
    
    switch (type) {
      case 'phone':
        whereClause = 'phone_availability = true';
        break;
      case 'email':
        whereClause = 'email_availability = true';
        break;
      case 'both':
        whereClause = 'phone_availability = true AND email_availability = true';
        break;
    }
    
    const result = await queryExecutor.query<PropertyOwner>(
      `SELECT * FROM ${this.tableName} 
       WHERE ${whereClause}
       AND is_active = true
       ORDER BY owner_id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    return result.rows;
  }

  /**
   * Insert or update multiple owners for a property
   * @param propertyId Property ID
   * @param owners Array of owner data
   * @param client Optional client for transaction handling
   * @returns Array of created/updated owners
   */
  async bulkUpsert(
    propertyId: number,
    owners: Partial<PropertyOwner>[],
    client?: PoolClient
  ): Promise<PropertyOwner[]> {
    const managedClient = client ? false : true;
    const queryExecutor = client || await this.getClient();
    
    try {
      if (managedClient) {
        await queryExecutor.query('BEGIN');
      }
      
      const results: PropertyOwner[] = [];
      
      // Process each owner
      for (const ownerData of owners) {
        const owner = { ...ownerData, property_id: propertyId };
        
        // If we have an owner_id, update the existing owner
        if (owner.owner_id) {
          const updated = await this.update(owner.owner_id, owner, queryExecutor);
          if (updated) {
            results.push(updated);
          }
        } else {
          // Otherwise create a new owner
          const created = await this.create(owner, queryExecutor);
          results.push(created);
        }
      }
      
      if (managedClient) {
        await queryExecutor.query('COMMIT');
      }
      
      return results;
    } catch (error) {
      if (managedClient) {
        await queryExecutor.query('ROLLBACK');
      }
      throw error;
    } finally {
      if (managedClient && queryExecutor) {
        queryExecutor.release();
      }
    }
  }

  /**
   * Update first_name for multiple property owners in bulk
   * @param updates Array of objects containing owner_id and first_name
   * @param client Optional client for transaction handling
   * @returns Number of updated rows
   */
  async updateFirstNameBulk(
    updates: {owner_id: number, first_name: string}[],
    client?: PoolClient
  ): Promise<number> {
    if (updates.length === 0) return 0;
    const queryExecutor = client || this.pool;
    
    // Build parameterized query for multiple updates
    const params: any[] = [];
    const cases: string[] = [];
    
    updates.forEach((update, i) => {
      params.push(update.owner_id, update.first_name);
      cases.push(`WHEN owner_id = $${i*2+1} THEN $${i*2+2}`);
    });
    
    const ownerIds = updates.map((u, i) => `$${i*2+1}`).join(',');
    
    const query = `
      UPDATE ${this.tableName}
      SET first_name = CASE ${cases.join(' ')} END,
          updated_at = NOW()
      WHERE owner_id IN (${ownerIds})
      RETURNING owner_id
    `;
    
    const result = await queryExecutor.query(query, params);
    return result.rowCount ?? 0;
  }

  /**
   * Update first_name for a single property owner
   * @param ownerId Owner ID
   * @param firstName New first name
   * @param client Optional client for transaction handling
   * @returns True if updated, false otherwise
   */
  async updateFirstNameById(
    ownerId: number, 
    firstName: string, 
    client?: PoolClient
  ): Promise<boolean> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query(
      `UPDATE ${this.tableName} 
       SET first_name = $1, updated_at = NOW()
       WHERE owner_id = $2
       RETURNING owner_id`,
      [firstName, ownerId]
    );
    
    return (result.rowCount ?? 0) > 0;
  }
}
