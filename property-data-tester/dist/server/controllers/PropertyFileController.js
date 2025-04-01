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
exports.PropertyFileController = void 0;
const PropertyBatchService_1 = require("../services/PropertyBatchService");
const PropertyPayloadService_1 = require("../services/PropertyPayloadService");
/**
 * Controller for property file operations
 */
class PropertyFileController {
    constructor(pool) {
        this.pool = pool;
        this.propertyPayloadService = new PropertyPayloadService_1.PropertyPayloadService(pool);
        this.propertyBatchService = new PropertyBatchService_1.PropertyBatchService(pool, 'PR', this.propertyPayloadService);
    }
    /**
     * Process pending property files
     * @param req Request
     * @param res Response
     */
    processFiles(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { limit = 10, cleanup = false } = req.body;
                // Process pending files
                const startTime = Date.now();
                const processedCount = yield this.propertyBatchService.processPendingFiles(limit);
                const processingTime = (Date.now() - startTime) / 1000;
                // Check for stuck files
                const stuckFiles = yield this.propertyPayloadService.findStuckFiles();
                // Clean up old files if requested
                if (cleanup) {
                    yield this.propertyPayloadService.cleanupOldFiles(1);
                }
                res.json({
                    processedCount,
                    processingTime,
                    stuckFiles: stuckFiles.length
                });
            }
            catch (error) {
                console.error('Error processing property files:', error);
                res.status(500).json({
                    error: 'Failed to process property files',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
}
exports.PropertyFileController = PropertyFileController;
