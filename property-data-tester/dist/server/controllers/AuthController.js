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
exports.AuthController = void 0;
const UserRepository_1 = require("../repositories/UserRepository");
const jwt_1 = require("../utils/jwt");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Controller for authentication operations
 */
class AuthController {
    constructor(pool) {
        /**
         * Login endpoint
         * Authenticates user credentials and issues JWT tokens
         */
        this.login = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { username, password } = req.body;
                if (!username || !password) {
                    throw new errors_1.AppError(errors_1.ERROR_CODES.VALIDATION_ERROR, 'Username and password are required', 400);
                }
                // Verify credentials
                const user = yield this.userRepository.verifyCredentials(username, password);
                if (!user) {
                    throw new errors_1.AppError(errors_1.ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid credentials', 401);
                }
                // Map database user to client user
                const clientUser = this.userRepository.mapToClientUser(user);
                // Generate tokens
                const tokens = (0, jwt_1.generateTokens)(clientUser);
                // Return tokens and user info
                res.json(Object.assign({ success: true, user: clientUser }, tokens));
            }
            catch (error) {
                logger_1.default.error('Login error:', error);
                if (error instanceof errors_1.AppError) {
                    throw error;
                }
                throw new errors_1.AppError(errors_1.ERROR_CODES.SYSTEM_UNEXPECTED_ERROR, 'An unexpected error occurred during login', 500, error);
            }
        });
        /**
         * Refresh token endpoint
         * Issues a new access token using a valid refresh token
         */
        this.refreshToken = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { refreshToken } = req.body;
                if (!refreshToken) {
                    throw new errors_1.AppError(errors_1.ERROR_CODES.VALIDATION_ERROR, 'Refresh token is required', 400);
                }
                // Verify refresh token
                const decoded = (0, jwt_1.verifyToken)(refreshToken);
                if (!decoded) {
                    throw new errors_1.AppError(errors_1.ERROR_CODES.AUTH_TOKEN_EXPIRED, 'Invalid or expired refresh token', 401);
                }
                // Find user by ID
                const user = yield this.userRepository.findById(decoded.userId);
                if (!user || !user.is_active) {
                    throw new errors_1.AppError(errors_1.ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'User not found or inactive', 401);
                }
                // Map database user to client user
                const clientUser = this.userRepository.mapToClientUser(user);
                // Generate new tokens
                const tokens = (0, jwt_1.generateTokens)(clientUser);
                // Return tokens
                res.json(Object.assign({ success: true }, tokens));
            }
            catch (error) {
                logger_1.default.error('Refresh token error:', error);
                if (error instanceof errors_1.AppError) {
                    throw error;
                }
                throw new errors_1.AppError(errors_1.ERROR_CODES.SYSTEM_UNEXPECTED_ERROR, 'An unexpected error occurred during token refresh', 500, error);
            }
        });
        /**
         * Get current user endpoint
         * Requires a valid JWT token provided in the Authorization header
         * Authentication handled by authMiddleware
         */
        this.getCurrentUser = (req, res) => {
            // User info should be set by the auth middleware
            const user = req.user;
            if (!user) {
                throw new errors_1.AppError(errors_1.ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, 'Not authenticated', 401);
            }
            res.json({
                success: true,
                user
            });
        };
        /**
         * Verify token endpoint
         * Checks if an access token is valid
         */
        this.verifyToken = (req, res) => {
            // Validation is handled by auth middleware
            res.json({
                success: true,
                message: 'Token is valid'
            });
        };
        /**
         * Logout endpoint
         * Clients should discard tokens on their side
         * Server can't invalidate JWT tokens, but can provide a blacklist in the future if needed
         */
        this.logout = (req, res) => {
            // With JWT approach, logout is handled client-side by discarding tokens
            // Server-side, we just return success
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        };
        this.userRepository = new UserRepository_1.UserRepository(pool);
    }
}
exports.AuthController = AuthController;
