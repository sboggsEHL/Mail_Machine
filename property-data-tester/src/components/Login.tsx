import React, { useState, FormEvent, useEffect } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { LoginProps } from '../types/components';
import { LoginResponse } from '../../shared/types/auth';
import axios from 'axios';
import authService from '../services/auth.service';

function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Check if already authenticated on component mount
  useEffect(() => {
    // Only check on mount, not when onLoginSuccess changes
    const checkInitialAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const user = await authService.getCurrentUser();
          if (user && onLoginSuccess) {
            await onLoginSuccess();
          }
        }
      } catch (error) {
        console.error('Initial auth check error:', error);
        // Clear tokens on error
        authService.clearTokens();
      }
    };
    checkInitialAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const response = await axios.post<LoginResponse>(
        '/api/auth/login',
        { username, password }
      );
      
      const data = response.data;
      
      if (data.success && data.accessToken && data.refreshToken) {
        // Save tokens using auth service
        authService.saveTokens(
          data.accessToken,
          data.refreshToken,
          data.expiresIn || 900,
          username // Pass the username to store in localStorage
        );
        
        // Set up interceptors for auto-refresh
        authService.setupInterceptors();
        
        // Get user data before calling success callback
        const user = await authService.getCurrentUser();
        if (user && onLoginSuccess) {
          await onLoginSuccess();
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      setError('Login failed: ' + (err.response?.data?.error || err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 mx-auto" style={{ maxWidth: '400px' }}>
      <Card.Title className="text-center mb-4">Login</Card.Title>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Username</Form.Label>
          <Form.Control
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Form.Group>
        
        <div className="d-grid gap-2">
          <Button 
            variant="primary" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </div>
      </Form>
    </Card>
  );
}

export default Login;
