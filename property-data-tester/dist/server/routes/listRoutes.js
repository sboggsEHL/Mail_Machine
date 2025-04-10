"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createListRoutes = createListRoutes;
const express_1 = require("express");
const ListController_1 = require("../controllers/ListController");
function createListRoutes(pool) {
    const router = (0, express_1.Router)();
    const listController = new ListController_1.ListController(pool);
    // Get all lists
    router.get('/lists', (req, res) => listController.getLists(req, res));
    // Create a new list
    router.post('/lists', (req, res) => listController.createList(req, res));
    // Get items from a specific list
    router.get('/lists/:listId/items', (req, res) => listController.getListItems(req, res));
    // Check for duplicates in a list
    router.get('/lists/:listId/check-duplicates', (req, res) => listController.checkDuplicates(req, res));
    // Check for duplicates in a batch of radar IDs
    router.post('/lists/:listId/check-duplicates-batch', (req, res) => listController.checkDuplicatesBatch(req, res));
    // Process a list (excluding specified duplicates)
    router.post('/lists/:listId/process', (req, res) => listController.processList(req, res));
    // Process multiple lists
    router.post('/lists/process-multiple', (req, res) => listController.processMultipleLists(req, res));
    return router;
}
