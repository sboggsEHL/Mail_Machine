import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * Base repository class with common database operations
 */
export abstract class BaseRepository<T extends QueryResultRow> {
  protected tableName: string;
  protected pool: Pool;

  constructor(pool: Pool, tableName: string) {
    this.pool = pool;
    this.tableName = tableName;
  }

  /**
   * Get a database client from the pool for transaction handling
   * @returns A database client from the pool
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Find an entity by its ID
   * @param id The entity ID
   * @param client Optional client for transaction handling
   * @returns The entity or null if not found
   */
  async findById(id: number | string, client?: PoolClient): Promise<T | null> {
    const queryExecutor = client || this.pool;
    const idField = this.getIdFieldName();
    
    const result = await queryExecutor.query<T>(
      `SELECT * FROM ${this.tableName} WHERE ${idField} = $1`,
      [id]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find all entities
   * @param client Optional client for transaction handling
   * @returns Array of entities
   */
  async findAll(client?: PoolClient): Promise<T[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<T>(
      `SELECT * FROM ${this.tableName} WHERE is_active = true`
    );
    
    return result.rows;
  }

  /**
   * Create a new entity
   * @param entity The entity to create
   * @param client Optional client for transaction handling
   * @returns The created entity with its ID
   */
  async create(entity: Partial<T>, client?: PoolClient): Promise<T> {
    const queryExecutor = client || this.pool;
    
    // Filter out undefined values and create columns and values arrays
    const entries = Object.entries(entity).filter(([_, value]) => value !== undefined);
    const columns = entries.map(([key]) => key);
    
    // Process values to ensure consistent types
    const values = entries.map(([key, value]) => {
      // Ensure string values for specific fields
      if (typeof value === 'string') {
        // Explicitly cast string values to VARCHAR to avoid text vs varchar issues
        return value;
      }
      return value;
    });
    
    // Create the SQL placeholders with explicit type casting for strings
    const placeholders = entries.map(([key, value], index) => {
      if (typeof value === 'string') {
        // Use explicit type casting for string values
        return `$${index + 1}::VARCHAR`;
      }
      return `$${index + 1}`;
    }).join(', ');
    
    const result = await queryExecutor.query<T>(
      `INSERT INTO ${this.tableName} (${columns.join(', ')})
       VALUES (${placeholders})
       RETURNING *`,
      values
    );
    
    return result.rows[0];
  }

  /**
   * Update an entity
   * @param id The entity ID
   * @param entity The entity fields to update
   * @param client Optional client for transaction handling
   * @returns The updated entity
   */
  async update(id: number | string, entity: Partial<T>, client?: PoolClient): Promise<T | null> {
    const queryExecutor = client || this.pool;
    const idField = this.getIdFieldName();
    
    // Filter out undefined values and create set clauses
    const entries = Object.entries(entity).filter(([_, value]) => value !== undefined);
    const setClauses = entries.map(([key], index) => `${key} = $${index + 2}`).join(', ');
    const values = entries.map(([_, value]) => value);
    
    if (entries.length === 0) {
      // No fields to update
      return this.findById(id, client);
    }
    
    const result = await queryExecutor.query<T>(
      `UPDATE ${this.tableName}
       SET ${setClauses}
       WHERE ${idField} = $1
       RETURNING *`,
      [id, ...values]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Set an entity's is_active flag to false (soft delete)
   * @param id The entity ID
   * @param client Optional client for transaction handling
   * @returns True if the entity was deleted, false otherwise
   */
  async softDelete(id: number | string, client?: PoolClient): Promise<boolean> {
    const queryExecutor = client || this.pool;
    const idField = this.getIdFieldName();
    
    const result = await queryExecutor.query(
      `UPDATE ${this.tableName}
       SET is_active = false, updated_at = NOW()
       WHERE ${idField} = $1
       RETURNING ${idField}`,
      [id]
    );
    
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Hard delete an entity
   * @param id The entity ID
   * @param client Optional client for transaction handling
   * @returns True if the entity was deleted, false otherwise
   */
  async hardDelete(id: number | string, client?: PoolClient): Promise<boolean> {
    const queryExecutor = client || this.pool;
    const idField = this.getIdFieldName();
    
    const result = await queryExecutor.query(
      `DELETE FROM ${this.tableName}
       WHERE ${idField} = $1`,
      [id]
    );
    
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get the name of the ID field for this entity
   * Override in derived classes if needed
   */
  protected getIdFieldName(): string {
    return `${this.tableName.slice(0, -1)}_id`;
  }

  /**
   * Execute a raw SQL query
   * @param sql SQL query string
   * @param params Query parameters
   * @param client Optional client for transaction handling
   * @returns Query result
   */
  protected async query<R extends QueryResultRow = any>(sql: string, params: any[] = [], client?: PoolClient): Promise<QueryResult<R>> {
    const queryExecutor = client || this.pool;
    return queryExecutor.query<R>(sql, params);
  }
}
