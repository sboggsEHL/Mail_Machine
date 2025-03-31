import jwt from 'jsonwebtoken';
import { User } from '../../shared/types/auth';

// Environment variables with defaults for development
const JWT_SECRET = process.env.JWT_SECRET || 'property-data-tester-jwt-secret-key';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m'; // 15 minutes
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'; // 7 days

/**
 * Token payload structure
 */
export interface TokenPayload {
  userId: number;
  username: string;
  isAdmin: boolean;
}

/**
 * Token response structure
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Generate JWT access token for a user
 */
export function generateAccessToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    isAdmin: !!user.isAdmin
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY as any
  });
}

/**
 * Generate JWT refresh token for a user
 */
export function generateRefreshToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    isAdmin: !!user.isAdmin
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY as any
  });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokens(user: User): TokenResponse {
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

/**
 * Verify JWT token and return payload
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract JWT token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}
