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
exports.BaseRepository = void 0;
/**
 * Base repository class with common database operations
 */
class BaseRepository {
    constructor(pool, tableName) {
        this.pool = pool;
        this.tableName = tableName;
    }
    /**
     * Get a database client from the pool for transaction handling
     * @returns A database client from the pool
     */
    getClient() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.pool.connect();
        });
    }
    /**
     * Find an entity by its ID
     * @param id The entity ID
     * @param client Optional client for transaction handling
     * @returns The entity or null if not found
     */
    findById(id, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const idField = this.getIdFieldName();
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} WHERE ${idField} = $1`, [id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Find all entities
     * @param client Optional client for transaction handling
     * @returns Array of entities
     */
    findAll(client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} WHERE is_active = true`);
            return result.rows;
        });
    }
    /**
     * Create a new entity
     * @param entity The entity to create
     * @param client Optional client for transaction handling
     * @returns The created entity with its ID
     */
    create(entity, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            // Filter out undefined values and create columns and values arrays
            const entries = Object.entries(entity).filter(([_, value]) => value !== undefined);
            const columns = entries.map(([key]) => key);
            const values = entries.map(([_, value]) => value);
            // Create the SQL placeholders ($1, $2, etc.)
            const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
            const result = yield queryExecutor.query(`INSERT INTO ${this.tableName} (${columns.join(', ')})
       VALUES (${placeholders})
       RETURNING *`, values);
            return result.rows[0];
        });
    }
    /**
     * Update an entity
     * @param id The entity ID
     * @param entity The entity fields to update
     * @param client Optional client for transaction handling
     * @returns The updated entity
     */
    update(id, entity, client) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const result = yield queryExecutor.query(`UPDATE ${this.tableName}
       SET ${setClauses}
       WHERE ${idField} = $1
       RETURNING *`, [id, ...values]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Set an entity's is_active flag to false (soft delete)
     * @param id The entity ID
     * @param client Optional client for transaction handling
     * @returns True if the entity was deleted, false otherwise
     */
    softDelete(id, client) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const idField = this.getIdFieldName();
            const result = yield queryExecutor.query(`UPDATE ${this.tableName}
       SET is_active = false, updated_at = NOW()
       WHERE ${idField} = $1
       RETURNING ${idField}`, [id]);
            return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
        });
    }
    /**
     * Hard delete an entity
     * @param id The entity ID
     * @param client Optional client for transaction handling
     * @returns True if the entity was deleted, false otherwise
     */
    hardDelete(id, client) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const idField = this.getIdFieldName();
            const result = yield queryExecutor.query(`DELETE FROM ${this.tableName}
       WHERE ${idField} = $1`, [id]);
            return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
        });
    }
    /**
     * Get the name of the ID field for this entity
     * Override in derived classes if needed
     */
    getIdFieldName() {
        return `${this.tableName.slice(0, -1)}_id`;
    }
    /**
     * Execute a raw SQL query
     * @param sql SQL query string
     * @param params Query parameters
     * @param client Optional client for transaction handling
     * @returns Query result
     */
    query(sql, params = [], client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            return queryExecutor.query(sql, params);
        });
    }
}
exports.BaseRepository = BaseRepository;
