// Custom error class for the application
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: string, message: string, statusCode: number = 500, details?: any) {
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

// Error codes and descriptions
export const ERROR_CODES = {
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

export const ERROR_DESCRIPTIONS: { [key: string]: string } = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Invalid username or password',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Authentication token has expired',
  [ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions to perform this action',

  [ERROR_CODES.PROPERTY_DATA_NOT_FOUND]: 'Property data not found',
  [ERROR_CODES.PROPERTY_DATA_INVALID]: 'Invalid property data',
  [ERROR_CODES.PROPERTY_DATA_DUPLICATE]: 'Duplicate property data',

  [ERROR_CODES.CAMPAIGN_NOT_FOUND]: 'Campaign not found',
  [ERROR_CODES.CAMPAIGN_INVALID_STATE]: 'Campaign is in an invalid state',
  [ERROR_CODES.CAMPAIGN_CREATION_FAILED]: 'Failed to create campaign',

  [ERROR_CODES.BATCH_JOB_NOT_FOUND]: 'Batch job not found',
  [ERROR_CODES.BATCH_JOB_FAILED]: 'Batch job failed',
  [ERROR_CODES.BATCH_JOB_INVALID_STATE]: 'Batch job is in an invalid state',

  [ERROR_CODES.VALIDATION_ERROR]: 'Validation error',
  [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided',

  [ERROR_CODES.SYSTEM_UNEXPECTED_ERROR]: 'Unexpected system error',
  [ERROR_CODES.SYSTEM_CONFIGURATION_ERROR]: 'System configuration error',
  [ERROR_CODES.DATABASE_CONNECTION_ERROR]: 'Database connection error',
};
