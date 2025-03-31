"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureRoutes = configureRoutes;
const express_1 = require("express");
const auth_routes_1 = require("./auth.routes");
const property_routes_1 = require("./property.routes");
const dnm_routes_1 = require("./dnm.routes");
const criteria_routes_1 = require("./criteria.routes");
const campaign_routes_1 = require("./campaign.routes");
/**
 * Configure all API routes
 * @param pool Database pool
 * @returns Express router with all API routes
 */
function configureRoutes(pool) {
    const router = (0, express_1.Router)();
    // Auth routes
    router.use('/auth', (0, auth_routes_1.createAuthRoutes)(pool));
    // Property routes
    router.use('/', (0, property_routes_1.createPropertyRoutes)());
    // DNM routes
    router.use('/', (0, dnm_routes_1.createDnmRoutes)());
    // Criteria routes
    router.use('/criteria', (0, criteria_routes_1.createCriteriaRoutes)());
    // Campaign routes
    router.use('/campaigns', (0, campaign_routes_1.createCampaignRoutes)(pool));
    // Simple API test route
    router.get('/test', (req, res) => {
        res.json({
            success: true,
            message: 'API is working!',
            timestamp: new Date().toISOString()
        });
    });
    return router;
}
