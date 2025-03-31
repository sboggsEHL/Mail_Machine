import React, { useState } from 'react';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import FieldSelector from './components/FieldSelector';
import ApiParamsForm from './components/ApiParamsForm';
import PropertyList from './components/PropertyList';
import InsertResults from './components/InsertResults';
import { PropertyRadarProperty, PropertyRadarApiParams } from './types/api';

interface FetchStatus {
  loading: boolean;
  error: string | null;
}

interface InsertStatus {
  loading: boolean;
  error: string | null;
}

interface InsertResultsData {
  success: boolean;
  error?: string;
  count: number;
  properties: Array<{
    propertyId: number | string;
    radarId: string;
    address: string;
    city: string;
    state: string;
  }>;
}

function App() {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [apiParams, setApiParams] = useState<PropertyRadarApiParams>({
    limit: 10,
    start: 1,
    purchase: 0,
    criteria: {},
    fields: []
  });
  const [properties, setProperties] = useState<PropertyRadarProperty[]>([]);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({ loading: false, error: null });
  const [insertStatus, setInsertStatus] = useState<InsertStatus>({ loading: false, error: null });
  const [insertResults, setInsertResults] = useState<InsertResultsData | null>(null);

  const handleFetchProperties = async (): Promise<void> => {
    if (selectedFields.length === 0) {
      setFetchStatus({ loading: false, error: 'Please select at least one field' });
      return;
    }

    setFetchStatus({ loading: true, error: null });
    setProperties([]);

    try {
      const response = await fetch('http://localhost:3001/api/fetch-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: selectedFields,
          limit: apiParams.limit,
          start: apiParams.start,
          purchase: apiParams.purchase,
          criteria: apiParams.criteria
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch properties');
      }

      setProperties(data.properties);
      setFetchStatus({ loading: false, error: null });
    } catch (error) {
      setFetchStatus({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    }
  };

  const handleInsertProperties = async (): Promise<void> => {
    if (properties.length === 0) {
      setInsertStatus({ loading: false, error: 'No properties to insert' });
      return;
    }

    setInsertStatus({ loading: true, error: null });
    setInsertResults(null);

    try {
      const response = await fetch('http://localhost:3001/api/insert-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: properties
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to insert properties');
      }

      setInsertResults(data);
      setInsertStatus({ loading: false, error: null });
    } catch (error) {
      setInsertStatus({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    }
  };

  return (
    <Container className="mt-4">
      <h1 className="mb-4">PropertyRadar API Tester</h1>
      
      <Row className="mb-4">
        <Col lg={6}>
          <FieldSelector 
            selectedFields={selectedFields} 
            onFieldSelectionChange={setSelectedFields}
            availableFields={[]} 
          />
        </Col>
        <Col lg={6}>
          <ApiParamsForm 
            apiParams={apiParams} 
            setApiParams={setApiParams} 
          />
          
          <div className="d-grid gap-2 mt-3">
            <Button 
              variant="primary" 
              size="lg" 
              onClick={handleFetchProperties}
              disabled={fetchStatus.loading}
            >
              {fetchStatus.loading ? 'Fetching...' : 'Fetch Properties'}
            </Button>
          </div>
          
          {fetchStatus.error && (
            <Alert variant="danger" className="mt-3">
              {fetchStatus.error}
            </Alert>
          )}
        </Col>
      </Row>
      
      {properties.length > 0 && (
        <>
          <Row className="mb-3">
            <Col>
              <h2>Retrieved Properties ({properties.length})</h2>
              <div className="d-grid gap-2">
                <Button 
                  variant="success" 
                  size="lg" 
                  onClick={handleInsertProperties}
                  disabled={insertStatus.loading}
                >
                  {insertStatus.loading ? 'Inserting...' : 'Insert Into Database'}
                </Button>
              </div>
              
              {insertStatus.error && (
                <Alert variant="danger" className="mt-3">
                  {insertStatus.error}
                </Alert>
              )}
            </Col>
          </Row>
          
          <Row>
            <Col>
              <PropertyList properties={properties} selectedFields={selectedFields} />
            </Col>
          </Row>
        </>
      )}
      
      {insertResults && (
        <Row className="mt-4">
          <Col>
            <InsertResults results={insertResults} />
          </Col>
        </Row>
      )}
    </Container>
  );
}

export default App;
