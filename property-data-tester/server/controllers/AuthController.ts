import { Request, Response } from 'express';
import { Pool } from 'pg';
import { UserRepository } from '../repositories/UserRepository';
import { generateTokens, verifyToken } from '../utils/jwt';
import { LoginRequest, LoginResponse, User } from '../../shared/types/auth';

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
        res.status(400).json({
          success: false,
          error: 'Username and password are required'
        });
        return;
      }
      
      // Verify credentials
      const user = await this.userRepository.verifyCredentials(username, password);
      
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
      const tokens = generateTokens(clientUser);
      
      // Return tokens and user info
      res.json({
        success: true,
        user: clientUser,
        ...tokens
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
        res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
        return;
      }
      
      // Verify refresh token
      const decoded = verifyToken(refreshToken);
      
      if (!decoded) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token'
        });
        return;
      }
      
      // Find user by ID
      const user = await this.userRepository.findById(decoded.userId);
      
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
      const tokens = generateTokens(clientUser);
      
      // Return tokens
      res.json({
        success: true,
        ...tokens
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
    
    if (user) {
      res.json({
        success: true,
        user
      });
    } else {
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
