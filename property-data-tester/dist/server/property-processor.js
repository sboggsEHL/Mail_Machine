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
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const PropertyBatchService_1 = require("./services/PropertyBatchService");
const PropertyPayloadService_1 = require("./services/PropertyPayloadService");
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
// Create database connection pool
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
// Create services
const propertyPayloadService = new PropertyPayloadService_1.PropertyPayloadService(pool);
const propertyBatchService = new PropertyBatchService_1.PropertyBatchService(pool, 'PR', propertyPayloadService);
/**
 * Process pending property files
 */
function processPendingFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting property file processing...');
        try {
            // Process pending files
            const processedCount = yield propertyBatchService.processPendingFiles(10);
            console.log(`Processed ${processedCount} property files`);
            // Check for stuck files
            const stuckFiles = yield propertyPayloadService.findStuckFiles();
            if (stuckFiles.length > 0) {
                console.warn(`Found ${stuckFiles.length} stuck files:`);
                stuckFiles.forEach(file => {
                    console.warn(`- ${file.file_path} (Status: ${file.status}, Created: ${file.created_at})`);
                });
            }
            // Clean up old files (keep files for the current month plus previous month)
            if (process.env.AUTO_CLEANUP === 'true') {
                const removedCount = yield propertyPayloadService.cleanupOldFiles(1);
                if (removedCount > 0) {
                    console.log(`Cleaned up ${removedCount} old property payload directories`);
                }
            }
        }
        catch (error) {
            console.error('Error processing property files:', error);
        }
    });
}
/**
 * Main function
 */
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Process files
            yield processPendingFiles();
            // If running as a one-time job, exit
            if (process.env.RUN_MODE === 'once') {
                console.log('Property processing completed');
                process.exit(0);
            }
            // Otherwise, schedule to run every minute
            setInterval(processPendingFiles, 60000);
            console.log('Property processor running in continuous mode');
        }
        catch (error) {
            console.error('Fatal error in property processor:', error);
            process.exit(1);
        }
    });
}
// Run the main function
main().catch(error => {
    console.error('Unhandled error in property processor:', error);
    process.exit(1);
});
