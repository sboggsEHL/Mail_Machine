"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPropertyRoutes = createPropertyRoutes;
const express_1 = require("express");
const PropertyController_1 = require("../controllers/PropertyController");
const PropertyService_1 = require("../services/PropertyService");
const PropertyPayloadService_1 = require("../services/PropertyPayloadService");
const database_1 = require("../config/database");
/**
 * Create property routes
 * @returns Express router with property routes
 */
function createPropertyRoutes() {
    const router = (0, express_1.Router)();
    const propertyPayloadService = new PropertyPayloadService_1.PropertyPayloadService(database_1.dbPool);
    const propertyService = new PropertyService_1.PropertyService(database_1.dbPool, undefined, undefined, undefined, propertyPayloadService);
    const propertyController = new PropertyController_1.PropertyController(propertyService);
    /**
     * @route POST /api/fetch-properties
     * @desc Fetch properties from PropertyRadar API
     * @access Public
     */
    router.post('/fetch-properties', propertyController.fetchProperties);
    /**
     * @route POST /api/insert-properties
     * @desc Insert properties into the database
     * @access Public
     */
    router.post('/insert-properties', propertyController.insertProperties);
    /**
     * @route POST /api/search-properties
     * @desc Search for properties in the database
     * @access Public
     */
    router.post('/search-properties', propertyController.searchProperties);
    /**
     * @route GET /api/properties/:id
     * @desc Get a property by ID
     * @access Public
     */
    router.get('/properties/:id', propertyController.getProperty);
    return router;
}
