"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCriteriaRoutes = createCriteriaRoutes;
const express_1 = require("express");
const CriteriaController_1 = require("../controllers/CriteriaController");
/**
 * Create and configure criteria routes
 * @returns Express router with criteria routes
 */
function createCriteriaRoutes() {
    const router = (0, express_1.Router)();
    /**
     * @route   GET /api/criteria/:category
     * @desc    Get criteria definitions by category
     * @access  Private
     */
    router.get('/:category', CriteriaController_1.CriteriaController.getCriteriaByCategory);
    return router;
}
