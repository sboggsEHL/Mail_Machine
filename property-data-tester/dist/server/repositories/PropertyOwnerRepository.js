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
exports.PropertyOwnerRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
/**
 * Repository for property owners
 */
class PropertyOwnerRepository extends BaseRepository_1.BaseRepository {
    constructor(pool) {
        super(pool, 'property_owners');
    }
    /**
     * Find primary owners for a property
     * @param propertyId Property ID
     * @param client Optional client for transaction handling
     * @returns The primary property owner or null if not found
     */
    findPrimaryByPropertyId(propertyId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE property_id = $1 
       AND is_primary_contact = true
       AND is_active = true`, [propertyId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Find all owners for a property
     * @param propertyId Property ID
     * @param client Optional client for transaction handling
     * @returns Array of property owners
     */
    findByPropertyId(propertyId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE property_id = $1 
       AND is_active = true
       ORDER BY is_primary_contact DESC, owner_id ASC`, [propertyId]);
            return result.rows;
        });
    }
    /**
     * Find owners by name
     * @param name Full or partial name to search for
     * @param limit Maximum number of owners to return
     * @param offset Offset for pagination
     * @param client Optional client for transaction handling
     * @returns Array of property owners
     */
    findByName(name, limit = 100, offset = 0, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE (
         full_name ILIKE $1 
         OR first_name ILIKE $1 
         OR last_name ILIKE $1
       )
       AND is_active = true
       ORDER BY owner_id DESC
       LIMIT $2 OFFSET $3`, [`%${name}%`, limit, offset]);
            return result.rows;
        });
    }
    /**
     * Find owners with available contact information
     * @param type Contact type ('phone', 'email', or 'both')
     * @param limit Maximum number of owners to return
     * @param offset Offset for pagination
     * @param client Optional client for transaction handling
     * @returns Array of property owners
     */
    findWithContactInfo(type, limit = 100, offset = 0, client) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} 
       WHERE ${whereClause}
       AND is_active = true
       ORDER BY owner_id DESC
       LIMIT $1 OFFSET $2`, [limit, offset]);
            return result.rows;
        });
    }
    /**
     * Insert or update multiple owners for a property
     * @param propertyId Property ID
     * @param owners Array of owner data
     * @param client Optional client for transaction handling
     * @returns Array of created/updated owners
     */
    bulkUpsert(propertyId, owners, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const managedClient = client ? false : true;
            const queryExecutor = client || (yield this.getClient());
            try {
                if (managedClient) {
                    yield queryExecutor.query('BEGIN');
                }
                const results = [];
                // Process each owner
                for (const ownerData of owners) {
                    const owner = Object.assign(Object.assign({}, ownerData), { property_id: propertyId });
                    // If we have an owner_id, update the existing owner
                    if (owner.owner_id) {
                        const updated = yield this.update(owner.owner_id, owner, queryExecutor);
                        if (updated) {
                            results.push(updated);
                        }
                    }
                    else {
                        // Otherwise create a new owner
                        const created = yield this.create(owner, queryExecutor);
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
     * Update first_name for multiple property owners in bulk
     * @param updates Array of objects containing owner_id and first_name
     * @param client Optional client for transaction handling
     * @returns Number of updated rows
     */
    updateFirstNameBulk(updates, client) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (updates.length === 0)
                return 0;
            const queryExecutor = client || this.pool;
            // Build parameterized query for multiple updates
            const params = [];
            const cases = [];
            updates.forEach((update, i) => {
                params.push(update.owner_id, update.first_name);
                cases.push(`WHEN owner_id = $${i * 2 + 1} THEN $${i * 2 + 2}`);
            });
            const ownerIds = updates.map((u, i) => `$${i * 2 + 1}`).join(',');
            const query = `
      UPDATE ${this.tableName}
      SET first_name = CASE ${cases.join(' ')} END,
          updated_at = NOW()
      WHERE owner_id IN (${ownerIds})
      RETURNING owner_id
    `;
            const result = yield queryExecutor.query(query, params);
            return (_a = result.rowCount) !== null && _a !== void 0 ? _a : 0;
        });
    }
    /**
     * Update first_name for a single property owner
     * @param ownerId Owner ID
     * @param firstName New first name
     * @param client Optional client for transaction handling
     * @returns True if updated, false otherwise
     */
    updateFirstNameById(ownerId, firstName, client) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`UPDATE ${this.tableName} 
       SET first_name = $1, updated_at = NOW()
       WHERE owner_id = $2
       RETURNING owner_id`, [firstName, ownerId]);
            return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
        });
    }
}
exports.PropertyOwnerRepository = PropertyOwnerRepository;
