"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const dotenv = __importStar(require("dotenv"));
const database_1 = require("./config/database");
const BatchJobRepository_1 = require("./repositories/BatchJobRepository");
const BatchJobService_1 = require("./services/BatchJobService");
const PropertyBatchService_1 = require("./services/PropertyBatchService");
const JobQueueService_1 = require("./services/JobQueueService");
const propertyradar_1 = require("./services/lead-providers/propertyradar");
const LeadProviderFactory_1 = require("./services/lead-providers/LeadProviderFactory");
// Load environment variables
dotenv.config();
/**
 * Main worker function
 */
function startWorker() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Starting batch processing worker...');
            // Log configuration
            (0, database_1.logDatabaseConfig)();
            // Test database connection
            yield (0, database_1.testDatabaseConnection)(database_1.dbPool);
            // Register PropertyRadar provider
            const propertyRadarToken = process.env.PROPERTY_RADAR_TOKEN;
            if (propertyRadarToken) {
                const propertyRadarProvider = (0, propertyradar_1.createPropertyRadarProvider)(propertyRadarToken);
                LeadProviderFactory_1.leadProviderFactory.registerProvider(propertyRadarProvider);
                console.log(`Registered PropertyRadar provider with token: ${propertyRadarToken.substring(0, 5)}...`);
            }
            else {
                console.warn('No PropertyRadar token found in environment variables');
            }
            // Create services
            const batchJobRepository = new BatchJobRepository_1.BatchJobRepository(database_1.dbPool);
            const batchJobService = new BatchJobService_1.BatchJobService(batchJobRepository);
            const propertyBatchService = new PropertyBatchService_1.PropertyBatchService(database_1.dbPool);
            // Create job queue service (this will start processing jobs)
            const jobQueueService = new JobQueueService_1.JobQueueService(batchJobService, propertyBatchService, database_1.dbPool);
            console.log('Worker started successfully');
            // Keep the process running
            process.on('SIGINT', () => __awaiter(this, void 0, void 0, function* () {
                console.log('Shutting down worker...');
                jobQueueService.stopPolling();
                process.exit(0);
            }));
        }
        catch (error) {
            console.error('Error starting worker:', error);
            process.exit(1);
        }
    });
}
// Start the worker
startWorker();
