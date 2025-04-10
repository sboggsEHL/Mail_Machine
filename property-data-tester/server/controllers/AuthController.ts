import { Request, Response } from 'express';
import { Pool } from 'pg';
import { UserRepository } from '../repositories/UserRepository';
import { generateTokens, verifyToken } from '../utils/jwt';
import { LoginRequest, LoginResponse, User } from '../../shared/types/auth';
import { AppError, ERROR_CODES } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Controller for authentication operations
 */
export class AuthController {
  private userRepository: UserRepository;

  constructor(pool: Pool) {
    this.userRepository = new UserRepository(pool);
  }

  /**
   * Login endpoint
   * Authenticates user credentials and issues JWT tokens
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body as LoginRequest;
      
      if (!username || !password) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Username and password are required',
          400
        );
      }
      
      // Verify credentials
      const user = await this.userRepository.verifyCredentials(username, password);
      
      if (!user) {
        throw new AppError(
          ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          'Invalid credentials',
          401
        );
      }
      
      // Map database user to client user
      const clientUser = this.userRepository.mapToClientUser(user);
      
      // Generate tokens
      const tokens = generateTokens(clientUser);
      
      // Return tokens and user info
      res.json({
        success: true,
        user: clientUser,
        ...tokens
      });
    } catch (error) {
      logger.error('Login error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.SYSTEM_UNEXPECTED_ERROR,
        'An unexpected error occurred during login',
        500,
        error
      );
    }
  };

  /**
   * Refresh token endpoint
   * Issues a new access token using a valid refresh token
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Refresh token is required',
          400
        );
      }
      
      // Verify refresh token
      const decoded = verifyToken(refreshToken);
      
      if (!decoded) {
        throw new AppError(
          ERROR_CODES.AUTH_TOKEN_EXPIRED,
          'Invalid or expired refresh token',
          401
        );
      }
      
      // Find user by ID
      const user = await this.userRepository.findById(decoded.userId);
      
      if (!user || !user.is_active) {
        throw new AppError(
          ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          'User not found or inactive',
          401
        );
      }
      
      // Map database user to client user
      const clientUser = this.userRepository.mapToClientUser(user);
      
      // Generate new tokens
      const tokens = generateTokens(clientUser);
      
      // Return tokens
      res.json({
        success: true,
        ...tokens
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.SYSTEM_UNEXPECTED_ERROR,
        'An unexpected error occurred during token refresh',
        500,
        error
      );
    }
  };

  /**
   * Get current user endpoint
   * Requires a valid JWT token provided in the Authorization header
   * Authentication handled by authMiddleware
   */
  getCurrentUser = (req: Request, res: Response): void => {
    // User info should be set by the auth middleware
    const user = (req as any).user;
    
    if (!user) {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        'Not authenticated',
        401
      );
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
  verifyToken = (req: Request, res: Response): void => {
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
  logout = (req: Request, res: Response): void => {
    // With JWT approach, logout is handled client-side by discarding tokens
    // Server-side, we just return success
    res.json({ 
      success: true,
      message: 'Logged out successfully'
    });
  };
}
