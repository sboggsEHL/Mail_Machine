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
exports.DnmController = void 0;
/**
 * Controller for Do Not Mail registry operations
 */
class DnmController {
    constructor(dnmRepo) {
        /**
         * Add an entity to the DNM registry
         */
        this.addToDnm = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Verify user is authenticated
                if (!req.session.user) {
                    res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                    return;
                }
                const { loanId, propertyId, radarId, reason, reasonCategory, notes } = req.body;
                // Validate required fields
                if (!loanId && !propertyId && !radarId) {
                    res.status(400).json({
                        success: false,
                        error: 'At least one identifier (loanId, propertyId, or radarId) is required'
                    });
                    return;
                }
                // Add to DNM registry
                const dnmEntry = yield this.dnmRepo.addToDnm({
                    loan_id: loanId,
                    property_id: typeof propertyId === 'string' ? parseInt(propertyId, 10) : propertyId,
                    radar_id: radarId,
                    reason,
                    reason_category: reasonCategory,
                    source: 'property-data-tester',
                    blocked_by: req.session.user.username,
                    notes
                });
                res.json({
                    success: true,
                    dnmId: dnmEntry.dnm_id,
                    message: `Successfully added to DNM registry by ${req.session.user.username}`
                });
            }
            catch (error) {
                console.error('Error adding to DNM registry:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        /**
         * Check if an entity is in the DNM registry
         */
        this.checkDnm = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { loanId, propertyId, radarId } = req.query;
                // Validate at least one identifier is provided
                if (!loanId && !propertyId && !radarId) {
                    res.status(400).json({
                        success: false,
                        error: 'At least one identifier (loanId, propertyId, or radarId) is required'
                    });
                    return;
                }
                let dnmEntries = [];
                if (loanId) {
                    const entries = yield this.dnmRepo.findByLoanId(loanId);
                    dnmEntries.push(...entries);
                }
                if (propertyId) {
                    const parsedPropertyId = parseInt(propertyId, 10);
                    if (!isNaN(parsedPropertyId)) {
                        const entries = yield this.dnmRepo.findByPropertyId(parsedPropertyId);
                        // Filter out duplicates
                        entries.forEach(entry => {
                            if (!dnmEntries.some(e => e.dnm_id === entry.dnm_id)) {
                                dnmEntries.push(entry);
                            }
                        });
                    }
                }
                if (radarId) {
                    const entries = yield this.dnmRepo.findByRadarId(radarId);
                    // Filter out duplicates
                    entries.forEach(entry => {
                        if (!dnmEntries.some(e => e.dnm_id === entry.dnm_id)) {
                            dnmEntries.push(entry);
                        }
                    });
                }
                res.json({
                    success: true,
                    inDnm: dnmEntries.length > 0,
                    entries: dnmEntries
                });
            }
            catch (error) {
                console.error('Error checking DNM status:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        /**
         * Remove an entity from the DNM registry
         */
        this.removeFromDnm = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Verify user is authenticated
                if (!req.session.user) {
                    res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                    return;
                }
                const dnmId = parseInt(req.params.id, 10);
                if (isNaN(dnmId)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid DNM ID'
                    });
                    return;
                }
                const success = yield this.dnmRepo.removeFromDnm(dnmId);
                if (!success) {
                    res.status(404).json({
                        success: false,
                        error: 'DNM entry not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Successfully removed from DNM registry'
                });
            }
            catch (error) {
                console.error('Error removing from DNM registry:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        /**
         * Get DNM entries by source
         */
        this.getDnmBySource = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const source = req.params.source;
                const limit = parseInt(req.query.limit || '100', 10);
                const offset = parseInt(req.query.offset || '0', 10);
                const entries = yield this.dnmRepo.findBySource(source, limit, offset);
                res.json({
                    success: true,
                    count: entries.length,
                    entries
                });
            }
            catch (error) {
                console.error('Error getting DNM entries by source:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        /**
         * Get DNM entries by blocked by
         */
        this.getDnmByBlockedBy = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const blockedBy = req.params.blockedBy;
                const limit = parseInt(req.query.limit || '100', 10);
                const offset = parseInt(req.query.offset || '0', 10);
                const entries = yield this.dnmRepo.findByBlockedBy(blockedBy, limit, offset);
                res.json({
                    success: true,
                    count: entries.length,
                    entries
                });
            }
            catch (error) {
                console.error('Error getting DNM entries by blocked by:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        this.dnmRepo = dnmRepo;
    }
}
exports.DnmController = DnmController;
