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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyService = void 0;
const PropertyRepository_1 = require("../repositories/PropertyRepository");
const PropertyOwnerRepository_1 = require("../repositories/PropertyOwnerRepository");
const LoanRepository_1 = require("../repositories/LoanRepository");
const LeadProviderFactory_1 = require("../services/lead-providers/LeadProviderFactory");
const PropertyPayloadService_1 = require("./PropertyPayloadService");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Service for managing properties
 */
class PropertyService {
    constructor(pool, propertyRepo, ownerRepo, loanRepo, propertyPayloadService) {
        this.batchCounter = new Map();
        this.pool = pool;
        this.propertyRepo = propertyRepo || new PropertyRepository_1.PropertyRepository(pool);
        this.ownerRepo = ownerRepo || new PropertyOwnerRepository_1.PropertyOwnerRepository(pool);
        this.loanRepo = loanRepo || new LoanRepository_1.LoanRepository(pool);
        this.propertyPayloadService = propertyPayloadService || new PropertyPayloadService_1.PropertyPayloadService(pool);
    }
    /**
     * Fetch properties from a provider
     * @param providerCode Provider code (e.g., 'PR')
     * @param criteria Search criteria
     * @param fields Fields to retrieve
     * @returns Array of properties
     */
    fetchPropertiesFromProvider(providerCode, criteria, fields, campaignId = 'individual-request') {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = LeadProviderFactory_1.leadProviderFactory.getProvider(providerCode);
            if (!provider.isConfigured()) {
                throw new errors_1.AppError(errors_1.ERROR_CODES.SYSTEM_CONFIGURATION_ERROR, `Provider ${providerCode} is not properly configured.`, 500);
            }
            // Fetch properties from provider
            const properties = yield provider.fetchProperties(criteria, fields);
            // Save raw payload to file
            if (properties.length > 0) {
                try {
                    // Get batch number for this campaign
                    const batchNumber = this.getNextBatchNumber(campaignId);
                    // Save properties to file
                    yield this.propertyPayloadService.savePropertyPayload(properties, campaignId, batchNumber);
                    logger_1.default.info(`Saved raw payload for ${properties.length} properties from individual request`);
                }
                catch (error) {
                    logger_1.default.error('Error saving raw payload:', error);
                    // Continue even if saving the payload fails
                }
            }
            return properties;
        });
    }
    /**
     * Fetch a single property by its RadarID
     * @param providerCode Provider code (e.g., 'PR')
     * @param radarId The PropertyRadar ID
     * @param fields Fields to retrieve
     * @returns Property data
     */
    /**
     * Fetch a single property by its RadarID
     * @param providerCode Provider code (e.g., 'PR')
     * @param radarId The PropertyRadar ID
     * @param fields Fields to retrieve
     * @returns Property data
     */
    fetchPropertyByRadarId(providerCode, radarId, fields, campaignId = 'individual-request') {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = LeadProviderFactory_1.leadProviderFactory.getProvider(providerCode);
            if (!provider.isConfigured()) {
                throw new Error(`Provider ${providerCode} is not properly configured.`);
            }
            if (!provider.fetchPropertyById) {
                throw new Error(`Provider ${providerCode} does not support fetching by ID.`);
            }
            // Fetch property from provider
            const property = yield provider.fetchPropertyById(radarId, fields);
            // Note: We no longer save individual properties to file here
            // They will be saved in batches by the PropertyBatchService
            return property;
        });
    }
    /**
     * Get next batch number for a campaign
     * @param campaignId Campaign ID
     * @returns Next batch number
     */
    getNextBatchNumber(campaignId) {
        const currentBatchNumber = this.batchCounter.get(campaignId) || 0;
        const nextBatchNumber = currentBatchNumber + 1;
        this.batchCounter.set(campaignId, nextBatchNumber);
        return nextBatchNumber;
    }
    /**
     * Save a property with its related data
     * @param providerCode Provider code (e.g., 'PR')
     * @param rawPropertyData Raw property data from provider
     * @returns The inserted property
     */
    saveProperty(providerCode, rawPropertyData) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.connect();
            try {
                // Begin transaction
                yield client.query('BEGIN');
                // Get the provider and transform the property data
                const provider = LeadProviderFactory_1.leadProviderFactory.getProvider(providerCode);
                const { property: propertyData, owners, loans } = provider.transformProperty(rawPropertyData);
                // Check if provider_id is directly provided in the batch job criteria
                let providerId;
                if (rawPropertyData.batchJobCriteria && rawPropertyData.batchJobCriteria.provider_id) {
                    // Use the provider_id from the batch job criteria
                    providerId = rawPropertyData.batchJobCriteria.provider_id;
                    console.log(`Using provider_id ${providerId} from batch job criteria`);
                }
                else if (rawPropertyData.criteria && rawPropertyData.criteria.provider_id) {
                    // Use the provider_id from the property criteria
                    providerId = rawPropertyData.criteria.provider_id;
                    console.log(`Using provider_id ${providerId} from property criteria`);
                }
                else {
                    // Get provider_id from the database
                    const leadProviderResult = yield client.query(`SELECT provider_id FROM lead_providers WHERE provider_code = $1`, [providerCode]);
                    if (leadProviderResult.rows.length > 0) {
                        providerId = leadProviderResult.rows[0].provider_id;
                    }
                    else {
                        // Create the provider if it doesn't exist
                        const insertResult = yield client.query(`INSERT INTO lead_providers (provider_name, provider_code)
             VALUES ($1, $2)
             RETURNING provider_id`, [provider.getName(), providerCode]);
                        providerId = insertResult.rows[0].provider_id;
                    }
                }
                // Check if property already exists by radar_id
                const existingProperty = yield this.propertyRepo.findByRadarId(propertyData.radar_id, client);
                let property;
                if (existingProperty) {
                    // Update existing property
                    const updatedProperty = yield this.propertyRepo.update(existingProperty.property_id, Object.assign(Object.assign({}, propertyData), { provider_id: providerId, updated_at: new Date() }), client);
                    property = updatedProperty;
                }
                else {
                    // Create new property
                    property = yield this.propertyRepo.create(Object.assign(Object.assign({}, propertyData), { provider_id: providerId, created_at: new Date(), is_active: true }), client);
                }
                // Process owners if they exist
                if (owners && owners.length > 0) {
                    yield this.ownerRepo.bulkUpsert(property.property_id, owners, client);
                }
                // Process loans if they exist
                if (loans && loans.length > 0) {
                    yield this.loanRepo.bulkUpsert(property.property_id, loans, client);
                }
                // Commit transaction
                yield client.query('COMMIT');
                return {
                    propertyId: property.property_id,
                    radarId: property.radar_id,
                    address: property.property_address,
                    city: property.property_city,
                    state: property.property_state
                };
            }
            catch (error) {
                // Rollback transaction on error
                yield client.query('ROLLBACK');
                console.error('Error saving property:', error);
                throw error;
            }
            finally {
                // Release client back to pool
                client.release();
            }
        });
    }
    /**
     * Save multiple properties in a batch
     * @param providerCode Provider code (e.g., 'PR')
     * @param rawPropertiesData Array of raw property data from provider
     * @returns Array of inserted properties
     */
    saveProperties(providerCode, rawPropertiesData) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            // Process each property
            for (const rawPropertyData of rawPropertiesData) {
                try {
                    const result = yield this.saveProperty(providerCode, rawPropertyData);
                    results.push(result);
                }
                catch (error) {
                    console.error(`Error saving property with radar ID ${rawPropertyData.RadarID}:`, error);
                    // Continue with next property
                }
            }
            return results;
        });
    }
    /**
     * Get a property with all related data
     * @param propertyId Property ID
     * @returns Complete property data
     */
    getPropertyWithRelations(propertyId) {
        return __awaiter(this, void 0, void 0, function* () {
            // First try to get from the view if it exists
            try {
                const completeData = yield this.propertyRepo.getCompletePropertyData(propertyId);
                if (completeData) {
                    return completeData;
                }
            }
            catch (error) {
                // If the view doesn't exist, we'll fetch data separately
                console.warn('Error using complete_property_view:', error);
            }
            // Fetch property, owners, and loans separately
            const property = yield this.propertyRepo.findById(propertyId);
            if (!property) {
                return null;
            }
            const owners = yield this.ownerRepo.findByPropertyId(propertyId);
            const loans = yield this.loanRepo.findByPropertyId(propertyId);
            return Object.assign(Object.assign({}, property), { owners,
                loans });
        });
    }
    /**
     * Search for properties by criteria
     * @param criteria Search criteria
     * @param limit Maximum number of results
     * @param offset Offset for pagination
     * @returns Properties matching criteria
     */
    searchProperties(criteria, limit = 100, offset = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.propertyRepo.findByCriteria(criteria, limit, offset);
        });
    }
    /**
     * Count properties matching criteria
     * @param criteria Search criteria
     * @returns Count of matching properties
     */
    countProperties(criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.propertyRepo.countByCriteria(criteria);
        });
    }
}
exports.PropertyService = PropertyService;
