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
/**
 * Extension of PropertyService with batch processing capabilities
 */
class PropertyBatchService extends PropertyService_1.PropertyService {
    constructor(pool, providerCode = 'PR') {
        super(pool);
        this.providerCode = providerCode;
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
        return __awaiter(this, arguments, void 0, function* (criteria, limit = 400, offset = 0) {
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
                // Save properties to database
                yield this.saveProperties(this.providerCode, properties);
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
}
exports.PropertyBatchService = PropertyBatchService;
// Import at the end to avoid circular dependencies
const LeadProviderFactory_1 = require("./lead-providers/LeadProviderFactory");
