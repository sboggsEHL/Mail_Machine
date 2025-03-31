import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { Pool } from 'pg';
import { authMiddleware } from '../middleware/auth.middleware';

/**
 * Create authentication routes
 * @param pool Database pool
 * @returns Express router with auth routes
 */
export function createAuthRoutes(pool: Pool): Router {
  const router = Router();
  const authController = new AuthController(pool);
  
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
  router.get('/current-user', authMiddleware, authController.getCurrentUser);
  
  /**
   * @route POST /api/auth/verify-token
   * @desc Verify if a token is valid
   * @access Private
   */
  router.post('/verify-token', authMiddleware, authController.verifyToken);
  
  /**
   * @route POST /api/auth/logout
   * @desc For JWT, this is mostly client-side, but may need server handling in future
   * @access Public
   */
  router.post('/logout', authController.logout);
  
  return router;
}
