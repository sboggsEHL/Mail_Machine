import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';

/**
 * Authentication middleware
 * Verifies the JWT token in the Authorization header
 * Sets req.user to the decoded token payload if valid
 * Otherwise returns 401 Unauthorized
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    // Add user info to request
    (req as any).user = {
      id: decoded.userId,
      username: decoded.username,
      isAdmin: decoded.isAdmin
    };

    next();
  } catch (error) {
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
export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if user exists (should be set by authMiddleware)
  const user = (req as any).user;

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
