"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_DESCRIPTIONS = exports.ERROR_CODES = exports.AppError = void 0;
// Custom error class for the application
class AppError extends Error {
    constructor(code, message, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
    }
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
        };
    }
}
exports.AppError = AppError;
// Error codes and descriptions
exports.ERROR_CODES = {
    // Authentication/Authorization Errors
    AUTH_INVALID_CREDENTIALS: 'AUTH001',
    AUTH_TOKEN_EXPIRED: 'AUTH002',
    AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH003',
    // Property Data Errors
    PROPERTY_DATA_NOT_FOUND: 'PROP001',
    PROPERTY_DATA_INVALID: 'PROP002',
    PROPERTY_DATA_DUPLICATE: 'PROP003',
    // Campaign Errors
    CAMPAIGN_NOT_FOUND: 'CAMP001',
    CAMPAIGN_INVALID_STATE: 'CAMP002',
    CAMPAIGN_CREATION_FAILED: 'CAMP003',
    // Batch Job Errors
    BATCH_JOB_NOT_FOUND: 'BATCH001',
    BATCH_JOB_FAILED: 'BATCH002',
    BATCH_JOB_INVALID_STATE: 'BATCH003',
    // Validation Errors
    VALIDATION_ERROR: 'VALID001',
    INVALID_INPUT: 'VALID002',
    // System Errors
    SYSTEM_UNEXPECTED_ERROR: 'SYS001',
    SYSTEM_CONFIGURATION_ERROR: 'SYS002',
    DATABASE_CONNECTION_ERROR: 'SYS003',
};
exports.ERROR_DESCRIPTIONS = {
    [exports.ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Invalid username or password',
    [exports.ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Authentication token has expired',
    [exports.ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions to perform this action',
    [exports.ERROR_CODES.PROPERTY_DATA_NOT_FOUND]: 'Property data not found',
    [exports.ERROR_CODES.PROPERTY_DATA_INVALID]: 'Invalid property data',
    [exports.ERROR_CODES.PROPERTY_DATA_DUPLICATE]: 'Duplicate property data',
    [exports.ERROR_CODES.CAMPAIGN_NOT_FOUND]: 'Campaign not found',
    [exports.ERROR_CODES.CAMPAIGN_INVALID_STATE]: 'Campaign is in an invalid state',
    [exports.ERROR_CODES.CAMPAIGN_CREATION_FAILED]: 'Failed to create campaign',
    [exports.ERROR_CODES.BATCH_JOB_NOT_FOUND]: 'Batch job not found',
    [exports.ERROR_CODES.BATCH_JOB_FAILED]: 'Batch job failed',
    [exports.ERROR_CODES.BATCH_JOB_INVALID_STATE]: 'Batch job is in an invalid state',
    [exports.ERROR_CODES.VALIDATION_ERROR]: 'Validation error',
    [exports.ERROR_CODES.INVALID_INPUT]: 'Invalid input provided',
    [exports.ERROR_CODES.SYSTEM_UNEXPECTED_ERROR]: 'Unexpected system error',
    [exports.ERROR_CODES.SYSTEM_CONFIGURATION_ERROR]: 'System configuration error',
    [exports.ERROR_CODES.DATABASE_CONNECTION_ERROR]: 'Database connection error',
};
