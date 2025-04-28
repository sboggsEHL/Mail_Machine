import React from 'react';
import { Col, Badge, Button } from 'react-bootstrap'; // Removed unused Form
import { CriteriaDefinition } from '../../providers'; // Corrected import path
// Removed unused PropertyRadarApiParams import

// Import Input Components
import BooleanInput from './inputs/BooleanInput';
import MultiValueInput from './inputs/MultiValueInput';
import StateSelectorInput from './inputs/StateSelectorInput';
import RangeInput from './inputs/RangeInput';
import DateRangeInput from './inputs/DateRangeInput';
import SingleValueInput from './inputs/SingleValueInput';
import PropertyTypeInput from './inputs/PropertyTypeInput';

interface CriteriaInputRendererProps {
  selectedCriterion: CriteriaDefinition | null; // Corrected typo
  // Value specific to the selected criterion
  criterionValue: any | undefined; 
  // Callback to update the value for a specific criterion name
  onCriteriaChange: (criterionName: string, value: any | undefined) => void; 
}

const CriteriaInputRenderer: React.FC<CriteriaInputRendererProps> = ({
  selectedCriterion,
  criterionValue,
  onCriteriaChange,
}) => {
  if (!selectedCriterion) {
    return (
      <Col md={8}>
        <div className="p-4 border rounded shadow-sm text-center text-muted">
          Select a criterion from the list to configure it.
        </div>
      </Col>
    );
  }

  const definition = selectedCriterion; // Alias for clarity
  const isCriterionActive = criterionValue !== undefined;

  // Specific onChange handler for child inputs
  const handleInputChange = (newValue: any | undefined) => {
    onCriteriaChange(definition.name, newValue);
  };

  const renderInput = () => {
    switch (definition.criteriaType) {
      case 'Boolean':
        return <BooleanInput value={criterionValue} onChange={handleInputChange} />;
        
      case 'Multiple Values':
      case 'Multiple Values Beginning With':
        // Special case for State selection
        if (definition.name === 'State') {
          return <StateSelectorInput value={criterionValue} onChange={handleInputChange} />;
        }
        // For other Multiple Values
        return <MultiValueInput value={criterionValue} definition={definition} onChange={handleInputChange} />;

      case 'Multiple Range':
      case 'Multiple Range Including Unknowns':
        // Special case for date fields
        if (definition.name.includes('Date')) {
          return <DateRangeInput value={criterionValue} onChange={handleInputChange} />;
        } else {
          // For non-date fields (numeric ranges)
          return <RangeInput value={criterionValue} onChange={handleInputChange} />;
        }
        
      case 'Single Value':
        return <SingleValueInput value={criterionValue} onChange={handleInputChange} />;
          
      case 'PropertyType':
        return <PropertyTypeInput value={criterionValue} onChange={handleInputChange} />;
          
      default:
        return (
          <div className="text-muted">
            This criteria type ({definition.criteriaType}) is not yet supported in the UI.
          </div>
        );
    }
  };

  return (
    <Col md={8}>
      <div className="p-4 border rounded shadow-sm">
        {/* Criterion Header */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="mb-1">{definition.name}</h5>
            <p className="text-muted mb-0">{definition.description}</p>
          </div>
          {isCriterionActive && (
            <Badge bg="success" className="p-2">Currently Selected</Badge>
          )}
        </div>
        
        {/* Criterion Type Badge */}
        <div className="mb-3">
          <Badge bg="light" text="dark" className="border">
            Type: {definition.criteriaType}
          </Badge>
        </div>
        
        {/* Input Rendering Area */}
        <div className="mt-4">
          <label className="form-label">Configure this criterion:</label>
          {renderInput()}
        </div>
        
        {/* Remove Button */}
        {isCriterionActive && (
          <div className="mt-3 text-end">
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => onCriteriaChange(definition.name, undefined)} // Call parent handler to remove
            >
              Remove This Criterion
            </Button>
          </div>
        )}
      </div>
    </Col>
  );
};

export default CriteriaInputRenderer;
