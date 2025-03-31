import axios from 'axios';
import { TokenResponse, User } from '../../shared/types/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/auth';

/**
 * Auth service for JWT token management and user authentication
 */
class AuthService {
  /**
   * Get the current access token from localStorage
   */
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Get the refresh token from localStorage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Check if user is authenticated (has a valid token)
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const expiry = localStorage.getItem('tokenExpiry');
    
    // If no token or expiry, not authenticated
    if (!token || !expiry) {
      return false;
    }
    
    // Check if token has expired
    const expiryDate = new Date(expiry);
    return expiryDate > new Date();
  }

  /**
   * Save auth tokens to localStorage
   */
  saveTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    // Calculate and store expiration time
    const expiryTime = new Date(Date.now() + expiresIn * 1000).toISOString();
    localStorage.setItem('tokenExpiry', expiryTime);
    localStorage.setItem('isAuthenticated', 'true');
  }

  /**
   * Clear auth tokens from localStorage
   */
  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('isAuthenticated');
  }

  /**
   * Check if token needs refresh (less than 1 minute left)
   */
  needsRefresh(): boolean {
    const expiry = localStorage.getItem('tokenExpiry');
    
    if (!expiry) {
      return false;
    }
    
    const expiryDate = new Date(expiry);
    const now = new Date();
    
    // If less than 1 minute left (60000 ms), refresh token
    return (expiryDate.getTime() - now.getTime()) < 60000;
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      
      if (!refreshToken) {
        return false;
      }
      
      const response = await axios.post<TokenResponse>(`${API_URL}/refresh-token`, {
        refreshToken
      });
      
      if (response.data.success && response.data.accessToken && response.data.refreshToken) {
        this.saveTokens(
          response.data.accessToken,
          response.data.refreshToken,
          response.data.expiresIn || 900 // Default 15 minutes
        );
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // On refresh failure, clear tokens and redirect to login
      this.clearTokens();
      return false;
    }
  }

  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Ensure token is valid
      if (this.needsRefresh()) {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          return null;
        }
      }
      
      const token = this.getAccessToken();
      if (!token) {
        return null;
      }
      
      const response = await axios.get(`${API_URL}/current-user`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success && response.data.user) {
        return response.data.user;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Logout the user
   */
  async logout(): Promise<boolean> {
    try {
      // Call logout API
      await axios.post(`${API_URL}/logout`);
      
      // Clear tokens regardless of API success
      this.clearTokens();
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      // Still clear tokens even if API call fails
      this.clearTokens();
      return true;
    }
  }

  /**
   * Setup axios interceptors for auth
   */
  setupInterceptors(): void {
    // Request interceptor to add token to headers
    axios.interceptors.request.use(
      async (config) => {
        // Don't add token for auth endpoints
        if (config.url?.includes('/login') || config.url?.includes('/refresh-token')) {
          return config;
        }
        
        // Check if token needs to be refreshed
        if (this.needsRefresh()) {
          await this.refreshToken();
        }
        
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor to handle 401 errors
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If 401 error and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Try to refresh token
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry original request with new token
            const token = this.getAccessToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axios(originalRequest);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService;
