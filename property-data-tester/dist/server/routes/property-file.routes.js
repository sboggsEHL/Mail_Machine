"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPropertyFileRoutes = void 0;
const express_1 = require("express");
const PropertyFileController_1 = require("../controllers/PropertyFileController");
/**
 * Create property file routes
 * @param pool Database connection pool
 * @returns Express router
 */
function createPropertyFileRoutes(pool) {
    const router = (0, express_1.Router)();
    const propertyFileController = new PropertyFileController_1.PropertyFileController(pool);
    // Process property files
    router.post('/process', (req, res) => propertyFileController.processFiles(req, res));
    return router;
}
exports.createPropertyFileRoutes = createPropertyFileRoutes;
