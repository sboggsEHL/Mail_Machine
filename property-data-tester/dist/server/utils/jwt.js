"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTokenFromHeader = exports.verifyToken = exports.generateTokens = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Environment variables with defaults for development
const JWT_SECRET = process.env.JWT_SECRET || 'property-data-tester-jwt-secret-key';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m'; // 15 minutes
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'; // 7 days
/**
 * Generate JWT access token for a user
 */
function generateAccessToken(user) {
    const payload = {
        userId: user.id,
        username: user.username,
        isAdmin: !!user.isAdmin
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_ACCESS_EXPIRY
    });
}
exports.generateAccessToken = generateAccessToken;
/**
 * Generate JWT refresh token for a user
 */
function generateRefreshToken(user) {
    const payload = {
        userId: user.id,
        username: user.username,
        isAdmin: !!user.isAdmin
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRY
    });
}
exports.generateRefreshToken = generateRefreshToken;
/**
 * Generate both access and refresh tokens
 */
function generateTokens(user) {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    // Calculate expiry in seconds (15 minutes)
    const expiresIn = 15 * 60;
    return {
        accessToken,
        refreshToken,
        expiresIn
    };
}
exports.generateTokens = generateTokens;
/**
 * Verify JWT token and return payload
 */
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (error) {
        return null;
    }
}
exports.verifyToken = verifyToken;
/**
 * Extract JWT token from Authorization header
 */
function extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
}
exports.extractTokenFromHeader = extractTokenFromHeader;
