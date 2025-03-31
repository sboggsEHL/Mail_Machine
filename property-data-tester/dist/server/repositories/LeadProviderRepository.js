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
exports.LeadProviderRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
/**
 * Repository for lead providers
 */
class LeadProviderRepository extends BaseRepository_1.BaseRepository {
    constructor(pool) {
        super(pool, 'lead_providers');
    }
    /**
     * Find a lead provider by its code
     * @param code The provider code (e.g., 'PR' for PropertyRadar)
     * @param client Optional client for transaction handling
     * @returns The lead provider or null if not found
     */
    findByCode(code, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} WHERE provider_code = $1`, [code]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Ensure a lead provider exists, creating it if necessary
     * @param providerName Provider name
     * @param providerCode Provider code
     * @param client Optional client for transaction handling
     * @returns The provider ID
     */
    ensureProvider(providerName, providerCode, apiKey, apiEndpoint, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            // Try to find an existing provider
            const existingProvider = yield this.findByCode(providerCode, client);
            if (existingProvider) {
                return existingProvider.provider_id;
            }
            // Create a new provider
            const result = yield queryExecutor.query(`INSERT INTO ${this.tableName} (provider_name, provider_code, api_key, api_endpoint, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING provider_id`, [providerName, providerCode, apiKey, apiEndpoint]);
            return result.rows[0].provider_id;
        });
    }
    /**
     * Get all active lead providers
     * @param client Optional client for transaction handling
     * @returns Array of active lead providers
     */
    findAllActive(client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} WHERE is_active = true`);
            return result.rows;
        });
    }
    /**
     * Update a lead provider's API credentials
     * @param id The provider ID
     * @param apiKey The API key
     * @param apiEndpoint The API endpoint
     * @param client Optional client for transaction handling
     * @returns The updated lead provider
     */
    updateCredentials(id, apiKey, apiEndpoint, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateData = {
                api_key: apiKey,
                updated_at: new Date()
            };
            if (apiEndpoint) {
                updateData.api_endpoint = apiEndpoint;
            }
            return this.update(id, updateData, client);
        });
    }
}
exports.LeadProviderRepository = LeadProviderRepository;
