import React from 'react';
import { LastTransferRecDateTest } from '../LastTransferRecDateTest';

/**
 * Test page component
 */
export const TestPage: React.FC = () => {
  return (
    <div className="container mt-4">
      <h1>Test Page</h1>
      <p className="lead">
        This page is for testing individual components.
      </p>
      
      <LastTransferRecDateTest />
    </div>
  );
};