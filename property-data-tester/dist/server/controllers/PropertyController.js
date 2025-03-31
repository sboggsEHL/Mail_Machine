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
exports.PropertyController = void 0;
/**
 * Controller for property-related endpoints
 */
class PropertyController {
    constructor(propertyService) {
        /**
         * Fetch properties from PropertyRadar API
         */
        this.fetchProperties = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { fields, limit, start, criteria } = req.body;
                if (!Array.isArray(fields) || fields.length === 0) {
                    res.status(400).json({
                        success: false,
                        error: 'Fields array is required'
                    });
                    return;
                }
                // Add pagination to criteria
                const criteriaWithPagination = Object.assign(Object.assign({}, criteria), { limit: limit || 10, start: start || 0 });
                const properties = yield this.propertyService.fetchPropertiesFromProvider('PR', // PropertyRadar provider code
                criteriaWithPagination, fields);
                res.json({
                    success: true,
                    count: properties.length,
                    properties
                });
            }
            catch (error) {
                console.error('Error fetching properties:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch properties'
                });
            }
        });
        /**
         * Insert properties into the database
         */
        this.insertProperties = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { properties } = req.body;
                if (!Array.isArray(properties) || properties.length === 0) {
                    res.status(400).json({
                        success: false,
                        error: 'Properties array is required'
                    });
                    return;
                }
                const insertedProperties = yield this.propertyService.saveProperties('PR', // PropertyRadar provider code
                properties);
                res.json({
                    success: true,
                    count: insertedProperties.length,
                    properties: insertedProperties
                });
            }
            catch (error) {
                console.error('Error inserting properties:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to insert properties'
                });
            }
        });
        /**
         * Search for properties
         */
        this.searchProperties = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { criteria, limit = 100, offset = 0 } = req.body;
                // Get total count for pagination
                const totalCount = yield this.propertyService.countProperties(criteria);
                // Get properties
                const properties = yield this.propertyService.searchProperties(criteria, limit, offset);
                res.json({
                    success: true,
                    count: properties.length,
                    totalCount,
                    properties
                });
            }
            catch (error) {
                console.error('Error searching properties:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to search properties'
                });
            }
        });
        /**
         * Get a property by ID
         */
        this.getProperty = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const propertyId = parseInt(req.params.id, 10);
                if (isNaN(propertyId)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid property ID'
                    });
                    return;
                }
                const property = yield this.propertyService.getPropertyWithRelations(propertyId);
                if (!property) {
                    res.status(404).json({
                        success: false,
                        error: 'Property not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    property
                });
            }
            catch (error) {
                console.error('Error getting property:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get property'
                });
            }
        });
        this.propertyService = propertyService;
    }
}
exports.PropertyController = PropertyController;
