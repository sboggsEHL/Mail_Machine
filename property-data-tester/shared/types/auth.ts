/**
 * User interface for authentication
 */
export interface User {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Login response payload
 */
export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * Token response for refresh operations
 */
export interface TokenResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}

/**
 * Authentication status response
 */
export interface AuthStatusResponse {
  success: boolean;
  user?: User;
  message?: string;
}
