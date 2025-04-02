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
            const managedClient = client ? false : true;
            const queryExecutor = client || (yield this.getClient());
            try {
                if (managedClient) {
                    yield queryExecutor.query('BEGIN');
                }
                const results = [];
                // Process each loan
                for (const loanData of loans) {
                    const loan = Object.assign(Object.assign({}, loanData), { property_id: propertyId });
                    // If we have a loan_id, update the existing loan
                    if (loan.loan_id) {
                        const existingLoan = yield this.findByLoanId(loan.loan_id, queryExecutor);
                        if (existingLoan) {
                            const updated = yield this.update(existingLoan.loan_id, loan, queryExecutor);
                            if (updated) {
                                results.push(updated);
                            }
                        }
                        else {
                            // If loan_id is provided but doesn't exist, create with that ID
                            const created = yield this.create(loan, queryExecutor);
                            results.push(created);
                        }
                    }
                    else {
                        // Let the database trigger generate the loan_id automatically
                        // The set_loan_id trigger will create a loan_id in the format [Type][State][YY][WEEK]-[Sequence]
                        const created = yield this.create(loan, queryExecutor);
                        results.push(created);
                    }
                }
                if (managedClient) {
                    yield queryExecutor.query('COMMIT');
                }
                return results;
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
     * Override the ID field name for loans
     */
    getIdFieldName() {
        return 'loan_id';
    }
}
exports.LoanRepository = LoanRepository;
