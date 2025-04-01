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
exports.PropertyBatchService = void 0;
const PropertyService_1 = require("./PropertyService");
const PropertyPayloadService_1 = require("./PropertyPayloadService");
/**
 * Extension of PropertyService with batch processing capabilities
 */
class PropertyBatchService extends PropertyService_1.PropertyService {
    constructor(pool, providerCode = 'PR', propertyPayloadService) {
        super(pool);
        this.batchCounter = new Map();
        this.providerCode = providerCode;
        this.propertyPayloadService = propertyPayloadService || new PropertyPayloadService_1.PropertyPayloadService(pool);
    }
    /**
     * Get estimated count of properties matching criteria
     * @param criteria Search criteria
     * @returns Estimated count
     */
    getEstimatedCount(criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // First try to get count from provider API
                // Since the LeadProvider interface doesn't have getEstimatedCount,
                // we'll use fetchProperties with a limit of 1 to check if there are any results
                const provider = LeadProviderFactory_1.leadProviderFactory.getProvider(this.providerCode);
                if (provider.isConfigured()) {
                    try {
                        // Fetch a single property to check if there are results
                        const properties = yield provider.fetchProperties(Object.assign(Object.assign({}, criteria), { limit: 1 }), ['RadarID']);
                        // If we got a result, we can estimate there are more
                        if (properties.length > 0) {
                            // This is a rough estimate - in a real implementation,
                            // you would want to get a more accurate count from the API
                            return { count: 10000 }; // Assume a large number for batch processing
                        }
                    }
                    catch (error) {
                        console.warn('Error estimating count from provider:', error);
                    }
                }
                // Fallback to database count
                const count = yield this.countProperties(criteria);
                return { count };
            }
            catch (error) {
                console.error('Error getting estimated count:', error);
                return { count: 0 };
            }
        });
    }
    /**
     * Get properties in batches
     * @param criteria Search criteria
     * @param limit Maximum number of results
     * @param offset Offset for pagination
     * @returns Batch of properties
     */
    getProperties(criteria_1) {
        return __awaiter(this, arguments, void 0, function* (criteria, campaignId = 'default', limit = 400, offset = 0) {
            try {
                // Get properties from provider
                const properties = yield this.fetchPropertiesFromProvider(this.providerCode, Object.assign(Object.assign({}, criteria), { limit,
                    offset }), [
                    'RadarID',
                    'Address',
                    'City',
                    'State',
                    'ZipFive',
                    'Owner',
                    'Owner2',
                    'FirstLoanType',
                    'FirstLoanAmount',
                    'FirstLoanDate',
                    'EstimatedValue',
                    'AvailableEquity'
                ]);
                // Get batch number for this campaign
                const batchNumber = this.getNextBatchNumber(campaignId);
                // Save properties to file first
                const startTime = Date.now();
                yield this.propertyPayloadService.savePropertyPayload(properties, campaignId, batchNumber);
                try {
                    // Save properties to database
                    yield this.saveProperties(this.providerCode, properties);
                }
                catch (error) {
                    console.error('Error saving properties to database:', error);
                    // The properties are still saved to file, so they can be processed later
                    // We'll continue and return the properties to the caller
                }
                // Determine if there are more records
                const totalCount = yield this.getEstimatedCount(criteria);
                const hasMore = offset + properties.length < totalCount.count;
                return {
                    properties,
                    hasMore,
                    totalCount: totalCount.count
                };
            }
            catch (error) {
                console.error('Error getting properties:', error);
                return {
                    properties: [],
                    hasMore: false,
                    totalCount: 0
                };
            }
        });
    }
    /**
     * Set provider code
     * @param providerCode Provider code
     */
    setProviderCode(providerCode) {
        this.providerCode = providerCode;
    }
    /**
     * Get provider code
     * @returns Provider code
     */
    getProviderCode() {
        return this.providerCode;
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
     * Process pending property files
     * @param limit Maximum number of files to process
     * @returns Number of files processed
     */
    processPendingFiles() {
        return __awaiter(this, arguments, void 0, function* (limit = 10) {
            const pendingFiles = yield this.propertyPayloadService.getPendingFiles(limit);
            let processedCount = 0;
            for (const { fileStatus, originalPath } of pendingFiles) {
                try {
                    // Process the file using the processor function
                    const result = yield this.propertyPayloadService.processFile(fileStatus, originalPath, (properties) => __awaiter(this, void 0, void 0, function* () {
                        try {
                            // Save properties to database
                            yield this.saveProperties(this.providerCode, properties);
                            return { success: properties.length, errors: 0 };
                        }
                        catch (error) {
                            console.error('Error saving properties to database:', error);
                            return { success: 0, errors: properties.length };
                        }
                    }));
                    if (result.success) {
                        processedCount++;
                    }
                }
                catch (error) {
                    console.error(`Error processing file:`, error);
                }
            }
            return processedCount;
        });
    }
}
exports.PropertyBatchService = PropertyBatchService;
// Import at the end to avoid circular dependencies
const LeadProviderFactory_1 = require("./lead-providers/LeadProviderFactory");
