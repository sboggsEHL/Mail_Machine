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
                // Use the complete_property_view as suggested by the user
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
      `, [radarIds]);
                console.log(`Found ${result.rows.length} matching properties in the database`);
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
