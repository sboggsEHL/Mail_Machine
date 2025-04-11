import React, { useState, useMemo } from 'react';
import { Card, Form, Button, Row, Col, Badge, Alert } from 'react-bootstrap';
import { FieldSelectorProps } from '../types/components';
import { useProvider } from '../context/ProviderContext';
import { PROVIDER_MODULES, ProviderId, FieldDefinition } from '../providers'; // Import necessary items

// Type for categorized fields used internally for rendering
type CategorizedFields = Record<string, FieldDefinition[]>;

function FieldSelector({ selectedFields, onFieldSelectionChange }: FieldSelectorProps) {
  const { selectedProvider } = useProvider();
  const providerModule = PROVIDER_MODULES[selectedProvider as ProviderId];
  const availableFields: FieldDefinition[] = useMemo(() => providerModule?.fields || [], [providerModule]);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Group fields by category for rendering
  const categorizedFields: CategorizedFields = useMemo(() => {
    return availableFields.reduce((acc, field) => {
      const category = field.category || 'Uncategorized'; // Default category if none provided
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(field);
      return acc;
    }, {} as CategorizedFields);
  }, [availableFields]);

  const toggleCategory = (category: string): void => {
    setExpandedCategories({
      ...expandedCategories,
      [category]: !expandedCategories[category]
    });
  };

  const toggleField = (fieldId: string): void => {
    if (selectedFields.includes(fieldId)) {
      onFieldSelectionChange(selectedFields.filter(f => f !== fieldId));
    } else {
      onFieldSelectionChange([...selectedFields, fieldId]);
    }
  };

  const selectAllFields = (): void => {
    const allFieldIds = availableFields.map(field => field.id);
    onFieldSelectionChange(allFieldIds);
  };

  const clearAllFields = (): void => {
    onFieldSelectionChange([]);
  };

  const selectCategory = (category: string): void => {
    const categoryFields = categorizedFields[category] || [];
    const categoryFieldIds = categoryFields.map(field => field.id);
    const newFields = [...selectedFields];

    categoryFieldIds.forEach(fieldId => {
      if (!newFields.includes(fieldId)) {
        newFields.push(fieldId);
      }
    });

    onFieldSelectionChange(newFields);
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title className="mb-0">Select API Fields</Card.Title>
      </Card.Header>
      <Card.Body>
        {availableFields.length === 0 ? (
          <Alert variant="warning">No fields available for the selected provider ({selectedProvider}).</Alert>
        ) : (
          <>
            <div className="d-flex justify-content-between mb-3">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={selectAllFields}
              >
                Select All ({availableFields.length})
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
        
            <div className="mb-3">
              {selectedFields.length > 0 && (
                <p>Selected Fields:
                  <Badge bg="primary" className="ms-2">
                    {selectedFields.length}
                  </Badge>
                </p>
              )}
            </div>

            {Object.entries(categorizedFields).map(([category, fieldsInCategory]) => (
              <div key={category} className="mb-3">
                <div
                  className="d-flex justify-content-between align-items-center p-2 bg-light rounded"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleCategory(category)}
                >
                  <h6 className="mb-0">{category} ({fieldsInCategory.length})</h6>
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
                    {fieldsInCategory.map(field => (
                      <Col key={field.id} xs={6} md={4} className="mb-2">
                        <Form.Check
                          type="checkbox"
                          id={`field-${field.id}`}
                          label={field.name} // Use field.name for label
                          checked={selectedFields.includes(field.id)} // Check against field.id
                          onChange={() => toggleField(field.id)} // Toggle using field.id
                        />
                      </Col>
                    ))}
                  </Row>
                )}
              </div>
            ))}
          </>
        )}
      </Card.Body>
    </Card>
  );
}

export default FieldSelector;
