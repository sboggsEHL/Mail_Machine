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
exports.LoanRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
/**
 * Repository for loans
 */
class LoanRepository extends BaseRepository_1.BaseRepository {
    constructor(pool) {
        super(pool, 'loans');
    }
    /**
     * Find loans by property ID
     * @param propertyId Property ID
     * @param client Optional client for transaction handling
     * @returns Array of loans
     */
    findByPropertyId(propertyId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE property_id = $1 
       AND is_active = true
       ORDER BY loan_position ASC, loan_id ASC`, [propertyId]);
            return result.rows;
        });
    }
    /**
     * Find ALL loans (active or inactive) by property ID
     * @param propertyId Property ID
     * @param client Optional client for transaction handling
     * @returns Array of loans
     */
    findAllByPropertyId(propertyId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName}
       WHERE property_id = $1
       ORDER BY is_active DESC, loan_position ASC, loan_id ASC`, // Prioritize active, then position, then ID
            [propertyId]);
            return result.rows;
        });
    }
    /**
     * Find a loan by loan ID
     * @param loanId Loan ID
     * @param client Optional client for transaction handling
     * @returns The loan or null if not found
     */
    findByLoanId(loanId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} WHERE loan_id = $1 AND is_active = true`, [loanId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Find loans by criteria
     * @param criteria Object with loan field criteria
     * @param limit Maximum number of loans to return
     * @param offset Offset for pagination
     * @param client Optional client for transaction handling
     * @returns Array of loans matching criteria
     */
    findByCriteria(criteria_1) {
        return __awaiter(this, arguments, void 0, function* (criteria, limit = 100, offset = 0, client) {
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
            const result = yield queryExecutor.query(query, [...values, limit, offset]);
            return result.rows;
        });
    }
    /**
     * Insert or update multiple loans for a property
     * @param propertyId Property ID
     * @param loans Array of loan data
     * @param client Optional client for transaction handling
     * @returns Array of created/updated loans
     */
    bulkUpsert(propertyId, loans, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const managedClient = !client;
            const queryExecutor = client || (yield this.getClient());
            try {
                if (managedClient) {
                    yield queryExecutor.query('BEGIN');
                }
                if (loans.length === 0) {
                    console.log(`[LoanRepo.bulkUpsert] No loan data provided for property ${propertyId}. Skipping.`);
                    return [];
                }
                // We expect only one consolidated loan object from the transformer
                const consolidatedLoanData = Object.assign(Object.assign({}, loans[0]), { property_id: propertyId });
                // Find *ANY* existing loan (active or inactive) for the property
                // Use the new method findAllByPropertyId
                const allExistingLoans = yield this.findAllByPropertyId(propertyId, queryExecutor);
                // Prefer the first found (prioritized by active, position, id in the query)
                const targetLoan = allExistingLoans.length > 0 ? allExistingLoans[0] : null;
                let resultLoan = null;
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
                    resultLoan = yield this.update(targetLoan.loan_id, consolidatedLoanData, queryExecutor);
                    // Optional: Deactivate any OTHER loans found for the same property
                    for (const otherLoan of allExistingLoans) {
                        if (otherLoan.loan_id !== targetLoan.loan_id && otherLoan.is_active) {
                            console.warn(`[LoanRepo.bulkUpsert] Deactivating redundant active loan ${otherLoan.loan_id} for property ${propertyId}.`);
                            yield this.update(otherLoan.loan_id, { is_active: false }, queryExecutor);
                        }
                    }
                }
                else {
                    console.log(`[LoanRepo.bulkUpsert] No existing loan found (active or inactive) for property ${propertyId}. Creating new active loan.`);
                    // Create a single new loan record, ensuring is_active = true
                    resultLoan = yield this.create(consolidatedLoanData, queryExecutor);
                }
                if (managedClient) {
                    yield queryExecutor.query('COMMIT');
                }
                return resultLoan ? [resultLoan] : [];
            }
            catch (error) {
                if (managedClient) {
                    yield queryExecutor.query('ROLLBACK');
                }
                throw error;
            }
            finally {
                if (managedClient && queryExecutor) {
                    queryExecutor.release();
                }
            }
        });
    }
    /**
     * Find loans by lender name
     * @param lenderName Lender name to search for
     * @param limit Maximum number of loans to return
     * @param offset Offset for pagination
     * @param client Optional client for transaction handling
     * @returns Array of loans
     */
    findByLender(lenderName_1) {
        return __awaiter(this, arguments, void 0, function* (lenderName, limit = 100, offset = 0, client) {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE lender_name ILIKE $1 
       AND is_active = true
       ORDER BY loan_id DESC
       LIMIT $2 OFFSET $3`, [`%${lenderName}%`, limit, offset]);
            return result.rows;
        });
    }
    /**
     * Calculate average interest rate for loans matching criteria
     * @param criteria Object with loan field criteria
     * @param client Optional client for transaction handling
     * @returns Average interest rate or null if no matching loans
     */
    getAverageInterestRate(criteria, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            // Filter out undefined values and build WHERE clauses
            const entries = Object.entries(criteria).filter(([_, value]) => value !== undefined);
            let query = `
      SELECT AVG(interest_rate) as avg_rate
      FROM ${this.tableName} 
      WHERE interest_rate IS NOT NULL AND is_active = true
    `;
            const values = [];
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
            const result = yield queryExecutor.query(query, values);
            if (!result.rows[0].avg_rate) {
                return null;
            }
            return parseFloat(result.rows[0].avg_rate);
        });
    }
    /**
     * Find a matching loan in a list of loans
     * This method is kept for backward compatibility but is no longer used
     * in the new bulkUpsert implementation
     * @param existingLoans List of existing loans
     * @param newLoan New loan to match
     * @returns Matching loan or undefined if no match found
     */
    findMatchingLoan(existingLoans, newLoan) {
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
    getIdFieldName() {
        return 'loan_id';
    }
}
exports.LoanRepository = LoanRepository;
