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
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = require("./routes");
const database_1 = require("./config/database");
const propertyradar_1 = require("./services/lead-providers/propertyradar");
const LeadProviderFactory_1 = require("./services/lead-providers/LeadProviderFactory");
const errors_1 = require("./utils/errors");
const logger_1 = __importDefault(require("./utils/logger"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * Create and configure Express application
 */
function createApp() {
    return __awaiter(this, void 0, void 0, function* () {
        const app = (0, express_1.default)();
        // Log database connection details
        (0, database_1.logDatabaseConfig)();
        // Test database connection
        try {
            yield (0, database_1.testDatabaseConnection)(database_1.dbPool);
        }
        catch (error) {
            console.error('Database connection test failed:', error);
            // Continue anyway, the app might still work with some features disabled
        }
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
        // CORS middleware
        app.use((0, cors_1.default)({
            origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
            credentials: true
        }));
        // JSON body parser
        app.use(express_1.default.json({ limit: '1mb' }));
        // URL-encoded body parser
        app.use(express_1.default.urlencoded({ extended: true }));
        // JWT auth setup
        const JWT_SECRET = process.env.JWT_SECRET || 'property-data-tester-jwt-secret-key';
        console.log(`JWT auth configured with secret: ${JWT_SECRET.substring(0, 3)}...`);
        // Configure API routes
        app.use('/', (0, routes_1.configureRoutes)(database_1.dbPool));
        // Add basic route for health check
        app.get('/', (req, res) => {
            res.json({
                status: 'ok',
                message: 'Property Data API Server is running',
                version: process.env.npm_package_version || '0.1.0'
            });
        });
        // Error handling middleware
        app.use((err, req, res, next) => {
            logger_1.default.error('Unhandled error:', err);
            if (err instanceof errors_1.AppError) {
                const { statusCode, code, message, details } = err;
                res.status(statusCode).json({
                    success: false,
                    error: {
                        code,
                        message: message || errors_1.ERROR_DESCRIPTIONS[code] || 'Unknown error',
                        details,
                    },
                });
            }
            else {
                // For non-AppError instances, return a generic 500 error
                res.status(500).json({
                    success: false,
                    error: {
                        code: 'SYS001',
                        message: 'Internal server error',
                    },
                });
            }
        });
        return app;
    });
}
exports.createApp = createApp;
