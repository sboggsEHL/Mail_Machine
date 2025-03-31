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
exports.AuthController = void 0;
const UserRepository_1 = require("../repositories/UserRepository");
const jwt_1 = require("../utils/jwt");
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
                    res.status(400).json({
                        success: false,
                        error: 'Username and password are required'
                    });
                    return;
                }
                // Verify credentials
                const user = yield this.userRepository.verifyCredentials(username, password);
                if (!user) {
                    res.status(401).json({
                        success: false,
                        error: 'Invalid credentials'
                    });
                    return;
                }
                // Map database user to client user
                const clientUser = this.userRepository.mapToClientUser(user);
                // Generate tokens
                const tokens = (0, jwt_1.generateTokens)(clientUser);
                // Return tokens and user info
                res.json(Object.assign({ success: true, user: clientUser }, tokens));
            }
            catch (error) {
                console.error('Login error:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
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
                    res.status(400).json({
                        success: false,
                        error: 'Refresh token is required'
                    });
                    return;
                }
                // Verify refresh token
                const decoded = (0, jwt_1.verifyToken)(refreshToken);
                if (!decoded) {
                    res.status(401).json({
                        success: false,
                        error: 'Invalid or expired refresh token'
                    });
                    return;
                }
                // Find user by ID
                const user = yield this.userRepository.findById(decoded.userId);
                if (!user || !user.is_active) {
                    res.status(401).json({
                        success: false,
                        error: 'User not found or inactive'
                    });
                    return;
                }
                // Map database user to client user
                const clientUser = this.userRepository.mapToClientUser(user);
                // Generate new tokens
                const tokens = (0, jwt_1.generateTokens)(clientUser);
                // Return tokens
                res.json(Object.assign({ success: true }, tokens));
            }
            catch (error) {
                console.error('Refresh token error:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
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
            if (user) {
                res.json({
                    success: true,
                    user
                });
            }
            else {
                res.status(401).json({
                    success: false,
                    message: 'Not authenticated'
                });
            }
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
