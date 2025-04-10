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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyPayloadService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const BatchFileStatusRepository_1 = require("../repositories/BatchFileStatusRepository");
/**
 * Service for managing property payload files
 */
class PropertyPayloadService {
    constructor(pool, baseDir = path_1.default.join(process.cwd(), 'logs')) {
        this.batchFileStatusRepo = new BatchFileStatusRepository_1.BatchFileStatusRepository(pool);
        this.baseDir = path_1.default.join(baseDir, 'property_payloads');
        this.pendingDir = path_1.default.join(baseDir, 'pending');
        this.processingDir = path_1.default.join(baseDir, 'processing');
        this.processedDir = path_1.default.join(baseDir, 'processed');
        // Ensure all directories exist
        this.ensureDirectoryExists(this.baseDir);
        this.ensureDirectoryExists(this.pendingDir);
        this.ensureDirectoryExists(this.processingDir);
        this.ensureDirectoryExists(this.processedDir);
    }
    /**
     * Save property payload to file
     * @param properties Array of property data
     * @param campaignId Campaign identifier
     * @param batchNumber Batch sequence number
     * @returns The created batch file status
     */
    savePropertyPayload(properties, campaignId, batchNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            // Create month directory if it doesn't exist
            const now = new Date();
            const monthDir = this.getMonthDirectory(now);
            this.ensureDirectoryExists(monthDir);
            // Create filename with timestamp
            const timestamp = this.formatTimestamp(now);
            const filename = `${campaignId}_batch${batchNumber}_${timestamp}.json`;
            const filePath = path_1.default.join(monthDir, filename);
            // Calculate checksum of the data
            const dataString = JSON.stringify(properties, null, 2);
            const checksum = this.calculateChecksum(dataString);
            // Write properties to file
            yield this.writeJsonToFile(filePath, properties);
            // Create batch file status record
            const fileStatus = {
                file_path: this.getRelativePath(filePath),
                campaign_id: campaignId,
                batch_number: batchNumber,
                status: 'PENDING',
                properties_count: properties.length,
                success_count: 0,
                error_count: 0,
                error_details: JSON.stringify({ checksum })
            };
            const result = yield this.batchFileStatusRepo.createFileStatus(fileStatus);
            // Create a pending marker file
            const pendingMarker = path_1.default.join(this.pendingDir, path_1.default.basename(filePath));
            yield fs_1.default.promises.writeFile(pendingMarker, filePath, 'utf8');
            console.log(`Saved property payload to ${filePath} with ${properties.length} properties`);
            return result;
        });
    }
    /**
     * Get pending files for processing
     * @param limit Maximum number of files to return
     * @returns Array of pending batch files with absolute paths
     */
    getPendingFiles() {
        return __awaiter(this, arguments, void 0, function* (limit = 10) {
            try {
                // Get pending files from database
                const pendingStatuses = yield this.batchFileStatusRepo.findPendingFiles(limit);
                const result = [];
                // Check if the files exist
                for (const fileStatus of pendingStatuses) {
                    const originalPath = this.getAbsolutePath(fileStatus.file_path);
                    if (yield this.fileExists(originalPath)) {
                        result.push({ fileStatus, originalPath });
                    }
                    else {
                        console.error(`File not found: ${originalPath}`);
                        yield this.batchFileStatusRepo.updateProcessingResults(fileStatus.file_id, 0, 0, 0, `File not found: ${originalPath}`);
                    }
                }
                return result;
            }
            catch (error) {
                console.error('Error getting pending files:', error);
                return [];
            }
        });
    }
    /**
     * Process a pending file
     * @param fileStatus Batch file status
     * @param originalPath Original file path
     * @param processor Function to process the properties
     * @returns Processing result
     */
    processFile(fileStatus, originalPath, processor) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileId = fileStatus.file_id;
            const filename = path_1.default.basename(originalPath);
            const processingPath = path_1.default.join(this.processingDir, filename);
            const processedMarker = path_1.default.join(this.processedDir, filename);
            const lockFile = `${processingPath}.lock`;
            try {
                // Check if already processed
                if (yield this.fileExists(processedMarker)) {
                    console.log(`File already processed: ${filename}`);
                    return { success: true, message: 'Already processed' };
                }
                // Check for lock file to prevent concurrent processing
                if (yield this.fileExists(lockFile)) {
                    console.log(`File is locked (being processed): ${filename}`);
                    return { success: false, message: 'File is locked' };
                }
                // Create lock file
                yield fs_1.default.promises.writeFile(lockFile, new Date().toISOString(), 'utf8');
                // Mark as processing in database
                yield this.batchFileStatusRepo.updateStatus(fileId, 'PROCESSING');
                // Copy file to processing directory
                yield fs_1.default.promises.copyFile(originalPath, processingPath);
                // Read the file and verify checksum
                const fileContent = yield fs_1.default.promises.readFile(processingPath, 'utf8');
                const properties = JSON.parse(fileContent);
                // Get stored checksum
                const storedChecksumData = fileStatus.error_details ? JSON.parse(fileStatus.error_details) : {};
                const storedChecksum = storedChecksumData.checksum;
                // Calculate current checksum
                const currentChecksum = this.calculateChecksum(fileContent);
                // Verify checksum
                if (storedChecksum && storedChecksum !== currentChecksum) {
                    throw new Error(`Checksum mismatch: file may be corrupted`);
                }
                // Process the properties
                const startTime = Date.now();
                const { success, errors } = yield processor(properties);
                const processingTime = Date.now() - startTime;
                // Mark as completed in database
                yield this.batchFileStatusRepo.updateProcessingResults(fileId, success, errors, processingTime);
                // Create processed marker
                yield fs_1.default.promises.writeFile(processedMarker, new Date().toISOString(), 'utf8');
                // Remove processing file and lock
                yield fs_1.default.promises.unlink(processingPath);
                yield fs_1.default.promises.unlink(lockFile);
                console.log(`Successfully processed ${filename}: ${success} succeeded, ${errors} failed`);
                return { success: true, message: `Processed ${success} properties with ${errors} errors` };
            }
            catch (error) {
                console.error(`Error processing file ${filename}:`, error);
                // Mark as failed in database
                yield this.batchFileStatusRepo.updateProcessingResults(fileId, 0, fileStatus.properties_count || 0, 0, error.message);
                // Clean up
                try {
                    if (yield this.fileExists(processingPath)) {
                        yield fs_1.default.promises.unlink(processingPath);
                    }
                    if (yield this.fileExists(lockFile)) {
                        yield fs_1.default.promises.unlink(lockFile);
                    }
                }
                catch (cleanupError) {
                    console.error(`Error cleaning up after failed processing:`, cleanupError);
                }
                return { success: false, message: error.message };
            }
        });
    }
    /**
     * Find stuck files
     * @param pendingMinutes Minutes threshold for pending files
     * @param processingMinutes Minutes threshold for processing files
     * @returns Array of stuck batch files
     */
    findStuckFiles() {
        return __awaiter(this, arguments, void 0, function* (pendingMinutes = 60, processingMinutes = 180) {
            return this.batchFileStatusRepo.findStuckFiles(pendingMinutes, processingMinutes);
        });
    }
    /**
     * Clean up old files
     * @param monthsToKeep Number of months to keep files
     * @returns Number of directories removed
     */
    cleanupOldFiles() {
        return __awaiter(this, arguments, void 0, function* (monthsToKeep = 1) {
            try {
                const dirs = yield fs_1.default.promises.readdir(this.baseDir);
                const now = new Date();
                let removedCount = 0;
                for (const dir of dirs) {
                    // Skip non-month directories
                    if (!dir.match(/^\d{4}-\d{2}$/))
                        continue;
                    const [yearStr, monthStr] = dir.split('-');
                    const year = parseInt(yearStr);
                    const month = parseInt(monthStr) - 1; // JS months are 0-based
                    const dirDate = new Date(year, month, 1);
                    const monthsDiff = this.getMonthsDifference(dirDate, now);
                    if (monthsDiff > monthsToKeep) {
                        const dirPath = path_1.default.join(this.baseDir, dir);
                        yield fs_1.default.promises.rm(dirPath, { recursive: true, force: true });
                        removedCount++;
                        console.log(`Removed old property payload directory: ${dirPath}`);
                    }
                }
                return removedCount;
            }
            catch (error) {
                console.error('Error cleaning up old files:', error);
                return 0;
            }
        });
    }
    /**
     * Ensure directory exists
     * @param dir Directory path
     */
    ensureDirectoryExists(dir) {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
    /**
     * Check if file exists
     * @param filePath File path
     * @returns True if file exists
     */
    fileExists(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs_1.default.promises.access(filePath, fs_1.default.constants.F_OK);
                return true;
            }
            catch (_a) {
                return false;
            }
        });
    }
    /**
     * Get month directory
     * @param date Date
     * @returns Path to month directory
     */
    getMonthDirectory(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return path_1.default.join(this.baseDir, `${year}-${month}`);
    }
    /**
     * Format timestamp
     * @param date Date
     * @returns Formatted timestamp
     */
    formatTimestamp(date) {
        return date.toISOString()
            .replace(/[:.]/g, '')
            .replace('T', '')
            .replace('Z', '');
    }
    /**
     * Calculate checksum of data
     * @param data Data to calculate checksum for
     * @returns Checksum
     */
    calculateChecksum(data) {
        return crypto_1.default.createHash('md5').update(data).digest('hex');
    }
    /**
     * Write JSON to file
     * @param filePath File path
     * @param data Data to write
     */
    writeJsonToFile(filePath, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs_1.default.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
            }
            catch (error) {
                console.error(`Error writing to ${filePath}:`, error);
                throw new Error(`Failed to write property payload: ${error.message}`);
            }
        });
    }
    /**
     * Get relative path
     * @param absolutePath Absolute path
     * @returns Relative path
     */
    getRelativePath(absolutePath) {
        return path_1.default.relative(process.cwd(), absolutePath).replace(/\\/g, '/');
    }
    /**
     * Get absolute path
     * @param relativePath Relative path
     * @returns Absolute path
     */
    getAbsolutePath(relativePath) {
        if (path_1.default.isAbsolute(relativePath)) {
            return relativePath;
        }
        return path_1.default.join(process.cwd(), relativePath);
    }
    /**
     * Get months difference between two dates
     * @param date1 First date
     * @param date2 Second date
     * @returns Number of months
     */
    getMonthsDifference(date1, date2) {
        const yearDiff = date2.getFullYear() - date1.getFullYear();
        const monthDiff = date2.getMonth() - date1.getMonth();
        return yearDiff * 12 + monthDiff;
    }
}
exports.PropertyPayloadService = PropertyPayloadService;
