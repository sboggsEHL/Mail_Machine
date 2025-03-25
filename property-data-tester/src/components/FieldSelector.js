import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Badge } from 'react-bootstrap';

const AVAILABLE_FIELDS = {
  // Basic Info
  'Basic Info': [
    'RadarID', 'PType', 'Address', 'City', 'State', 'ZipFive', 'County', 'APN'
  ],
  // Owner Info
  'Owner Info': [
    'Owner', 'OwnerFirstName', 'OwnerLastName', 'OwnerSpouseFirstName', 'OwnershipType',
    'isSameMailingOrExempt', 'isMailVacant', 'PhoneAvailability', 'EmailAvailability'
  ],
  // Value and Equity
  'Value and Equity': [
    'AVM', 'AvailableEquity', 'EquityPercent', 'CLTV', 'TotalLoanBalance', 'NumberLoans'
  ],
  // Loan Info
  'Loan Info': [
    'FirstDate', 'FirstAmount', 'FirstRate', 'FirstRateType', 'FirstTermInYears',
    'FirstLoanType', 'FirstPurpose', 'SecondDate', 'SecondAmount', 'SecondLoanType'
  ],
  // Tax Info
  'Tax Info': [
    'AnnualTaxes', 'EstimatedTaxRate'
  ],
  // Transaction History
  'Transaction History': [
    'LastTransferRecDate', 'LastTransferValue', 'LastTransferDownPaymentPercent', 'LastTransferSeller'
  ],
  // Property Status
  'Property Status': [
    'isListedForSale', 'ListingPrice', 'DaysOnMarket', 'inForeclosure', 'ForeclosureStage',
    'DefaultAmount', 'inTaxDelinquency', 'DelinquentAmount', 'DelinquentYear'
  ]
};

function FieldSelector({ selectedFields, setSelectedFields }) {
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (category) => {
    setExpandedCategories({
      ...expandedCategories,
      [category]: !expandedCategories[category]
    });
  };

  const toggleField = (field) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const selectAllFields = () => {
    const allFields = Object.values(AVAILABLE_FIELDS).flat();
    setSelectedFields(allFields);
  };

  const clearAllFields = () => {
    setSelectedFields([]);
  };

  const selectCategory = (category) => {
    const categoryFields = AVAILABLE_FIELDS[category];
    const newFields = [...selectedFields];
    
    categoryFields.forEach(field => {
      if (!newFields.includes(field)) {
        newFields.push(field);
      }
    });
    
    setSelectedFields(newFields);
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title className="mb-0">Select API Fields</Card.Title>
      </Card.Header>
      <Card.Body>
        <div className="d-flex justify-content-between mb-3">
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={selectAllFields}
          >
            Select All
          </Button>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={clearAllFields}
          >
            Clear All
          </Button>
        </div>
        
        <div className="mb-3">
          {selectedFields.length > 0 && (
            <p>Selected Fields: 
              <Badge bg="primary" className="ms-2">
                {selectedFields.length}
              </Badge>
            </p>
          )}
        </div>
        
        {Object.entries(AVAILABLE_FIELDS).map(([category, fields]) => (
          <div key={category} className="mb-3">
            <div 
              className="d-flex justify-content-between align-items-center p-2 bg-light rounded"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleCategory(category)}
            >
              <h6 className="mb-0">{category}</h6>
              <div>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="me-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectCategory(category);
                  }}
                >
                  Select All
                </Button>
                <span>{expandedCategories[category] ? '▼' : '►'}</span>
              </div>
            </div>
            
            {expandedCategories[category] && (
              <Row className="mt-2">
                {fields.map(field => (
                  <Col key={field} xs={6} md={4} className="mb-2">
                    <Form.Check
                      type="checkbox"
                      id={`field-${field}`}
                      label={field}
                      checked={selectedFields.includes(field)}
                      onChange={() => toggleField(field)}
                    />
                  </Col>
                ))}
              </Row>
            )}
          </div>
        ))}
      </Card.Body>
    </Card>
  );
}

export default FieldSelector;
