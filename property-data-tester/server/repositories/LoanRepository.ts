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
   * Find ALL loans (active or inactive) by property ID
   * @param propertyId Property ID
   * @param client Optional client for transaction handling
   * @returns Array of loans
   */
  async findAllByPropertyId(propertyId: number, client?: PoolClient): Promise<Loan[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<Loan>(
      `SELECT * FROM ${this.tableName}
       WHERE property_id = $1
       ORDER BY is_active DESC, loan_position ASC, loan_id ASC`, // Prioritize active, then position, then ID
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
    
    // Ensure loanId is a string and use explicit type casting
    const loanIdString = String(loanId);
    
    const result = await queryExecutor.query<Loan>(
      `SELECT * FROM ${this.tableName} WHERE loan_id = $1::VARCHAR AND is_active = true`,
      [loanIdString]
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
      if (typeof criteria[key] === 'string') {
        if (key !== 'loan_id') {
          return `${key} ILIKE $${index + 1}`;
        } else {
          // Use explicit type casting for loan_id
          return `${key} = $${index + 1}::VARCHAR`;
        }
      }
      return `${key} = $${index + 1}`;
    });
    
    const values = entries.map(([key, value]) => {
      if (typeof value === 'string') {
        if (key !== 'loan_id') {
          return `%${value}%`;
        } else {
          // Ensure loan_id is a string
          return String(value);
        }
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
    const managedClient = !client;
    const queryExecutor = client || await this.getClient();

    try {
      if (managedClient) {
        await queryExecutor.query('BEGIN');
      }

      if (loans.length === 0) {
          console.log(`[LoanRepo.bulkUpsert] No loan data provided for property ${propertyId}. Skipping.`);
          return [];
      }

      // We expect only one consolidated loan object from the transformer
      const consolidatedLoanData = { ...loans[0], property_id: propertyId };

      // Find *ANY* existing loan (active or inactive) for the property
      // Use the new method findAllByPropertyId
      const allExistingLoans = await this.findAllByPropertyId(propertyId, queryExecutor);

      // Prefer the first found (prioritized by active, position, id in the query)
      const targetLoan = allExistingLoans.length > 0 ? allExistingLoans[0] : null;

      let resultLoan: Loan | null = null;

      // Ensure the data we are upserting marks the loan as active
      consolidatedLoanData.is_active = true;
      // Don't try to update the loan_id itself
      const loanIdFromInput = consolidatedLoanData.loan_id;
      if (loanIdFromInput) {
          delete consolidatedLoanData.loan_id;
      }


      if (targetLoan) {
          console.log(`[LoanRepo.bulkUpsert] Found existing loan ${targetLoan.loan_id} (active: ${targetLoan.is_active}) for property ${propertyId}. Updating and ensuring active.`);

          // Update the existing loan record, making sure is_active is true
          resultLoan = await this.update(targetLoan.loan_id, consolidatedLoanData, queryExecutor);

          // Optional: Deactivate any OTHER loans found for the same property
          for (const otherLoan of allExistingLoans) {
             if (otherLoan.loan_id !== targetLoan.loan_id && otherLoan.is_active) {
                console.warn(`[LoanRepo.bulkUpsert] Deactivating redundant active loan ${otherLoan.loan_id} for property ${propertyId}.`);
                await this.update(otherLoan.loan_id, { is_active: false }, queryExecutor);
             }
          }

      } else {
          console.log(`[LoanRepo.bulkUpsert] No existing loan found (active or inactive) for property ${propertyId}. Creating new active loan.`);
          // Create a single new loan record, ensuring is_active = true
          resultLoan = await this.create(consolidatedLoanData, queryExecutor);
      }

      if (managedClient) {
        await queryExecutor.query('COMMIT');
      }

      return resultLoan ? [resultLoan] : [];
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
        if (typeof criteria[key] === 'string') {
          if (key !== 'loan_id') {
            return `${key} ILIKE $${index + 1}`;
          } else {
            // Use explicit type casting for loan_id
            return `${key} = $${index + 1}::VARCHAR`;
          }
        }
        return `${key} = $${index + 1}`;
      });
      
      query += ` AND ${whereClauses.join(' AND ')}`;
      
      values.push(...entries.map(([key, value]) => {
        if (typeof value === 'string') {
          if (key !== 'loan_id') {
            return `%${value}%`;
          } else {
            // Ensure loan_id is a string
            return String(value);
          }
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
   * Find a matching loan in a list of loans
   * This method is kept for backward compatibility but is no longer used
   * in the new bulkUpsert implementation
   * @param existingLoans List of existing loans
   * @param newLoan New loan to match
   * @returns Matching loan or undefined if no match found
   */
  protected findMatchingLoan(existingLoans: Loan[], newLoan: Partial<Loan>): Loan | undefined {
    // We now use property_id as the primary matching criterion
    // This method is kept for backward compatibility
    console.log(`[LoanRepo.findMatchingLoan] Checking for matching loan for property_id: ${newLoan.property_id}`);
    
    // Simply return the first loan in the list if any exist
    // This maintains backward compatibility while avoiding type errors
    return existingLoans.length > 0 ? existingLoans[0] : undefined;
  }

  /**
   * Override the ID field name for loans
   */
  protected getIdFieldName(): string {
    return 'loan_id';
  }
}
