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
exports.CriteriaController = void 0;
/**
 * Controller for criteria-related endpoints
 */
class CriteriaController {
    constructor(criteriaService) {
        /**
         * Get all criteria with their types
         */
        this.getAllCriteria = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const criteria = this.criteriaService.getAllCriteria();
                res.json({
                    success: true,
                    count: criteria.length,
                    criteria
                });
            }
            catch (error) {
                console.error('Error getting criteria:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get criteria'
                });
            }
        });
        /**
         * Get criteria by category
         */
        this.getCriteriaByCategory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { category } = req.params;
                if (!category) {
                    res.status(400).json({
                        success: false,
                        error: 'Category parameter is required'
                    });
                    return;
                }
                const criteria = this.criteriaService.getCriteriaByCategory(category);
                res.json({
                    success: true,
                    count: criteria.length,
                    category,
                    criteria
                });
            }
            catch (error) {
                console.error('Error getting criteria by category:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get criteria by category'
                });
            }
        });
        /**
         * Get criteria type map
         */
        this.getCriteriaTypeMap = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const criteriaTypeMap = this.criteriaService.getCriteriaTypeMap();
                res.json({
                    success: true,
                    count: Object.keys(criteriaTypeMap).length,
                    criteriaTypeMap
                });
            }
            catch (error) {
                console.error('Error getting criteria type map:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get criteria type map'
                });
            }
        });
        this.criteriaService = criteriaService;
    }
}
exports.CriteriaController = CriteriaController;
