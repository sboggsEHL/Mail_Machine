import { Pool, PoolClient } from 'pg';
import { Loan } from '../../shared/types/database';
import { BaseRepository } from './BaseRepository';

/**
 * Repository for loans
 */
export class LoanRepository extends BaseRepository<Loan> {
  constructor(pool: Pool) {
    super(pool, 'loans');
  }

  /**
   * Find loans by property ID
   * @param propertyId Property ID
   * @param client Optional client for transaction handling
   * @returns Array of loans
   */
  async findByPropertyId(propertyId: number, client?: PoolClient): Promise<Loan[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<Loan>(
      `SELECT * FROM ${this.tableName} 
       WHERE property_id = $1 
       AND is_active = true
       ORDER BY loan_position ASC, loan_id ASC`,
      [propertyId]
    );
    
    return result.rows;
  }

  /**
   * Find a loan by loan ID
   * @param loanId Loan ID
   * @param client Optional client for transaction handling
   * @returns The loan or null if not found
   */
  async findByLoanId(loanId: string, client?: PoolClient): Promise<Loan | null> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<Loan>(
      `SELECT * FROM ${this.tableName} WHERE loan_id = $1 AND is_active = true`,
      [loanId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find loans by criteria
   * @param criteria Object with loan field criteria
   * @param limit Maximum number of loans to return
   * @param offset Offset for pagination
   * @param client Optional client for transaction handling
   * @returns Array of loans matching criteria
   */
  async findByCriteria(
    criteria: Partial<Loan> & { [key: string]: any },
    limit: number = 100,
    offset: number = 0,
    client?: PoolClient
  ): Promise<Loan[]> {
    const queryExecutor = client || this.pool;
    
    // Filter out undefined values and build WHERE clauses
    const entries = Object.entries(criteria).filter(([_, value]) => value !== undefined);
    
    if (entries.length === 0) {
      return this.findAll(client);
    }
    
    const whereClauses = entries.map(([key], index) => {
      if (typeof criteria[key] === 'string' && key !== 'loan_id') {
        return `${key} ILIKE $${index + 1}`;
      }
      return `${key} = $${index + 1}`;
    });
    
    const values = entries.map(([key, value]) => {
      if (typeof value === 'string' && key !== 'loan_id') {
        return `%${value}%`;
      }
      return value;
    });
    
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE ${whereClauses.join(' AND ')} AND is_active = true
      ORDER BY loan_id DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    
    const result = await queryExecutor.query<Loan>(
      query,
      [...values, limit, offset]
    );
    
    return result.rows;
  }

  /**
   * Insert or update multiple loans for a property
   * @param propertyId Property ID
   * @param loans Array of loan data
   * @param client Optional client for transaction handling
   * @returns Array of created/updated loans
   */
  async bulkUpsert(
    propertyId: number,
    loans: Partial<Loan>[],
    client?: PoolClient
  ): Promise<Loan[]> {
    const managedClient = client ? false : true;
    const queryExecutor = client || await this.getClient();
    
    try {
      if (managedClient) {
        await queryExecutor.query('BEGIN');
      }
      
      const results: Loan[] = [];
      
      // Process each loan
      for (const loanData of loans) {
        const loan = { ...loanData, property_id: propertyId };
        
        // If we have a loan_id, update the existing loan
        if (loan.loan_id) {
          const existingLoan = await this.findByLoanId(loan.loan_id, queryExecutor);
          
          if (existingLoan) {
            const updated = await this.update(existingLoan.loan_id, loan, queryExecutor);
            if (updated) {
              results.push(updated);
            }
          } else {
            // If loan_id is provided but doesn't exist, create with that ID
            const created = await this.create(loan, queryExecutor);
            results.push(created);
          }
        } else {
          // Generate a new loan_id if one wasn't provided
          // This might need to be adjusted based on how loan_ids are generated in your system
          const loanIdResult = await queryExecutor.query<{ nextval: string }>(
            `SELECT nextval('loan_id_sequence') as nextval`
          );
          
          const newLoanId = `LN${loanIdResult.rows[0].nextval.padStart(8, '0')}`;
          const loanWithId = { ...loan, loan_id: newLoanId };
          
          const created = await this.create(loanWithId, queryExecutor);
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
   * Find loans by lender name
   * @param lenderName Lender name to search for
   * @param limit Maximum number of loans to return
   * @param offset Offset for pagination
   * @param client Optional client for transaction handling
   * @returns Array of loans
   */
  async findByLender(
    lenderName: string,
    limit: number = 100,
    offset: number = 0,
    client?: PoolClient
  ): Promise<Loan[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<Loan>(
      `SELECT * FROM ${this.tableName} 
       WHERE lender_name ILIKE $1 
       AND is_active = true
       ORDER BY loan_id DESC
       LIMIT $2 OFFSET $3`,
      [`%${lenderName}%`, limit, offset]
    );
    
    return result.rows;
  }

  /**
   * Calculate average interest rate for loans matching criteria
   * @param criteria Object with loan field criteria
   * @param client Optional client for transaction handling
   * @returns Average interest rate or null if no matching loans
   */
  async getAverageInterestRate(
    criteria: Partial<Loan> & { [key: string]: any },
    client?: PoolClient
  ): Promise<number | null> {
    const queryExecutor = client || this.pool;
    
    // Filter out undefined values and build WHERE clauses
    const entries = Object.entries(criteria).filter(([_, value]) => value !== undefined);
    
    let query = `
      SELECT AVG(interest_rate) as avg_rate
      FROM ${this.tableName} 
      WHERE interest_rate IS NOT NULL AND is_active = true
    `;
    
    const values: any[] = [];
    
    if (entries.length > 0) {
      const whereClauses = entries.map(([key], index) => {
        if (typeof criteria[key] === 'string' && key !== 'loan_id') {
          return `${key} ILIKE $${index + 1}`;
        }
        return `${key} = $${index + 1}`;
      });
      
      query += ` AND ${whereClauses.join(' AND ')}`;
      
      values.push(...entries.map(([key, value]) => {
        if (typeof value === 'string' && key !== 'loan_id') {
          return `%${value}%`;
        }
        return value;
      }));
    }
    
    const result = await queryExecutor.query<{ avg_rate: string | null }>(query, values);
    
    if (!result.rows[0].avg_rate) {
      return null;
    }
    
    return parseFloat(result.rows[0].avg_rate);
  }

  /**
   * Override the ID field name for loans
   */
  protected getIdFieldName(): string {
    return 'loan_id';
  }
}
