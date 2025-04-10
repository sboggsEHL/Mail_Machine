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
exports.DnmRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
/**
 * Repository for Do Not Mail registry
 */
class DnmRepository extends BaseRepository_1.BaseRepository {
    constructor(pool) {
        super(pool, 'dnm_registry');
    }
    /**
     * Check if an entity is in the DNM registry
     * @param identifiers Object with identifying fields (loan_id, property_id, or radar_id)
     * @param client Optional client for transaction handling
     * @returns Whether the entity is in the DNM registry
     */
    isInDnmRegistry(identifiers, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            // Build the query conditions
            const conditions = [];
            const params = [];
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
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE (${conditions.join(' OR ')}) AND is_active = TRUE
       LIMIT 1`, params);
            return result.rows.length > 0;
        });
    }
    /**
     * Find DNM registry entries for a property
     * @param propertyId Property ID
     * @param client Optional client for transaction handling
     * @returns Array of DNM registry entries
     */
    findByPropertyId(propertyId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE property_id = $1 AND is_active = TRUE
       ORDER BY blocked_at DESC`, [propertyId]);
            return result.rows;
        });
    }
    /**
     * Find DNM registry entries for a loan
     * @param loanId Loan ID
     * @param client Optional client for transaction handling
     * @returns Array of DNM registry entries
     */
    findByLoanId(loanId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE loan_id = $1 AND is_active = TRUE
       ORDER BY blocked_at DESC`, [loanId]);
            return result.rows;
        });
    }
    /**
     * Find DNM registry entries for a radar ID
     * @param radarId PropertyRadar ID
     * @param client Optional client for transaction handling
     * @returns Array of DNM registry entries
     */
    findByRadarId(radarId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE radar_id = $1 AND is_active = TRUE
       ORDER BY blocked_at DESC`, [radarId]);
            return result.rows;
        });
    }
    /**
     * Find DNM registry entries by source
     * @param source Source of the DNM entry
     * @param limit Maximum number of entries to return
     * @param offset Offset for pagination
     * @param client Optional client for transaction handling
     * @returns Array of DNM registry entries
     */
    findBySource(source_1) {
        return __awaiter(this, arguments, void 0, function* (source, limit = 100, offset = 0, client) {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE source = $1 AND is_active = TRUE
       ORDER BY blocked_at DESC
       LIMIT $2 OFFSET $3`, [source, limit, offset]);
            return result.rows;
        });
    }
    /**
     * Find DNM registry entries by blocked by
     * @param blockedBy Username who blocked the entity
     * @param limit Maximum number of entries to return
     * @param offset Offset for pagination
     * @param client Optional client for transaction handling
     * @returns Array of DNM registry entries
     */
    findByBlockedBy(blockedBy_1) {
        return __awaiter(this, arguments, void 0, function* (blockedBy, limit = 100, offset = 0, client) {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE blocked_by = $1 AND is_active = TRUE
       ORDER BY blocked_at DESC
       LIMIT $2 OFFSET $3`, [blockedBy, limit, offset]);
            return result.rows;
        });
    }
    /**
     * Add an entity to the DNM registry
     * @param data DNM registry entry data
     * @param client Optional client for transaction handling
     * @returns The created DNM registry entry
     */
    addToDnm(data, client) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate required fields
            if (!data.loan_id && !data.property_id && !data.radar_id) {
                throw new Error('At least one identifier (loan_id, property_id, or radar_id) is required');
            }
            // Set default values
            const dnmEntry = {
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
        });
    }
    /**
     * Remove an entity from the DNM registry
     * @param dnmId DNM registry entry ID
     * @param client Optional client for transaction handling
     * @returns Whether the entity was removed from the DNM registry
     */
    removeFromDnm(dnmId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.softDelete(dnmId, client);
        });
    }
    /**
     * Override the ID field name for DNM registry
     */
    getIdFieldName() {
        return 'dnm_id';
    }
}
exports.DnmRepository = DnmRepository;
