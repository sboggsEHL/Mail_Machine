"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDnmRoutes = createDnmRoutes;
const express_1 = require("express");
const DnmController_1 = require("../controllers/DnmController");
const DnmRepository_1 = require("../repositories/DnmRepository");
const database_1 = require("../config/database");
/**
 * Create Do Not Mail registry routes
 * @returns Express router with DNM routes
 */
function createDnmRoutes() {
    const router = (0, express_1.Router)();
    const dnmRepo = new DnmRepository_1.DnmRepository(database_1.dbPool);
    const dnmController = new DnmController_1.DnmController(dnmRepo);
    /**
     * @route POST /api/add-to-dnm
     * @desc Add an entity to the DNM registry
     * @access Private - requires authentication
     */
    router.post('/add-to-dnm', dnmController.addToDnm);
    /**
     * @route GET /api/check-dnm
     * @desc Check if an entity is in the DNM registry
     * @access Public
     */
    router.get('/check-dnm', dnmController.checkDnm);
    /**
     * @route DELETE /api/dnm/:id
     * @desc Remove an entity from the DNM registry
     * @access Private - requires authentication
     */
    router.delete('/dnm/:id', dnmController.removeFromDnm);
    /**
     * @route GET /api/dnm/source/:source
     * @desc Get DNM entries by source
     * @access Public
     */
    router.get('/dnm/source/:source', dnmController.getDnmBySource);
    /**
     * @route GET /api/dnm/blocked-by/:blockedBy
     * @desc Get DNM entries by blocked by
     * @access Public
     */
    router.get('/dnm/blocked-by/:blockedBy', dnmController.getDnmByBlockedBy);
    return router;
}
