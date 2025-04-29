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
exports.PropertyRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
/**
 * Repository for properties
 */
class PropertyRepository extends BaseRepository_1.BaseRepository {
    constructor(pool) {
        super(pool, 'properties');
    }
    /**
     * Find a property by its RadarID
     * @param radarId PropertyRadar ID
     * @param client Optional client for transaction handling
     * @returns The property or null if not found
     */
    findByRadarId(radarId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} WHERE radar_id = $1 AND is_active = true`, [radarId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Find properties by address and city
     * @param address Property address
     * @param city Property city
     * @param state Property state (optional)
     * @param client Optional client for transaction handling
     * @returns Array of matching properties
     */
    findByAddress(address, city, state, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            let query = `
      SELECT * FROM ${this.tableName} 
      WHERE property_address ILIKE $1 
      AND property_city ILIKE $2`;
            const params = [`%${address}%`, `%${city}%`];
            if (state) {
                query += ` AND property_state = $3`;
                params.push(state);
            }
            query += ` AND is_active = true`;
            const result = yield queryExecutor.query(query, params);
            return result.rows;
        });
    }
    /**
     * Find properties by provider ID
     * @param providerId Lead provider ID
     * @param limit Maximum number of properties to return
     * @param offset Offset for pagination
     * @param client Optional client for transaction handling
     * @returns Array of properties
     */
    findByProviderId(providerId, limit = 100, offset = 0, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE provider_id = $1 AND is_active = true
       ORDER BY property_id DESC
       LIMIT $2 OFFSET $3`, [providerId, limit, offset]);
            return result.rows;
        });
    }
    /**
     * Find properties with specific criteria
     * @param criteria Object with property field criteria
     * @param limit Maximum number of properties to return
     * @param offset Offset for pagination
     * @param client Optional client for transaction handling
     * @returns Array of properties matching criteria
     */
    findByCriteria(criteria, limit = 100, offset = 0, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            // Filter out undefined values and build WHERE clauses
            const entries = Object.entries(criteria).filter(([_, value]) => value !== undefined);
            if (entries.length === 0) {
                return this.findAll(client);
            }
            const whereClauses = entries.map(([key], index) => {
                if (typeof criteria[key] === 'string' && !['provider_id', 'property_id', 'radar_id'].includes(key)) {
                    return `${key} ILIKE $${index + 1}`;
                }
                return `${key} = $${index + 1}`;
            });
            const values = entries.map(([key, value]) => {
                if (typeof value === 'string' && !['provider_id', 'property_id', 'radar_id'].includes(key)) {
                    return `%${value}%`;
                }
                return value;
            });
            const query = `
      SELECT * FROM ${this.tableName} 
      WHERE ${whereClauses.join(' AND ')} AND is_active = true
      ORDER BY property_id DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
            const result = yield queryExecutor.query(query, [...values, limit, offset]);
            return result.rows;
        });
    }
    /**
     * Count properties with specific criteria
     * @param criteria Object with property field criteria
     * @param client Optional client for transaction handling
     * @returns Count of properties matching criteria
     */
    countByCriteria(criteria, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            // Filter out undefined values and build WHERE clauses
            const entries = Object.entries(criteria).filter(([_, value]) => value !== undefined);
            if (entries.length === 0) {
                const result = yield queryExecutor.query(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_active = true`);
                return parseInt(result.rows[0].count, 10);
            }
            const whereClauses = entries.map(([key], index) => {
                if (typeof criteria[key] === 'string' && !['provider_id', 'property_id', 'radar_id'].includes(key)) {
                    return `${key} ILIKE $${index + 1}`;
                }
                return `${key} = $${index + 1}`;
            });
            const values = entries.map(([key, value]) => {
                if (typeof value === 'string' && !['provider_id', 'property_id', 'radar_id'].includes(key)) {
                    return `%${value}%`;
                }
                return value;
            });
            const query = `
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE ${whereClauses.join(' AND ')} AND is_active = true
    `;
            const result = yield queryExecutor.query(query, values);
            return parseInt(result.rows[0].count, 10);
        });
    }
    /**
     * Get the complete property data with owners and loans
     * @param propertyId Property ID
     * @param client Optional client for transaction handling
     * @returns Complete property data or null if not found
     */
    getCompletePropertyData(propertyId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM complete_property_view WHERE property_id = $1`, [propertyId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Override the ID field name to use property_id instead of propertie_id
     * @returns The correct ID field name
     */
    getIdFieldName() {
        return 'property_id'; // Override to return the correct column name
    }
}
exports.PropertyRepository = PropertyRepository;
