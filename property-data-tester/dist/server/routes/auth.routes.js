"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRoutes = createAuthRoutes;
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const auth_middleware_1 = require("../middleware/auth.middleware");
/**
 * Create authentication routes
 * @param pool Database pool
 * @returns Express router with auth routes
 */
function createAuthRoutes(pool) {
    const router = (0, express_1.Router)();
    const authController = new AuthController_1.AuthController(pool);
    /**
     * @route POST /api/auth/login
     * @desc Login with username and password, returns JWT tokens
     * @access Public
     */
    router.post('/login', authController.login);
    /**
     * @route POST /api/auth/refresh-token
     * @desc Get new access token using a refresh token
     * @access Public
     */
    router.post('/refresh-token', authController.refreshToken);
    /**
     * @route GET /api/auth/current-user
     * @desc Get current user from JWT token
     * @access Private
     */
    router.get('/current-user', auth_middleware_1.authMiddleware, authController.getCurrentUser);
    /**
     * @route POST /api/auth/verify-token
     * @desc Verify if a token is valid
     * @access Private
     */
    router.post('/verify-token', auth_middleware_1.authMiddleware, authController.verifyToken);
    /**
     * @route POST /api/auth/logout
     * @desc For JWT, this is mostly client-side, but may need server handling in future
     * @access Public
     */
    router.post('/logout', authController.logout);
    return router;
}
