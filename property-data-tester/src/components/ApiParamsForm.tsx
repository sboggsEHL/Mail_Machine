import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Tabs, Tab, ListGroup, Badge, Button } from 'react-bootstrap';
import { PropertyRadarApiParams } from '../types/api';
import { 
  CriterionDefinition, 
  AllCriteriaDefinitions
} from '../../shared/types/criteria';
import { criteriaDefinitions } from '../utils/criteriaDefinitions';

// Criteria categories
const CRITERIA_CATEGORIES = [
  { key: 'location', label: 'Location' },
  { key: 'property', label: 'Property' },
  { key: 'ownerdetails', label: 'Owner Details' },
  { key: 'value&equity', label: 'Value & Equity' },
  { key: 'propertytax', label: 'Property Tax' },
  { key: 'listing', label: 'Listing' },
  { key: 'loans&liens', label: 'Loans & Liens' },
  { key: 'foreclosure', label: 'Foreclosure' },
  { key: 'transfer', label: 'Transfer' }
];

// US States for dropdown
const US_STATES: string[] = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Property Types
const PROPERTY_TYPES: { value: string; label: string }[] = [
  { value: 'SFR', label: 'Single Family Residence' },
  { value: 'CND', label: 'Condo' },
  { value: 'MFR', label: 'Multi-Family Residence' },
  { value: 'MH', label: 'Mobile Home' },
  { value: 'LND', label: 'Land' }
];

// Loan Types
const LOAN_TYPES: { value: string; label: string }[] = [
  { value: 'C', label: 'Conventional' },
  { value: 'F', label: 'FHA' },
  { value: 'V', label: 'VA' },
  { value: 'P', label: 'Private' }
];

interface LocalApiParamsFormProps {
  apiParams: PropertyRadarApiParams;
  setApiParams: React.Dispatch<React.SetStateAction<PropertyRadarApiParams>>;
}

// Get badge color for a category
const getCategoryColor = (category: string): string => {
  const colorMap: {[key: string]: string} = {
    'location': 'primary',
    'property': 'success',
    'ownerdetails': 'danger',
    'value&equity': 'warning',
    'propertytax': 'info',
    'listing': 'secondary',
    'loans&liens': 'dark',
    'foreclosure': 'danger',
    'transfer': 'primary'
  };
  
  return colorMap[category] || 'info';
};

function ApiParamsForm({ apiParams, setApiParams }: LocalApiParamsFormProps) {
  // Local state for managing criteria
  const [activeTab, setActiveTab] = useState<string>('location');
  const [criteriaDefs, setCriteriaDefs] = useState<AllCriteriaDefinitions>(criteriaDefinitions);
  const [selectedCriterion, setSelectedCriterion] = useState<CriterionDefinition | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // Start with false since we initialize with data
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [dateSelectionType, setDateSelectionType] = useState<'preset' | 'range'>('range');
  
  // Log criteria definitions for debugging on mount
  useEffect(() => {
    console.log('Available criteria categories:', Object.keys(criteriaDefinitions));
    Object.keys(criteriaDefinitions).forEach(category => {
      console.log(`Category ${category} has ${criteriaDefinitions[category].length} criteria`);
    });
  }, []);
  
  // Select first criterion in active category by default when tab changes
  useEffect(() => {
    if (criteriaDefs[activeTab]?.length > 0) {
      // Find if there's any criterion from this category that's already selected in criteria
      const selectedCriterionInCategory = criteriaDefs[activeTab].find(
        criterion => (apiParams.criteria as any)?.[criterion.name] !== undefined
      );
      
      if (selectedCriterionInCategory) {
        // If there's a criterion from this category already in use, select it
        setSelectedCriterion(selectedCriterionInCategory);
      } else if (!selectedCriterion || !criteriaDefs[activeTab].some(c => c.name === selectedCriterion.name)) {
        // If no criterion is selected or the selected one is not from this category, select the first one
        setSelectedCriterion(criteriaDefs[activeTab][0]);
      }
    }
  }, [activeTab, criteriaDefs, apiParams.criteria, selectedCriterion]);
  
  const handleParamChange = (field: string, value: string | number): void => {
    // Parse numeric values
    if (['limit', 'start', 'purchase'].includes(field)) {
      value = Number(value);
    }
    
    setApiParams({
      ...apiParams,
      [field]: value
    });
  };

  const handleCriteriaChange = (criteriaName: string, value: any): void => {
    const newCriteria = { ...(apiParams.criteria || {}) };
    
    // Use index signature to allow any property name
    (newCriteria as any)[criteriaName] = value;
    
    setApiParams({
      ...apiParams,
      criteria: newCriteria
    });
  };

  const handleCriterionSelect = (criterion: CriterionDefinition) => {
    setSelectedCriterion(criterion);
  };

  // Plain function for criteria selector - simpler and more reliable
  const renderCriteriaSelector = (category: string) => {
    if (loading) {
      return <div>Loading criteria definitions...</div>;
    }
    
    const categoryDefs: CriterionDefinition[] = criteriaDefs[category] || [];
    console.log(`Rendering selector for ${category}. Found ${categoryDefs.length} criteria.`);
    console.log(`Current selected criterion: ${selectedCriterion?.name || 'none'}`);
    
    return (
      <Row>
        <Col md={4}>
          <div className="mb-2">
            <small className="text-muted">Select a criterion to configure:</small>
          </div>
          <ListGroup className="mb-3">
            {categoryDefs.map((criterion) => {
              const isSelected = (apiParams.criteria as any)?.[criterion.name] !== undefined;
              return (
                <ListGroup.Item
                  key={criterion.name}
                  action
                  active={selectedCriterion?.name === criterion.name}
                  onClick={() => handleCriterionSelect(criterion)}
                  className="d-flex justify-content-between align-items-center"
                  style={{
                    borderLeft: isSelected ? '4px solid var(--bs-success)' : undefined,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    <div>{criterion.name}</div>
                    <small className="text-muted">{criterion.description.substring(0, 40)}{criterion.description.length > 40 ? '...' : ''}</small>
                  </div>
                  {isSelected && (
                    <Badge bg="success" pill>✓</Badge>
                  )}
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </Col>
        <Col md={8}>
          {selectedCriterion && (
            <div className="p-4 border rounded shadow-sm">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h5 className="mb-1">{selectedCriterion.name}</h5>
                  <p className="text-muted mb-0">{selectedCriterion.description}</p>
                </div>
                {(apiParams.criteria as any)?.[selectedCriterion.name] !== undefined && (
                  <Badge bg="success" className="p-2">Currently Selected</Badge>
                )}
              </div>
              
              <div className="mb-3">
                <Badge bg="light" text="dark" className="border">
                  Type: {selectedCriterion.criteriaType}
                </Badge>
              </div>
              
              <div className="mt-4">
                <label className="form-label">Configure this criterion:</label>
                {renderCriteriaInput(selectedCriterion)}
              </div>
              
              {(apiParams.criteria as any)?.[selectedCriterion.name] !== undefined && (
                <div className="mt-3 text-end">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleCriteriaChange(selectedCriterion.name, undefined)}
                  >
                    Remove This Criterion
                  </Button>
                </div>
              )}
            </div>
          )}
        </Col>
      </Row>
    );
  };

  const renderCriteriaInput = (definition: CriterionDefinition) => {
    const value = (apiParams.criteria as any)?.[definition.name];
    
    switch (definition.criteriaType) {
      case 'Boolean':
        return (
          <Form.Group className="mb-3">
            <Form.Select
              value={value === undefined ? '' : value ? '1' : '0'}
              onChange={(e) => handleCriteriaChange(definition.name, 
                e.target.value === '' ? undefined : e.target.value === '1')}
            >
              <option value="">Any</option>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </Form.Select>
          </Form.Group>
        );
        
      case 'Multiple Values':
      case 'Multiple Values Beginning With':
        // Special case for State selection
        if (definition.name === 'State') {
          return (
            <Form.Group className="mb-3">
              <Form.Label>Select States</Form.Label>
              <div className="d-flex flex-wrap mt-2 border p-2 rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {US_STATES.map(state => (
                  <Form.Check
                    key={state}
                    type="checkbox"
                    id={`state-${definition.name}-${state}`}
                    label={state}
                    className="me-3 mb-2"
                    style={{ minWidth: '60px' }}
                    checked={Array.isArray(value) && value.includes(state)}
                    onChange={(e) => {
                      const currentStates = Array.isArray(value) ? [...value] : [];
                      
                      if (e.target.checked) {
                        if (!currentStates.includes(state)) {
                          currentStates.push(state);
                        }
                      } else {
                        const index = currentStates.indexOf(state);
                        if (index !== -1) {
                          currentStates.splice(index, 1);
                        }
                      }
                      
                      handleCriteriaChange(definition.name, currentStates.length > 0 ? currentStates : undefined);
                    }}
                  />
                ))}
              </div>
              <Form.Text className="text-muted mt-2">
                Select one or more states
              </Form.Text>
            </Form.Group>
          );
        }
        
        // For other Multiple Values, we'll use a text input that accepts comma-separated values
        return (
          <Form.Group className="mb-3">
            <Form.Control
              type="text"
              placeholder="Enter comma-separated values"
              value={Array.isArray(value) ? value.join(', ') : ''}
              onChange={(e) => {
                const textValue = e.target.value;
                // Split by comma and trim whitespace
                const arrayValue = textValue
                  ? textValue.split(',').map(item => item.trim())
                  : [];
                handleCriteriaChange(definition.name, arrayValue.length > 0 ? arrayValue : undefined);
              }}
            />
            <Form.Text className="text-muted">
              Example: {Array.isArray(definition.example?.value) ? definition.example.value.join(', ') : 'value1, value2'}
            </Form.Text>
          </Form.Group>
        );
      case 'Multiple Range':
      case 'Multiple Range Including Unknowns':
        // Special case for date fields
        if (definition.name.includes('Date')) {
          // For date fields, we'll use date inputs instead of number inputs
          return (
            <Form.Group className="mb-3">
              <div className="mb-3">
                <Form.Label>Date Selection Type:</Form.Label>
                <Form.Select
                  value={dateSelectionType || 'range'}
                  onChange={(e) => setDateSelectionType(e.target.value as 'preset' | 'range')}
                >
                  <option value="preset">Preset Date Range</option>
                  <option value="range">Custom Date Range</option>
                </Form.Select>
              </div>
              
              {(dateSelectionType || 'range') === 'preset' ? (
                <div className="mb-3">
                  <Form.Label>Select a preset:</Form.Label>
                  <Form.Select
                    value={Array.isArray(value) && typeof value[0] === 'string' ? value[0] : ''}
                    onChange={(e) => {
                      const preset = e.target.value;
                      handleCriteriaChange(definition.name, preset ? [preset] : undefined);
                    }}
                  >
                    <option value="">Select a preset</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                    <option value="Last 90 Days">Last 90 Days</option>
                    <option value="Last 6 Months">Last 6 Months</option>
                    <option value="Last 12 Months">Last 12 Months</option>
                    <option value="This Month">This Month</option>
                    <option value="This Quarter">This Quarter</option>
                    <option value="This Year">This Year</option>
                    <option value="Next 7 Days">Next 7 Days</option>
                    <option value="Next 30 Days">Next 30 Days</option>
                    <option value="Next Quarter">Next Quarter</option>
                  </Form.Select>
                </div>
              ) : (
                <Row className="align-items-center">
                  <Col>
                    <Form.Label>From:</Form.Label>
                    <Form.Control
                      type="date"
                      placeholder="From Date"
                      value={Array.isArray(value) && value[0] !== null ? String(value[0]) : ''}
                      onChange={(e) => {
                        const fromDate = e.target.value;
                        const currentValue = Array.isArray(value) ? [...value] : [null, null];
                        currentValue[0] = fromDate || null;
                        handleCriteriaChange(definition.name, currentValue[0] !== null || currentValue[1] !== null ? currentValue : undefined);
                      }}
                    />
                  </Col>
                  <Col xs="auto" className="mt-4">to</Col>
                  <Col>
                    <Form.Label>To:</Form.Label>
                    <Form.Control
                      type="date"
                      placeholder="To Date"
                      value={Array.isArray(value) && value[1] !== null ? String(value[1]) : ''}
                      onChange={(e) => {
                        const toDate = e.target.value;
                        const currentValue = Array.isArray(value) ? [...value] : [null, null];
                        currentValue[1] = toDate || null;
                        handleCriteriaChange(definition.name, currentValue[0] !== null || currentValue[1] !== null ? currentValue : undefined);
                      }}
                    />
                  </Col>
                </Row>
              )}
            </Form.Group>
          );
        } else {
          // For non-date fields, use the original number inputs
          return (
            <Form.Group className="mb-3">
              <Row className="align-items-center">
                <Col>
                  <Form.Control
                    type="number"
                    placeholder="Min"
                    value={Array.isArray(value) && value[0] !== null ? value[0] : ''}
                    onChange={(e) => {
                      const min = e.target.value === '' ? null : Number(e.target.value);
                      const currentValue = Array.isArray(value) ? [...value] : [null, null];
                      currentValue[0] = min;
                      handleCriteriaChange(definition.name, currentValue[0] !== null || currentValue[1] !== null ? currentValue : undefined);
                    }}
                  />
                </Col>
                <Col xs="auto">to</Col>
                <Col>
                  <Form.Control
                    type="number"
                    placeholder="Max"
                    value={Array.isArray(value) && value[1] !== null ? value[1] : ''}
                    onChange={(e) => {
                      const max = e.target.value === '' ? null : Number(e.target.value);
                      const currentValue = Array.isArray(value) ? [...value] : [null, null];
                      currentValue[1] = max;
                      handleCriteriaChange(definition.name, currentValue[0] !== null || currentValue[1] !== null ? currentValue : undefined);
                    }}
                  />
                </Col>
              </Row>
            </Form.Group>
          );
        }
        
      case 'Single Value':
        return (
          <Form.Group className="mb-3">
            <Form.Control
              type="text"
              placeholder="Enter value"
              value={value || ''}
              onChange={(e) => handleCriteriaChange(definition.name, e.target.value || undefined)}
            />
          </Form.Group>
        );
          
      case 'PropertyType':
        return (
          <Form.Group className="mb-3">
            <Form.Label>Property Types</Form.Label>
            <div className="d-flex flex-wrap mt-2">
              {PROPERTY_TYPES.map(type => (
                <Form.Check
                  key={type.value}
                  type="checkbox"
                  id={`property-type-${definition.name}-${type.value}-${Date.now()}`}
                  label={type.label}
                  className="me-3 mb-2"
                  checked={Array.isArray(value) && value.includes(type.value)}
                  onChange={(e) => {
                    // Handle PropertyType selection similar to propertyTypes
                    const currentTypes = Array.isArray(value) ? [...value] : [];
                    
                    if (e.target.checked) {
                      if (!currentTypes.includes(type.value)) {
                        currentTypes.push(type.value);
                      }
                    } else {
                      const index = currentTypes.indexOf(type.value);
                      if (index !== -1) {
                        currentTypes.splice(index, 1);
                      }
                    }
                    
                    handleCriteriaChange(definition.name, currentTypes.length > 0 ? currentTypes : undefined);
                  }}
                />
              ))}
            </div>
          </Form.Group>
        );
          
      default:
        return (
          <div className="text-muted">
            This criteria type ({definition.criteriaType}) is not yet supported in the UI.
          </div>
        );
    }
  };

// Helper function to provide a human-readable explanation of what a criterion does
const getCriterionExplanation = (name: string, value: any): string => {
  if (value === undefined || value === null) {
    return '';
  }
  
  // Handle specific criteria types with custom explanations
  switch (name) {
    case 'State':
      return `Properties located in ${Array.isArray(value) ? value.join(', ') : value}`;
      
    case 'PropertyType':
      const typeLabels = value.map((v: string) =>
        PROPERTY_TYPES.find(t => t.value === v)?.label || v
      );
      return `Property types: ${typeLabels.join(', ')}`;
      
    case 'Beds':
      if (Array.isArray(value) && value.length === 2) {
        const min = value[0] === null ? 'any' : value[0];
        const max = value[1] === null ? 'any' : value[1];
        return `Properties with ${min} to ${max} bedrooms`;
      }
      return '';
      
    case 'Baths':
      if (Array.isArray(value) && value.length === 2) {
        const min = value[0] === null ? 'any' : value[0];
        const max = value[1] === null ? 'any' : value[1];
        return `Properties with ${min} to ${max} bathrooms`;
      }
      return '';
      
    case 'SquareFeet':
      if (Array.isArray(value) && value.length === 2) {
        const min = value[0] === null ? 'any' : value[0];
        const max = value[1] === null ? 'any' : value[1];
        return `Properties between ${min} and ${max} square feet`;
      }
      return '';
      
    case 'AVM':
      if (Array.isArray(value) && value.length === 2) {
        const min = value[0] === null ? 'any' : `$${value[0]}`;
        const max = value[1] === null ? 'any' : `$${value[1]}`;
        return `Properties valued between ${min} and ${max}`;
      }
      return '';
      
    case 'isSameMailingOrExempt':
      return value ? 'Owner lives in the property' : 'Owner does not live in the property';
      
    case 'isListedForSale':
      return value ? 'Properties currently listed for sale' : 'Properties not listed for sale';
      
    case 'inForeclosure':
      return value ? 'Properties in foreclosure' : 'Properties not in foreclosure';
      
    default:
      return '';
  }
};

  // Format criteria value for display
  const formatCriteriaValue = (name: string, value: any): string => {
    if (value === undefined || value === null) {
      return '';
    }
    
    // Handle arrays of values
    if (Array.isArray(value)) {
      // Check if it's a range array with two elements
      if (value.length === 2) {
        const min = value[0] === null ? '0' : value[0];
        const max = value[1] === null ? '∞' : value[1];
        
        // Customize display based on criteria name
        if (name.includes('Rate') || name.includes('Percent')) {
          return `${min}% to ${max}%`;
        } else if (name.includes('Balance') || name.includes('Amount') || name.includes('Value')) {
          return `$${min} to $${max}`;
        } else {
          return `${min} to ${max}`;
        }
      }
      // Regular array of values
      return value.join(', ');
    }
    
    // Handle boolean values
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    // Default - just convert to string
    return String(value);
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title className="mb-0">API Parameters</Card.Title>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={(e) => e.preventDefault()}>
          {/* Basic Request Parameters */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Limit (number of properties)</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max="50000"
                  value={apiParams.limit}
                  onChange={(e) => handleParamChange('limit', e.target.value)}
                />
                <Form.Text className="text-muted">
                  You can request up to 50,000 properties. Large requests (over 1000) will be processed in the background.
                </Form.Text>
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Start Index</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={apiParams.start}
                  onChange={(e) => handleParamChange('start', e.target.value)}
                />
                <Form.Text className="text-muted">
                  Starting position in results
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
          
          <Form.Group className="mb-3">
            <Form.Label>Purchase</Form.Label>
            <Form.Select
              value={apiParams.purchase}
              onChange={(e) => handleParamChange('purchase', e.target.value)}
            >
              <option value="0">0 - Preview (No Charge)</option>
              <option value="1">1 - Purchase Records</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Set to 0 for free preview or 1 to purchase records
            </Form.Text>
          </Form.Group>
          
          <hr />
          
          {/* Search Criteria */}
          <h5 className="mb-3">Search Criteria</h5>
          
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k || 'location')}
            className="mb-3"
            variant="pills"
          >
            {CRITERIA_CATEGORIES.map((category) => (
              <Tab
                key={category.key}
                eventKey={category.key}
                title={
                  <span>
                    {category.label}
                    {Object.entries(apiParams.criteria).some(([criteriaName, value]) =>
                      value !== undefined && criteriaDefs[category.key]?.some(def => def.name === criteriaName)
                    ) && (
                      <Badge bg="success" className="ms-2" pill>
                        <small>✓</small>
                      </Badge>
                    )}
                  </span>
                }
                className="pt-3"
              >
                {renderCriteriaSelector(category.key)}
              </Tab>
            ))}
          </Tabs>
          
          {/* Display active criteria as badges */}
          {apiParams.criteria && Object.keys(apiParams.criteria).length > 0 && (
            <div className="mb-3">
              <Form.Label>Active Criteria:</Form.Label>
              <div className="d-flex flex-wrap">
                {Object.entries(apiParams.criteria).map(([criteriaName, value]) => {
                  if (value === undefined) return null;
                  
                  // Find the category for coloring
                  let category = 'other';
                  for (const cat of CRITERIA_CATEGORIES) {
                    if (criteriaDefs[cat.key]?.some((def: CriterionDefinition) => def.name === criteriaName)) {
                      category = cat.key;
                      break;
                    }
                  }
                  
                  // Find the criterion definition
                  const definition = criteriaDefs[category]?.find((def: CriterionDefinition) => def.name === criteriaName);
                  
                  return (
                    <span
                      key={criteriaName}
                      className={`badge bg-${getCategoryColor(category)} me-2 mb-2`}
                      style={{cursor: 'pointer'}}
                      onClick={() => {
                        // Switch to the tab containing this criterion and select it
                        setActiveTab(category);
                        if (definition) {
                          setSelectedCriterion(definition);
                        }
                      }}
                    >
                      {criteriaName}: {formatCriteriaValue(criteriaName, value)}
                      <button
                        type="button"
                        className="btn-close btn-close-white ms-2"
                        style={{fontSize: '0.5rem'}}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCriteriaChange(criteriaName, undefined);
                        }}
                        aria-label="Remove"
                      />
                    </span>
                  );
                })}
              </div>
              
              {/* User-Friendly Request Preview */}
              <div className="mt-4 border p-3 rounded bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">Search Request Summary:</h6>
                  <Badge bg="secondary">{Object.keys(apiParams.criteria).length} criteria</Badge>
                </div>
                
                <div className="mb-3">
                  <strong>Basic Settings:</strong>
                  <ul className="mt-2 mb-0">
                    <li>Number of properties to retrieve: <strong>{apiParams.limit}</strong></li>
                    <li>Starting position: <strong>{apiParams.start}</strong></li>
                    <li>Mode: <strong>{apiParams.purchase === 0 ? 'Preview (No Charge)' : 'Purchase Records'}</strong></li>
                  </ul>
                </div>
                
                {Object.keys(apiParams.criteria).length > 0 && (
                  <div>
                    <strong>Selected Search Criteria:</strong>
                    <ul className="mt-2 mb-0">
                      {Object.entries(apiParams.criteria).map(([criteriaName, value]) => {
                        if (value === undefined) return null;
                        
                        // Get a human-readable explanation if available
                        const explanation = getCriterionExplanation(criteriaName, value);
                        
                        return (
                          <li key={criteriaName}>
                            <strong>{criteriaName}:</strong> {formatCriteriaValue(criteriaName, value)}
                            {explanation && (
                              <div><small className="text-muted">{explanation}</small></div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Submit Button */}
              <div className="d-grid gap-2 mt-4">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={Object.keys(apiParams.criteria).length === 0}
                  onClick={() => {
                    // Here you would handle submitting the query
                    alert('Query will be submitted with the following criteria:\n\n' +
                      JSON.stringify(apiParams.criteria, null, 2));
                  }}
                >
                  Submit Query ({Object.keys(apiParams.criteria).length} criteria)
                </Button>
                <div className="text-center text-muted mt-2">
                  <small>Click submit when you've finished building your search criteria</small>
                </div>
              </div>
            </div>
          )}
        </Form>
      </Card.Body>
    </Card>
  );
}

export default ApiParamsForm;