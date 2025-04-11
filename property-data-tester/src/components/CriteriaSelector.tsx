import React, { useState, useEffect } from 'react';
import { BaseCriteriaComponent } from './criteria/BaseCriteriaComponent';
import { useProvider } from '../context/ProviderContext';
import { getProviderApi } from '../services/providerApiFactory';

/**
 * Interface for criteria definition
 */
interface CriteriaDefinition {
  name: string;
  criteriaType: string;
  description: string;
  category?: string;
}

/**
 * Interface for criteria values
 */
interface CriteriaValues {
  [key: string]: any;
}

/**
 * Props for the CriteriaSelector component
 */
interface CriteriaSelectorProps {
  onCriteriaChange: (criteria: CriteriaValues) => void;
  initialCriteria?: CriteriaValues;
}

/**
 * Component for selecting and configuring criteria
 */
export const CriteriaSelector: React.FC<CriteriaSelectorProps> = ({ onCriteriaChange, initialCriteria = {} }) => {
  const [criteria, setCriteria] = useState<CriteriaDefinition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('location');
  const [criteriaValues, setCriteriaValues] = useState<CriteriaValues>(initialCriteria);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { selectedProvider } = useProvider();
  const api = getProviderApi(selectedProvider);

  // Categories for criteria
  const categories = [
    { id: 'location', name: 'Location' },
    { id: 'property', name: 'Property' },
    { id: 'value', name: 'Value & Equity' },
    { id: 'transfer', name: 'Transfer' },
    { id: 'foreclosure', name: 'Foreclosure' },
    { id: 'listing', name: 'Listing' },
    { id: 'loans', name: 'Loans & Liens' },
    { id: 'owner', name: 'Owner Details' },
    { id: 'tax', name: 'Property Tax' },
    { id: 'other', name: 'Other' }
  ];

  // Load criteria on component mount
  useEffect(() => {
    loadCriteria();
  }, [api]);

  // Load criteria from API
  const loadCriteria = async () => {
    try {
      setLoading(true);
      setError(null);
  
      const response = await api.fetchAllCriteria?.();
      if (response?.success) {
        setCriteria(response.criteria);
      } else {
        setError('Failed to load criteria');
      }
    } catch (err) {
      setError('Error loading criteria: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  // Handle criteria value change
  const handleCriteriaChange = (name: string, value: any) => {
    const newValues = {
      ...criteriaValues,
      [name]: value
    };
    
    // Remove empty values
    if (Array.isArray(value) && value.length === 0) {
      delete newValues[name];
    }
    
    setCriteriaValues(newValues);
    onCriteriaChange(newValues);
  };
  
  // Get criteria for the selected category
  const getCriteriaForCategory = () => {
    return criteria.filter(c => c.category === selectedCategory);
  };
  
  return (
    <div className="criteria-selector">
      <h3>Select Criteria</h3>
      
      {/* Category tabs */}
      <ul className="nav nav-tabs mb-3">
        {categories.map(category => (
          <li key={category.id} className="nav-item">
            <button 
              className={`nav-link ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          </li>
        ))}
      </ul>
      
      {/* Loading and error states */}
      {loading && <div className="alert alert-info">Loading criteria...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {/* Criteria components */}
      {!loading && !error && (
        <div className="criteria-list">
          {getCriteriaForCategory().length === 0 ? (
            <div className="alert alert-warning">No criteria available for this category</div>
          ) : (
            getCriteriaForCategory().map(criterion => (
              <div key={criterion.name} className="card mb-3">
                <div className="card-body">
                  <BaseCriteriaComponent
                    name={criterion.name}
                    description={criterion.description}
                    criteriaType={criterion.criteriaType}
                    value={criteriaValues[criterion.name] || []}
                    onChange={handleCriteriaChange}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Selected criteria summary */}
      <div className="selected-criteria mt-4">
        <h4>Selected Criteria</h4>
        {Object.keys(criteriaValues).length === 0 ? (
          <p className="text-muted">No criteria selected</p>
        ) : (
          <ul className="list-group">
            {Object.entries(criteriaValues).map(([name, value]) => (
              <li key={name} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <strong>{name}:</strong> {' '}
                  <span className="text-muted">
                    {Array.isArray(value) 
                      ? (typeof value[0] === 'object' 
                          ? JSON.stringify(value) 
                          : value.join(', '))
                      : String(value)}
                  </span>
                </div>
                <button 
                  className="btn btn-sm btn-danger"
                  onClick={() => handleCriteriaChange(name, [])}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};