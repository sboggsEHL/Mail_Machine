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
exports.PropertyRadarListService = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
class PropertyRadarListService {
    constructor(pool) {
        this.apiBaseUrl = 'https://api.propertyradar.com';
        this.authToken = process.env.PROPERTY_RADAR_TOKEN || '';
        this.pool = pool;
    }
    /**
     * Get all lists from PropertyRadar
     */
    getLists() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.apiBaseUrl}/v1/lists`, {
                    headers: this.getAuthHeaders()
                });
                return response.data.results || [];
            }
            catch (error) {
                console.error('Error fetching PropertyRadar lists:', error);
                throw error;
            }
        });
    }
    /**
     * Get items (RadarIDs) from a specific list with pagination
     */
    getListItems(listId_1) {
        return __awaiter(this, arguments, void 0, function* (listId, start = 0, limit = 1000) {
            try {
                const response = yield axios_1.default.get(`${this.apiBaseUrl}/v1/lists/${listId}/items`, {
                    params: {
                        Start: start,
                        Limit: limit
                    },
                    headers: this.getAuthHeaders()
                });
                return response.data.results || [];
            }
            catch (error) {
                console.error(`Error fetching items for list ${listId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Get all items from a list with pagination handling
     */
    getAllListItems(listId) {
        return __awaiter(this, void 0, void 0, function* () {
            let allItems = [];
            let hasMore = true;
            let start = 0;
            const limit = 1000; // PropertyRadar's maximum limit
            while (hasMore) {
                const items = yield this.getListItems(listId, start, limit);
                allItems = [...allItems, ...items];
                if (items.length < limit) {
                    hasMore = false;
                }
                else {
                    start += limit;
                }
            }
            return allItems;
        });
    }
    /**
     * Check which RadarIDs already exist in our database
     * and return detailed information about the duplicates
     */
    checkDuplicates(radarIds) {
        return __awaiter(this, void 0, void 0, function* () {
            if (radarIds.length === 0)
                return [];
            try {
                console.log(`Checking for duplicates among ${radarIds.length} RadarIDs`);
                // First, check which RadarIDs exist in the database
                const existsResult = yield this.pool.query(`
        SELECT radar_id
        FROM properties
        WHERE radar_id = ANY($1) AND is_active = true
      `, [radarIds]);
                if (existsResult.rows.length === 0) {
                    console.log('No duplicates found in the database');
                    return [];
                }
                // Get the list of RadarIDs that exist in the database
                const existingRadarIds = existsResult.rows.map(row => row.radar_id);
                console.log(`Found ${existingRadarIds.length} matching properties in the database`);
                // Now get the full details for the existing RadarIDs
                const result = yield this.pool.query(`
        SELECT
          cpv.radar_id,
          cpv.property_address as address,
          cpv.property_city as city,
          cpv.property_state as state,
          cpv.property_zip as zip_code,
          cpv.property_created_at as created_at,
          cpv.campaign_id as last_campaign_id,
          cpv.campaign_name as last_campaign_name,
          cpv.campaign_date as last_campaign_date
        FROM public.complete_property_view cpv
        WHERE cpv.radar_id = ANY($1)
        ORDER BY cpv.property_created_at DESC
      `, [existingRadarIds]);
                // Group by radar_id to get the latest campaign for each property
                const duplicateMap = new Map();
                for (const row of result.rows) {
                    if (!duplicateMap.has(row.radar_id)) {
                        // Convert timestamps to Arizona time (UTC-7) for display
                        if (row.created_at) {
                            const date = new Date(row.created_at);
                            row.created_at = date;
                        }
                        if (row.last_campaign_date) {
                            const date = new Date(row.last_campaign_date);
                            row.last_campaign_date = date;
                        }
                        duplicateMap.set(row.radar_id, row);
                    }
                }
                return Array.from(duplicateMap.values());
            }
            catch (error) {
                console.error('Error checking for duplicates:', error);
                throw error;
            }
        });
    }
    /**
     * Create a new list in PropertyRadar
     * @param listData List creation data
     * @returns Created list information
     */
    createList(listData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // First, get an estimate of how many properties match the criteria
                const previewResponse = yield axios_1.default.post(`${this.apiBaseUrl}/v1/properties`, { Criteria: listData.Criteria }, // Wrap criteria array in Criteria property
                {
                    params: {
                        Fields: 'RadarID',
                        Limit: 1,
                        Purchase: 0
                    },
                    headers: this.getAuthHeaders()
                });
                const estimatedCount = previewResponse.data.resultCount || 0;
                // If the count is extremely large, log it for monitoring
                // PropertyRadar can handle up to ~150k properties in a list
                if (estimatedCount > 100000) {
                    console.log(`Creating large list with ${estimatedCount} properties`);
                }
                // Validate list name length (PropertyRadar has a 50 character limit)
                if (listData.ListName.length > 50) {
                    console.warn(`List name exceeds 50 characters, it will be truncated by PropertyRadar`);
                    // We don't truncate here as PropertyRadar will do it automatically
                }
                // Create the list with proper error handling
                const response = yield this.executeWithRetry(() => {
                    // Send the complete object structure as per API spec
                    const requestBody = {
                        ListName: listData.ListName,
                        ListType: listData.ListType,
                        isMonitored: listData.isMonitored,
                        Criteria: listData.Criteria
                    };
                    console.log('Creating PropertyRadar list with payload:', JSON.stringify(requestBody, null, 2));
                    return axios_1.default.post(`${this.apiBaseUrl}/v1/lists`, requestBody, {
                        headers: this.getAuthHeaders(),
                        validateStatus: (status) => status < 500 // Don't throw for 4xx errors
                    }).catch(error => {
                        var _a, _b, _c;
                        if (error.response) {
                            console.error('PropertyRadar API error response:', {
                                status: error.response.status,
                                data: error.response.data,
                                headers: error.response.headers
                            });
                            console.log('AXIOS ERROR', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data, (_b = error.response) === null || _b === void 0 ? void 0 : _b.status, (_c = error.response) === null || _c === void 0 ? void 0 : _c.headers);
                        }
                        throw error;
                    });
                });
                if (response.data && response.data.results && response.data.results.length > 0) {
                    return response.data.results[0];
                }
                throw new Error('No list created in response');
            }
            catch (error) {
                console.error('Error creating PropertyRadar list:', error);
                throw error;
            }
        });
    }
    /**
     * Execute a function with retry logic
     * @param fn Function to execute
     * @param maxRetries Maximum number of retries
     * @param initialDelay Initial delay in milliseconds
     * @param backoffFactor Factor to increase delay on each retry
     * @returns Promise with the function result
     */
    executeWithRetry(fn_1) {
        return __awaiter(this, arguments, void 0, function* (fn, maxRetries = 3, initialDelay = 1000, backoffFactor = 2) {
            var _a, _b;
            let lastError;
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    return yield fn();
                }
                catch (error) {
                    lastError = error;
                    // Check if this is a rate limit error (429 status code)
                    const isRateLimit = axios_1.default.isAxiosError(error) &&
                        ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 429;
                    // Extract retry time from response headers if available
                    let waitTime = initialDelay * Math.pow(backoffFactor, attempt);
                    if (isRateLimit && axios_1.default.isAxiosError(error) && ((_b = error.response) === null || _b === void 0 ? void 0 : _b.headers['retry-after'])) {
                        const retryAfter = error.response.headers['retry-after'];
                        waitTime = parseInt(retryAfter) * 1000;
                    }
                    // Don't retry on the last attempt
                    if (attempt >= maxRetries) {
                        break;
                    }
                    console.log(`API call failed, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
                    // Wait before retrying
                    yield new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
            throw lastError;
        });
    }
    /**
     * Get authentication headers for PropertyRadar API
     */
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
        };
    }
}
exports.PropertyRadarListService = PropertyRadarListService;
