import React, { useState } from 'react';
import { CriteriaSelector } from '../CriteriaSelector';
import { fetchProperties } from '../../services';
import { LastTransferRecDateTest } from '../LastTransferRecDateTest';

/**
 * Demo component for PropertyRadar criteria
 */
export const PropertyRadarCriteriaDemo: React.FC = () => {
  const [criteria, setCriteria] = useState<Record<string, any>>({});
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Default fields to fetch
  const defaultFields = [
    'RadarID',
    'Address',
    'City',
    'State',
    'ZipFive',
    'County',
    'APN',
    'PType',
    'OwnershipType',
    'Owner',
    'OwnerFirstName',
    'OwnerLastName',
    'AVM',
    'AvailableEquity',
    'EquityPercent',
    'LastTransferRecDate',
    'LastTransferValue'
  ];
  
  // Handle criteria change
  const handleCriteriaChange = (newCriteria: Record<string, any>) => {
    setCriteria(newCriteria);
  };
  
  // Handle search
  const handleSearch = async () => {
    if (Object.keys(criteria).length === 0) {
      setError('Please select at least one criteria');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchProperties(criteria, defaultFields);
      
      if (response.success) {
        setResults(response.properties || []);
      } else {
        setError(response.error || 'Failed to fetch properties');
      }
    } catch (err) {
      setError('Error fetching properties: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="property-radar-criteria-demo container mt-4">
      <h1>PropertyRadar Criteria Demo</h1>
      <p className="lead">
        This demo shows how to use the PropertyRadar criteria components to build a search interface.
      </p>
      
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <CriteriaSelector 
                onCriteriaChange={handleCriteriaChange}
                initialCriteria={criteria}
              />
              
              <div className="mt-3">
                <button 
                  className="btn btn-primary"
                  onClick={handleSearch}
                  disabled={loading || Object.keys(criteria).length === 0}
                >
                  {loading ? 'Searching...' : 'Search Properties'}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Search Results</h5>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}
              
              {loading && (
                <div className="text-center p-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Searching for properties...</p>
                </div>
              )}
              
              {!loading && !error && results.length === 0 && (
                <div className="alert alert-info">
                  No results yet. Select criteria and click "Search Properties" to see results.
                </div>
              )}
              
              {!loading && !error && results.length > 0 && (
                <div className="results-table">
                  <p>Found {results.length} properties</p>
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>City</th>
                          <th>State</th>
                          <th>ZIP</th>
                          <th>Owner</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((property, index) => (
                          <tr key={property.RadarID || index}>
                            <td>{property.Address}</td>
                            <td>{property.City}</td>
                            <td>{property.State}</td>
                            <td>{property.ZipFive}</td>
                            <td>{property.Owner || `${property.OwnerFirstName || ''} ${property.OwnerLastName || ''}`}</td>
                            <td>${property.AVM?.toLocaleString() || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Current Criteria JSON</h5>
            </div>
            <div className="card-body">
              <pre className="bg-light p-3 rounded">
                {JSON.stringify(criteria, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">LastTransferRecDate Test</h5>
            </div>
            <div className="card-body">
              <LastTransferRecDateTest />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};