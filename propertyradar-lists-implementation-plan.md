# PropertyRadar Lists Implementation Plan

## Overview

This document outlines the implementation plan for enhancing the application to support creating PropertyRadar lists from search results. The implementation will allow users to:

1. Search for properties using existing criteria selection
2. View the total number of matching records
3. Create a static list with an automatically generated name (which can be modified)
4. Receive confirmation of successful list creation

## Implementation Components

### 1. Backend Enhancements

#### 1.1 PropertyRadarListService Enhancements

Add a new method to the `PropertyRadarListService` class to create lists:

```typescript
// property-data-tester/server/services/PropertyRadarListService.ts

/**
 * Create a new list in PropertyRadar
 * @param listData List creation data
 * @returns Created list information
 */
async createList(listData: {
  Criteria: any[];
  ListName: string;
  ListType: string;
  isMonitored: number;
}): Promise<PropertyRadarList> {
  try {
    const response = await axios.post(
      `${this.apiBaseUrl}/v1/lists`,
      listData,
      {
        headers: this.getAuthHeaders()
      }
    );
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }
    
    throw new Error('No list created in response');
  } catch (error) {
    console.error('Error creating PropertyRadar list:', error);
    throw error;
  }
}
```

#### 1.2 API Endpoint for List Creation

Create a new API endpoint to handle list creation requests:

```typescript
// property-data-tester/server/routes/lists.ts

import { Router } from 'express';
import { PropertyRadarListService } from '../services/PropertyRadarListService';

const router = Router();
const listService = new PropertyRadarListService(pool);

/**
 * Create a new list
 * POST /api/lists
 */
router.post('/', async (req, res) => {
  try {
    const { criteria, listName, listType = 'static', isMonitored = 0 } = req.body;
    
    if (!criteria || !listName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const listData = {
      Criteria: criteria,
      ListName: listName,
      ListType: listType,
      isMonitored: isMonitored
    };
    
    const createdList = await listService.createList(listData);
    
    return res.json({
      success: true,
      list: createdList
    });
  } catch (error) {
    console.error('Error creating list:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create list',
      details: error.message
    });
  }
});

export default router;
```

#### 1.3 Update Server Configuration

Register the new routes in the server:

```typescript
// property-data-tester/server.ts

// Add this import
import listRoutes from './server/routes/lists';

// Add this line in the routes registration section
app.use('/api/lists', listRoutes);
```

### 2. Frontend Enhancements

#### 2.1 List Creation Service

Ensure the service handles list creation API calls and includes a method for previewing counts:

```typescript
// property-data-tester/src/services/list.service.ts

// Ensure this method exists in the list service
/**
 * Create a new list
 * @param criteria Search criteria
 * @param listName List name
 * @param listType List type (default: 'static')
 * @param isMonitored Whether the list is monitored (default: 0)
 * @returns API response
 */
async createList(criteria: any[], listName: string, listType = 'static', isMonitored = 0) {
  try {
    // Use the configured api instance (e.g., Axios)
    const response = await api.post('/lists', {
      criteria,
      listName,
      listType,
      isMonitored
    });
    
    return await response.data; // Assuming Axios response structure
  } catch (error) {
    console.error('Error creating list:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create list'
    };
  }
}

/**
 * Preview property count (Add if not already present in a suitable service)
 * @param criteria Search criteria
 * @returns Preview result with count
 */
async previewPropertyCount(criteria: any): Promise<{ success: boolean, count?: number, error?: string }> {
  try {
    const response = await api.post('/properties/preview', { criteria });
    return response.data; // Assuming backend returns { success: true, count: number }
  } catch (error) {
    console.error('Error previewing property count:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview count'
    };
  }
}
```

#### 2.2 List Creation Modal Component

Create a modal component for list creation confirmation:

```tsx
// property-data-tester/src/components/CreateListModal.tsx

import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

interface CreateListModalProps {
  show: boolean;
  onHide: () => void;
  suggestedName: string;
  totalRecords: number;
  onCreateList: (listName: string) => Promise<void>;
}

const CreateListModal: React.FC<CreateListModalProps> = ({
  show,
  onHide,
  suggestedName,
  totalRecords,
  onCreateList
}) => {
  const [listName, setListName] = useState(suggestedName);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!listName.trim()) {
      setError('List name is required');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      await onCreateList(listName);
      onHide();
    } catch (err) {
      setError('Failed to create list. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create PropertyRadar List</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Your search matched <strong>{totalRecords}</strong> properties.
          Would you like to create a static list with these properties?
        </p>
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>List Name</Form.Label>
            <Form.Control
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter list name"
              maxLength={100}
              required
            />
            <Form.Text className="text-muted">
              You can modify the suggested name or use it as is.
            </Form.Text>
          </Form.Group>
          
          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
            </Alert>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isCreating}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isCreating || !listName.trim()}
        >
          {isCreating ? 'Creating...' : 'Create List'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateListModal;
```

#### 2.3 List Name Generation Utility

Create a utility function to generate list names:

```typescript
// property-data-tester/src/utils/listUtils.ts

import { PropertyRadarApiParams } from '../types/api';

/**
 * Generate a descriptive list name based on search criteria
 * @param apiParams API parameters with criteria
 * @param totalRecords Total matching records
 * @returns Generated list name
 */
export function generateListName(apiParams: PropertyRadarApiParams, totalRecords: number): string {
  const { criteria } = apiParams;
  const nameParts: string[] = [];
  
  // State criteria
  if (criteria.State) {
    nameParts.push(Array.isArray(criteria.State) 
      ? criteria.State.join(', ') + ' Properties'
      : criteria.State + ' Properties');
  }
  
  // Property Type
  if (criteria.PropertyType) {
    const propertyTypeMap: Record<string, string> = {
      'SFR': 'Single Family',
      'CND': 'Condo',
      'MFR': 'Multi-Family',
      'MH': 'Mobile Home',
      'LND': 'Land'
    };
    
    const types = Array.isArray(criteria.PropertyType) 
      ? criteria.PropertyType.map(type => propertyTypeMap[type] || type).join(', ')
      : propertyTypeMap[criteria.PropertyType] || criteria.PropertyType;
    
    nameParts.push(types);
  }
  
  // Beds
  if (criteria.Beds) {
    const beds = Array.isArray(criteria.Beds) && criteria.Beds.length === 2
      ? `${criteria.Beds[0] || '0'}+ Beds`
      : `${criteria.Beds}+ Beds`;
    
    nameParts.push(beds);
  }
  
  // Add record count
  nameParts.push(`(${totalRecords} Records)`);
  
  // Join parts with appropriate separators
  return nameParts.join(': ');
}
```

#### 2.4 Enhance App Component for UI Integration

Modify the main `App.tsx` component to include list creation functionality:

```tsx
// property-data-tester/src/App.tsx

// --- Add necessary imports ---
import { useState } from 'react';
import { listService } from './services/list.service'; // Assuming preview function is here too
import CreateListModal from './components/CreateListModal';
import { generateListName } from './utils/listUtils';
import { Button, Alert } from 'react-bootstrap'; // Ensure Button/Alert are imported

function App() {
  // --- existing state ---
  const { selectedProvider, setSelectedProvider } = useProvider(); // Get provider state
  const [apiParams, setApiParams] = useState<PropertyRadarApiParams>(/* initial state */);

  // --- Add state for list creation ---
  const [showCreateListModal, setShowCreateListModal] = useState<boolean>(false);
  const [listCreationTotalRecords, setListCreationTotalRecords] = useState<number>(0);
  const [listCreationSuggestedName, setListCreationSuggestedName] = useState<string>('');
  const [isCalculatingPreview, setIsCalculatingPreview] = useState<boolean>(false);
  const [listCreationError, setListCreationError] = useState<string | null>(null);

  // --- Add handler functions ---

  const handleCreateListClick = async () => {
    if (selectedProvider !== 'PR') return; // Only for PropertyRadar

    if (!apiParams.criteria || Object.keys(apiParams.criteria).length === 0) {
      setListCreationError('Please select at least one search criterion.');
      return;
    }

    setIsCalculatingPreview(true);
    setListCreationError(null);

    try {
      // Call the preview function (ensure it exists in listService or similar)
      const previewData = await listService.previewPropertyCount(apiParams.criteria);

      if (previewData.success && previewData.count !== undefined) {
        setListCreationTotalRecords(previewData.count);
        const suggestedName = generateListName(apiParams, previewData.count);
        setListCreationSuggestedName(suggestedName);
        setShowCreateListModal(true);
      } else {
        throw new Error(previewData.error || 'Failed to calculate matching records.');
      }
    } catch (error) {
      console.error('Error calculating records:', error);
      setListCreationError(error instanceof Error ? error.message : 'An error occurred during preview.');
    } finally {
      setIsCalculatingPreview(false);
    }
  };

  const handleCreateList = async (finalListName: string) => {
    // This function is passed to the modal's onCreateList prop
    try {
      const response = await listService.createList(
        apiParams.criteria, // Use current criteria
        finalListName,
        'static',
        0
      );

      if (response.success) {
        alert(`List "${finalListName}" created successfully!`);
        // Optionally: Navigate to lists page or refresh list data
      } else {
        throw new Error(response.error || 'Failed to create list');
      }
    } catch (error) {
      console.error('Error creating list:', error);
      // Re-throw error so the modal can display it
      throw error;
    }
  };

  // --- Modify JSX Rendering ---

  return (
    <>
      {/* --- existing Navbar --- */}

      <Container>
        {currentPage === 'main' && (
          <>
            {/* --- existing main page content (FieldSelector, ApiParamsForm) --- */}
            
            <Row className="mb-4">
              {/* --- Col for FieldSelector --- */}
              <Col lg={6}>
                {/* --- ApiParamsForm --- */}

                {/* --- Replace 'Force Background Processing' Button --- */}
                <div className="d-flex gap-2 mt-3">
                  {selectedProvider === 'PR' && ( // Conditionally render for PropertyRadar
                    <Button
                      variant="success" // Or another appropriate variant
                      size="lg"
                      onClick={handleCreateListClick}
                      disabled={isCalculatingPreview || Object.keys(apiParams.criteria || {}).length === 0}
                      title="Create a PropertyRadar list from the current criteria"
                    >
                      {isCalculatingPreview ? 'Calculating...' : 'Create List'}
                    </Button>
                  )}
                  {/* Removed the old 'Force Background Processing' button */}
                </div>

                {/* Display Preview/Creation Errors */}
                {listCreationError && (
                  <Alert variant="danger" className="mt-3">
                    {listCreationError}
                  </Alert>
                )}

                {/* --- existing fetchStatus error Alert --- */}
              </Col>
            </Row>

            {/* --- existing PropertyList, InsertResults, etc. --- */}
          </>
        )}

        {/* --- other page route rendering (Campaigns, Batch Jobs, etc.) --- */}
      </Container>

      {/* --- Render Modal (outside specific page views) --- */}
      <CreateListModal
        show={showCreateListModal}
        onHide={() => setShowCreateListModal(false)}
        suggestedName={listCreationSuggestedName}
        totalRecords={listCreationTotalRecords}
        onCreateList={handleCreateList}
      />
    </>
  );
}
```

#### 2.5 Add Preview API Endpoint

Create an endpoint to calculate matching records without purchasing:

```typescript
// property-data-tester/server/routes/properties.ts

/**
 * Preview property count based on criteria
 * POST /api/properties/preview
 */
router.post('/preview', async (req, res) => {
  try {
    const { criteria } = req.body;
    
    if (!criteria) {
      return res.status(400).json({
        success: false,
        error: 'Missing criteria'
      });
    }
    
    const provider = leadProviderFactory.getProvider('PR');
    
    if (!provider.isConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'Provider not configured'
      });
    }
    
    // Use the preview functionality to get count without purchasing
    const previewResult = await provider.previewProperties(criteria);
    
    return res.json({
      success: true,
      count: previewResult.count || 0
    });
  } catch (error) {
    console.error('Error previewing properties:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to preview properties',
      details: error.message
    });
  }
});
```

#### 2.6 Add Preview Method to PropertyRadarProvider

Implement the preview method in the PropertyRadarProvider:

```typescript
// property-data-tester/server/services/lead-providers/propertyradar/PropertyRadarProvider.ts

/**
 * Preview properties based on criteria without purchasing
 * @param criteria Search criteria
 * @returns Preview result with count
 */
async previewProperties(criteria: any): Promise<{ count: number }> {
  try {
    const apiParams = this.buildApiParams(criteria, ['RadarID'], 0);
    
    const response = await axios.post(
      `${this.apiBaseUrl}/v1/properties`,
      { Criteria: apiParams.criteria },
      {
        params: {
          Fields: 'RadarID',
          Limit: 1,
          Purchase: 0
        },
        headers: this.getAuthHeaders()
      }
    );
    
    return {
      count: response.data.resultCount || 0
    };
  } catch (error) {
    console.error('Error previewing properties:', error);
    throw error;
  }
}
```

## Implementation Steps

1.  **Backend Implementation**:
    *   Ensure `PropertyRadarListService` has `createList` method (with preview/validation).
    *   Ensure `POST /api/lists` endpoint exists and functions.
    *   Ensure `PropertyRadarProvider` has `previewProperties` method.
    *   Ensure `POST /api/properties/preview` endpoint exists and uses the provider's method.

2.  **Frontend Implementation**:
    *   Ensure `listUtils.ts` has `generateListName` and `validateListName`.
    *   Ensure `CreateListModal.tsx` component exists and functions.
    *   Ensure `list.service.ts` has `createList` and `previewPropertyCount` methods.
    *   **Modify `App.tsx`**:
        *   Add state variables for modal control, preview data, and loading/error status.
        *   Add `handleCreateListClick` and `handleCreateList` handler functions.
        *   Replace the "Force Background Processing" button with the new "Create List" button (conditionally rendered for PropertyRadar).
        *   Render the `CreateListModal` component.

3. **Testing**:
   - Test list name generation with various criteria
   - Test preview functionality
   - Test list creation with different criteria combinations
   - Verify error handling

## Conclusion

This implementation plan provides a comprehensive approach to adding list creation functionality to the application. The feature will allow users to:

1. Search for properties using existing criteria
2. Preview the number of matching records
3. Create a static list with an automatically generated name
4. Modify the list name if desired
5. Receive confirmation of successful list creation

The implementation follows the existing patterns in the codebase and extends the functionality in a modular way.

## Technical Considerations and Constraints

Based on the PropertyRadar API documentation and existing code, the following technical considerations and constraints need to be addressed in the implementation:

### 1. API Limitations and Error Handling

#### 1.1 Rate Limiting

The PropertyRadar API may have rate limits, although specific limits are not documented. To handle potential rate limiting:

```typescript
// property-data-tester/server/services/lead-providers/propertyradar/PropertyRadarProvider.ts

/**
 * Handle API errors with rate limit detection
 */
private handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    if (axiosError.response) {
      // Check for rate limiting (429 Too Many Requests)
      if (axiosError.response.status === 429) {
        console.error('PropertyRadar API rate limit exceeded');
        
        // Get retry-after header if available
        const retryAfter = axiosError.response.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
        
        console.log(`Waiting ${waitTime}ms before retrying...`);
        throw new Error(`PropertyRadar API rate limit exceeded. Retry after ${waitTime}ms.`);
      }
      
      // Handle other API errors
      console.error('PropertyRadar API error status:', axiosError.response.status);
      console.error('PropertyRadar API error data:', axiosError.response.data);
      
      throw new Error(`PropertyRadar API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
    }
    // ... rest of error handling
  }
}
```

#### 1.2 Retry Mechanism

Implement a retry mechanism for API calls that might fail due to network issues or rate limiting:

```typescript
// property-data-tester/server/utils/apiRetry.ts

/**
 * Execute a function with retry logic
 * @param fn Function to execute
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @param backoffFactor Factor to increase delay on each retry
 * @returns Promise with the function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  backoffFactor: number = 2
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if this is a rate limit error
      const isRateLimit = error.message && error.message.includes('rate limit exceeded');
      
      // Extract retry time from error message if available
      let waitTime = initialDelay * Math.pow(backoffFactor, attempt);
      if (isRateLimit && error.message.includes('Retry after')) {
        const match = error.message.match(/Retry after (\d+)ms/);
        if (match && match[1]) {
          waitTime = parseInt(match[1]);
        }
      }
      
      // Don't retry on the last attempt
      if (attempt >= maxRetries) {
        break;
      }
      
      console.log(`API call failed, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}
```

### 2. List Size Limitations

PropertyRadar may have limitations on the number of properties that can be added to a list. To handle this:

```typescript
// property-data-tester/server/services/PropertyRadarListService.ts

/**
 * Create a new list with size validation
 */
async createList(listData: {
  Criteria: any[];
  ListName: string;
  ListType: string;
  isMonitored: number;
}): Promise<PropertyRadarList> {
  // Check if criteria might result in too many properties
  try {
    // First, get an estimate of how many properties match the criteria
    const previewResponse = await axios.post(
      `${this.apiBaseUrl}/v1/properties`,
      { Criteria: listData.Criteria },
      {
        params: {
          Fields: 'RadarID',
          Limit: 1,
          Purchase: 0
        },
        headers: this.getAuthHeaders()
      }
    );
    
    const estimatedCount = previewResponse.data.resultCount || 0;
    
    // If the count is very large, warn in logs but proceed
    // (PropertyRadar will likely handle this on their end)
    if (estimatedCount > 10000) {
      console.warn(`Creating list with large number of properties: ${estimatedCount}`);
    }
    
    // Create the list
    const response = await axios.post(
      `${this.apiBaseUrl}/v1/lists`,
      listData,
      {
        headers: this.getAuthHeaders()
      }
    );
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }
    
    throw new Error('No list created in response');
  } catch (error) {
    console.error('Error creating PropertyRadar list:', error);
    throw error;
  }
}
```

### 3. Authentication and Token Refresh

The current implementation uses a static token from environment variables. For a more robust solution:

```typescript
// property-data-tester/server/services/PropertyRadarAuthService.ts

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class PropertyRadarAuthService {
  private apiBaseUrl: string = 'https://api.propertyradar.com';
  private authToken: string;
  private tokenExpiry: Date | null = null;
  
  constructor() {
    this.authToken = process.env.PROPERTY_RADAR_TOKEN || '';
  }
  
  /**
   * Get a valid authentication token
   */
  async getToken(): Promise<string> {
    // If we have a token and it's not expired, return it
    if (this.authToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.authToken;
    }
    
    // If we have a token but don't know expiry, assume it's valid
    // PropertyRadar will return 401 if it's not, and we'll handle that elsewhere
    if (this.authToken) {
      return this.authToken;
    }
    
    // If we don't have a token, throw an error
    throw new Error('PropertyRadar API token not configured');
  }
  
  /**
   * Get authentication headers for PropertyRadar API
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Handle authentication errors and token refresh
   */
  handleAuthError(error: any): void {
    // If we get a 401 Unauthorized, clear the token
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.error('PropertyRadar API authentication failed. Token may be expired.');
      this.authToken = '';
      this.tokenExpiry = null;
    }
  }
}
```

### 4. List Name Validation

Ensure list names are valid and within the 50 character limit:

```typescript
// property-data-tester/src/utils/listUtils.ts

/**
 * Validate and format a list name
 * @param name Proposed list name
 * @returns Formatted list name
 */
export function validateListName(name: string): string {
  // Remove any characters that might cause issues
  let sanitized = name.replace(/[^\w\s\-:,()]/g, '');
  
  // Trim to 50 characters (PropertyRadar limit)
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 47) + '...';
  }
  
  return sanitized;
}
```

### 5. Caching for Preview Functionality

To avoid repeated expensive API calls for previewing property counts:

```typescript
// property-data-tester/server/services/PropertyRadarCacheService.ts

import NodeCache from 'node-cache';

export class PropertyRadarCacheService {
  private cache: NodeCache;
  
  constructor(ttlSeconds: number = 300) { // 5 minute default TTL
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2
    });
  }
  
  /**
   * Get cached preview result or null if not found
   */
  getPreviewResult(criteriaHash: string): { count: number } | null {
    const key = `preview_${criteriaHash}`;
    return this.cache.get(key) || null;
  }
  
  /**
   * Cache a preview result
   */
  setPreviewResult(criteriaHash: string, result: { count: number }): void {
    const key = `preview_${criteriaHash}`;
    this.cache.set(key, result);
  }
  
  /**
   * Generate a hash for criteria object
   */
  static hashCriteria(criteria: any): string {
    return require('crypto')
      .createHash('md5')
      .update(JSON.stringify(criteria))
      .digest('hex');
  }
}
```

## Implementation Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PropertyRadar API rate limits | API calls may fail, disrupting list creation | Implement retry mechanism with exponential backoff |
| Large lists may exceed limits | List creation could fail for large property sets | Add validation and warning for large result sets |
| Authentication token expiry | API calls may fail with 401 errors | Add token refresh handling |
| Network reliability issues | API calls may fail intermittently | Implement retry logic for transient failures |
| List name validation | Invalid characters or excessive length could cause issues | Add validation and truncation for list names |

## Testing Strategy

1. **Unit Tests**:
   - Test list name generation with various criteria combinations
   - Test list name validation and truncation
   - Test criteria transformation for API requests

2. **Integration Tests**:
   - Test preview functionality with small criteria sets
   - Test list creation with minimal properties
   - Test error handling for various API response scenarios

3. **Manual Tests**:
   - Test with large result sets to verify handling
   - Test with various criteria combinations
   - Verify error messages are clear and actionable