"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCriteriaRoutes = void 0;
const express_1 = require("express");
const CriteriaController_1 = require("../controllers/CriteriaController");
const CriteriaService_1 = require("../services/CriteriaService");
/**
 * Create and configure criteria routes
 * @returns Express router with criteria routes
 */
function createCriteriaRoutes() {
    const router = (0, express_1.Router)();
    // Create instances of services and controllers
    const criteriaService = new CriteriaService_1.CriteriaService();
    const criteriaController = new CriteriaController_1.CriteriaController(criteriaService);
    /**
     * @route   GET /api/criteria
     * @desc    Get all criteria definitions
     * @access  Private
     */
    router.get('/', criteriaController.getAllCriteria);
    /**
     * @route   GET /api/criteria/types
     * @desc    Get criteria type map
     * @access  Private
     */
    router.get('/types', criteriaController.getCriteriaTypeMap);
    /**
     * @route   GET /api/criteria/:category
     * @desc    Get criteria definitions by category
     * @access  Private
     */
    router.get('/:category', criteriaController.getCriteriaByCategory);
    return router;
}
exports.createCriteriaRoutes = createCriteriaRoutes;
