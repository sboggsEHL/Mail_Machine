"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureRoutes = void 0;
const express_1 = require("express");
const auth_routes_1 = require("./auth.routes");
const property_routes_1 = require("./property.routes");
const dnm_routes_1 = require("./dnm.routes");
const criteria_routes_1 = require("./criteria.routes");
const campaign_routes_1 = require("./campaign.routes");
const batch_job_routes_1 = require("./batch-job.routes");
const property_file_routes_1 = require("./property-file.routes");
const listRoutes_1 = require("./listRoutes");
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
    // Batch job routes
    router.use('/batch-jobs', (0, batch_job_routes_1.createBatchJobRoutes)(pool));
    // Property file routes
    router.use('/property-files', (0, property_file_routes_1.createPropertyFileRoutes)(pool));
    // PropertyRadar list routes
    router.use('/', (0, listRoutes_1.createListRoutes)(pool));
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
exports.configureRoutes = configureRoutes;
