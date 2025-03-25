import React, { useState } from 'react';
import { Card, Form, Row, Col, Button, Badge, Accordion } from 'react-bootstrap';

// US States for dropdown
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Property Types
const PROPERTY_TYPES = [
  { value: 'SFR', label: 'Single Family Residence' },
  { value: 'CND', label: 'Condo' },
  { value: 'MFR', label: 'Multi-Family Residence' },
  { value: 'MH', label: 'Mobile Home' },
  { value: 'LND', label: 'Land' }
];

// Loan Types
const LOAN_TYPES = [
  { value: 'C', label: 'Conventional' },
  { value: 'F', label: 'FHA' },
  { value: 'V', label: 'VA' },
  { value: 'P', label: 'Private' }
];

function ApiParamsForm({ apiParams, setApiParams }) {
  // Local state for managing criteria
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const handleParamChange = (field, value) => {
    // Parse numeric values
    if (['limit', 'start', 'purchase'].includes(field)) {
      value = Number(value);
    }
    
    setApiParams({
      ...apiParams,
      [field]: value
    });
  };

  const handleCriteriaChange = (criteriaName, value) => {
    const newCriteria = { ...apiParams.criteria } || {};
    newCriteria[criteriaName] = value;
    
    setApiParams({
      ...apiParams,
      criteria: newCriteria
    });
  };

  const handleRangeChange = (criteriaName, index, value) => {
    const currentRange = [...(apiParams.criteria[criteriaName] || [null, null])];
    currentRange[index] = value === '' ? null : Number(value);
    
    handleCriteriaChange(criteriaName, currentRange);
  };

  const handlePropertyTypeChange = (type, checked) => {
    const currentTypes = [...(apiParams.criteria.propertyTypes || [])];
    
    if (checked) {
      if (!currentTypes.includes(type)) {
        currentTypes.push(type);
      }
    } else {
      const index = currentTypes.indexOf(type);
      if (index !== -1) {
        currentTypes.splice(index, 1);
      }
    }
    
    handleCriteriaChange('propertyTypes', currentTypes);
  };

  const handleLoanTypeChange = (type, checked) => {
    const currentTypes = [...(apiParams.criteria.loanTypes || [])];
    
    if (checked) {
      if (!currentTypes.includes(type)) {
        currentTypes.push(type);
      }
    } else {
      const index = currentTypes.indexOf(type);
      if (index !== -1) {
        currentTypes.splice(index, 1);
      }
    }
    
    handleCriteriaChange('loanTypes', currentTypes);
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title className="mb-0">API Parameters</Card.Title>
      </Card.Header>
      <Card.Body>
        <Form>
          {/* Basic Request Parameters */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Limit (number of properties)</Form.Label>
                <Form.Control 
                  type="number" 
                  min="1" 
                  max="1000"
                  value={apiParams.limit} 
                  onChange={(e) => handleParamChange('limit', e.target.value)}
                />
                <Form.Text className="text-muted">
                  Max: 1000 properties per request
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
          
          {/* Basic Search Criteria */}
          <h5 className="mb-3">Search Criteria</h5>
          
          <Form.Group className="mb-3">
            <Form.Label>State</Form.Label>
            <Form.Select
              value={apiParams.criteria?.state || ''}
              onChange={(e) => handleCriteriaChange('state', e.target.value)}
            >
              <option value="">Select a state</option>
              {US_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </Form.Select>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Property Types</Form.Label>
            <div className="d-flex flex-wrap mt-2">
              {PROPERTY_TYPES.map(type => (
                <Form.Check
                  key={type.value}
                  type="checkbox"
                  id={`property-type-${type.value}`}
                  label={type.label}
                  className="me-3 mb-2"
                  checked={apiParams.criteria?.propertyTypes?.includes(type.value) || false}
                  onChange={(e) => handlePropertyTypeChange(type.value, e.target.checked)}
                />
              ))}
            </div>
          </Form.Group>
          
          <Accordion className="mb-3">
            <Accordion.Item eventKey="0">
              <Accordion.Header onClick={() => setShowAdvanced(!showAdvanced)}>
                Advanced Criteria
              </Accordion.Header>
              <Accordion.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Owner Mailing Status</Form.Label>
                      <Form.Select
                        value={apiParams.criteria?.isSameMailingOrExempt === undefined 
                          ? '' 
                          : apiParams.criteria.isSameMailingOrExempt ? '1' : '0'}
                        onChange={(e) => handleCriteriaChange('isSameMailingOrExempt', 
                          e.target.value === '' ? undefined : e.target.value === '1')}
                      >
                        <option value="">Any</option>
                        <option value="1">Same as property address</option>
                        <option value="0">Different from property address</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mail Vacant Status</Form.Label>
                      <Form.Select
                        value={apiParams.criteria?.isMailVacant === undefined 
                          ? '' 
                          : apiParams.criteria.isMailVacant ? '1' : '0'}
                        onChange={(e) => handleCriteriaChange('isMailVacant', 
                          e.target.value === '' ? undefined : e.target.value === '1')}
                      >
                        <option value="">Any</option>
                        <option value="0">Not Vacant</option>
                        <option value="1">Vacant</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>Equity Percentage Range</Form.Label>
                  <Row className="align-items-center">
                    <Col>
                      <Form.Control
                        type="number"
                        placeholder="Min %"
                        value={apiParams.criteria?.equityPercent?.[0] === null ? '' : apiParams.criteria?.equityPercent?.[0] || ''}
                        onChange={(e) => handleRangeChange('equityPercent', 0, e.target.value)}
                      />
                    </Col>
                    <Col xs="auto">to</Col>
                    <Col>
                      <Form.Control
                        type="number"
                        placeholder="Max %"
                        value={apiParams.criteria?.equityPercent?.[1] === null ? '' : apiParams.criteria?.equityPercent?.[1] || ''}
                        onChange={(e) => handleRangeChange('equityPercent', 1, e.target.value)}
                      />
                    </Col>
                  </Row>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Loan Balance Range</Form.Label>
                  <Row className="align-items-center">
                    <Col>
                      <Form.Control
                        type="number"
                        placeholder="Min $"
                        value={apiParams.criteria?.totalLoanBalance?.[0] === null ? '' : apiParams.criteria?.totalLoanBalance?.[0] || ''}
                        onChange={(e) => handleRangeChange('totalLoanBalance', 0, e.target.value)}
                      />
                    </Col>
                    <Col xs="auto">to</Col>
                    <Col>
                      <Form.Control
                        type="number"
                        placeholder="Max $"
                        value={apiParams.criteria?.totalLoanBalance?.[1] === null ? '' : apiParams.criteria?.totalLoanBalance?.[1] || ''}
                        onChange={(e) => handleRangeChange('totalLoanBalance', 1, e.target.value)}
                      />
                    </Col>
                  </Row>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Interest Rate Range</Form.Label>
                  <Row className="align-items-center">
                    <Col>
                      <Form.Control
                        type="number"
                        step="0.125"
                        placeholder="Min %"
                        value={apiParams.criteria?.firstRate?.[0] === null ? '' : apiParams.criteria?.firstRate?.[0] || ''}
                        onChange={(e) => handleRangeChange('firstRate', 0, e.target.value)}
                      />
                    </Col>
                    <Col xs="auto">to</Col>
                    <Col>
                      <Form.Control
                        type="number"
                        step="0.125"
                        placeholder="Max %"
                        value={apiParams.criteria?.firstRate?.[1] === null ? '' : apiParams.criteria?.firstRate?.[1] || ''}
                        onChange={(e) => handleRangeChange('firstRate', 1, e.target.value)}
                      />
                    </Col>
                  </Row>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Loan Types</Form.Label>
                  <div className="d-flex flex-wrap mt-2">
                    {LOAN_TYPES.map(type => (
                      <Form.Check
                        key={type.value}
                        type="checkbox"
                        id={`loan-type-${type.value}`}
                        label={type.label}
                        className="me-3 mb-2"
                        checked={apiParams.criteria?.loanTypes?.includes(type.value) || false}
                        onChange={(e) => handleLoanTypeChange(type.value, e.target.checked)}
                      />
                    ))}
                  </div>
                </Form.Group>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Foreclosure Status</Form.Label>
                      <Form.Select
                        value={apiParams.criteria?.inForeclosure === undefined 
                          ? '' 
                          : apiParams.criteria.inForeclosure ? '1' : '0'}
                        onChange={(e) => handleCriteriaChange('inForeclosure', 
                          e.target.value === '' ? undefined : e.target.value === '1')}
                      >
                        <option value="">Any</option>
                        <option value="0">Not in Foreclosure</option>
                        <option value="1">In Foreclosure</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Listing Status</Form.Label>
                      <Form.Select
                        value={apiParams.criteria?.isListedForSale === undefined 
                          ? '' 
                          : apiParams.criteria.isListedForSale ? '1' : '0'}
                        onChange={(e) => handleCriteriaChange('isListedForSale', 
                          e.target.value === '' ? undefined : e.target.value === '1')}
                      >
                        <option value="">Any</option>
                        <option value="0">Not Listed</option>
                        <option value="1">Listed for Sale</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
          
          {/* Display active criteria as badges */}
          {Object.keys(apiParams.criteria || {}).length > 0 && (
            <div className="mb-3">
              <Form.Label>Active Criteria:</Form.Label>
              <div className="d-flex flex-wrap">
                {apiParams.criteria?.state && (
                  <Badge bg="info" className="me-2 mb-2">State: {apiParams.criteria.state}</Badge>
                )}
                
                {apiParams.criteria?.propertyTypes?.length > 0 && (
                  <Badge bg="info" className="me-2 mb-2">
                    Property Types: {apiParams.criteria.propertyTypes.join(', ')}
                  </Badge>
                )}
                
                {apiParams.criteria?.loanTypes?.length > 0 && (
                  <Badge bg="info" className="me-2 mb-2">
                    Loan Types: {apiParams.criteria.loanTypes.join(', ')}
                  </Badge>
                )}
                
                {apiParams.criteria?.isSameMailingOrExempt !== undefined && (
                  <Badge bg="info" className="me-2 mb-2">
                    Mailing: {apiParams.criteria.isSameMailingOrExempt ? 'Same' : 'Different'}
                  </Badge>
                )}
                
                {apiParams.criteria?.isMailVacant !== undefined && (
                  <Badge bg="info" className="me-2 mb-2">
                    Mail: {apiParams.criteria.isMailVacant ? 'Vacant' : 'Not Vacant'}
                  </Badge>
                )}
                
                {apiParams.criteria?.inForeclosure !== undefined && (
                  <Badge bg="info" className="me-2 mb-2">
                    {apiParams.criteria.inForeclosure ? 'In Foreclosure' : 'Not in Foreclosure'}
                  </Badge>
                )}
                
                {apiParams.criteria?.isListedForSale !== undefined && (
                  <Badge bg="info" className="me-2 mb-2">
                    {apiParams.criteria.isListedForSale ? 'Listed' : 'Not Listed'}
                  </Badge>
                )}
                
                {apiParams.criteria?.equityPercent && (
                  <Badge bg="info" className="me-2 mb-2">
                    Equity: {apiParams.criteria.equityPercent[0] || '0'}% to {apiParams.criteria.equityPercent[1] || '100'}%
                  </Badge>
                )}
                
                {apiParams.criteria?.totalLoanBalance && (
                  <Badge bg="info" className="me-2 mb-2">
                    Loan Balance: ${apiParams.criteria.totalLoanBalance[0] || '0'} to ${apiParams.criteria.totalLoanBalance[1] || '∞'}
                  </Badge>
                )}
                
                {apiParams.criteria?.firstRate && (
                  <Badge bg="info" className="me-2 mb-2">
                    Rate: {apiParams.criteria.firstRate[0] || '0'}% to {apiParams.criteria.firstRate[1] || '10'}%
                  </Badge>
                )}
              </div>
            </div>
          )}
        </Form>
      </Card.Body>
    </Card>
  );
}

export default ApiParamsForm;
