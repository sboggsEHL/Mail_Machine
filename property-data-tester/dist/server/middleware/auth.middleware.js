"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.adminMiddleware = adminMiddleware;
const jwt_1 = require("../utils/jwt");
/**
 * Authentication middleware
 * Verifies the JWT token in the Authorization header
 * Sets req.user to the decoded token payload if valid
 * Otherwise returns 401 Unauthorized
 */
function authMiddleware(req, res, next) {
    try {
        // Extract token from header
        const authHeader = req.headers.authorization;
        const token = (0, jwt_1.extractTokenFromHeader)(authHeader);
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'No token provided'
            });
            return;
        }
        // Verify token
        const decoded = (0, jwt_1.verifyToken)(token);
        if (!decoded) {
            res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
            return;
        }
        // Add user info to request
        req.user = {
            id: decoded.userId,
            username: decoded.username,
            isAdmin: decoded.isAdmin
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
}
/**
 * Admin middleware
 * Requires a valid JWT token AND admin privileges
 * Requires authMiddleware to run first
 */
function adminMiddleware(req, res, next) {
    // Check if user exists (should be set by authMiddleware)
    const user = req.user;
    if (!user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
        return;
    }
    // Check if user is admin
    if (!user.isAdmin) {
        res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
        return;
    }
    next();
}
