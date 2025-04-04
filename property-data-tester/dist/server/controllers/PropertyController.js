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
const LeadProviderFactory_1 = require("../services/lead-providers/LeadProviderFactory");
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
                const { fields, limit, start, criteria, campaignId } = req.body;
                if (!Array.isArray(fields) || fields.length === 0) {
                    res.status(400).json({
                        success: false,
                        error: 'Fields array is required'
                    });
                    return;
                }
                // Format criteria as an array of objects with name and value properties
                const formattedCriteria = Object.entries(criteria).map(([name, value]) => {
                    // Special handling for PropertyType
                    if (name === 'PropertyType' && Array.isArray(value)) {
                        return {
                            name,
                            value: [
                                {
                                    name: 'PType',
                                    value: value
                                }
                            ]
                        };
                    }
                    // Check if this is a range criteria (value is an array of two numbers)
                    if (Array.isArray(value) &&
                        value.length === 2 &&
                        (typeof value[0] === 'number' || value[0] === null) &&
                        (typeof value[1] === 'number' || value[1] === null)) {
                        // Format as a range using nested arrays
                        return {
                            name,
                            value: [value]
                        };
                    }
                    // Check if this is a date range criteria (name ends with 'Date' and value is an array of two dates)
                    if (name.endsWith('Date') &&
                        Array.isArray(value) &&
                        value.length === 2 &&
                        typeof value[0] === 'string' &&
                        typeof value[1] === 'string') {
                        // Format as a date range using the "from: to:" syntax
                        const fromDate = value[0] || '';
                        const toDate = value[1] || '';
                        if (fromDate && toDate) {
                            return {
                                name,
                                value: [`from: ${fromDate} to: ${toDate}`]
                            };
                        }
                        else if (fromDate) {
                            return {
                                name,
                                value: [fromDate]
                            };
                        }
                        else if (toDate) {
                            return {
                                name,
                                value: [`from: to: ${toDate}`]
                            };
                        }
                    }
                    // Special handling for boolean values
                    if (typeof value === 'boolean') {
                        return {
                            name,
                            value: [value ? "1" : "0"]
                        };
                    }
                    // Default handling for non-date, non-boolean criteria
                    return {
                        name,
                        value: Array.isArray(value) ? value : [value]
                    };
                });
                // Create criteria input with just the formatted criteria
                const criteriaInput = {
                    Criteria: formattedCriteria,
                    limit: limit || 10,
                    start: start || 0,
                    purchase: req.body.purchase || 0
                };
                const properties = yield this.propertyService.fetchPropertiesFromProvider('PR', // PropertyRadar provider code
                criteriaInput, fields, campaignId || 'individual-request' // Use provided campaignId or default
                );
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
        /**
         * Preview properties (get count without purchasing)
         */
        this.previewProperties = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { criteria } = req.body;
                if (!criteria) {
                    res.status(400).json({
                        success: false,
                        error: 'Criteria is required'
                    });
                    return;
                }
                // Get the provider from the factory
                const provider = LeadProviderFactory_1.leadProviderFactory.getProvider('PR');
                if (!provider.previewProperties) {
                    res.status(500).json({
                        success: false,
                        error: 'Provider does not support preview functionality'
                    });
                    return;
                }
                // Get preview count
                const previewResult = yield provider.previewProperties(criteria);
                res.json({
                    success: true,
                    count: previewResult.count
                });
            }
            catch (error) {
                console.error('Error previewing properties:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to preview properties'
                });
            }
        });
        this.propertyService = propertyService;
    }
}
exports.PropertyController = PropertyController;
