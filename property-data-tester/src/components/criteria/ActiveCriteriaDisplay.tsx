import React from 'react';
import { Form, Badge, Button } from 'react-bootstrap';
import { PropertyRadarApiParams } from '../../types/api';
import { AllCriteriaDefinitions, CriterionDefinition } from '../../../shared/types/criteria';
import { CRITERIA_CATEGORIES } from '../../constants/formConstants';
import { getCategoryColor, formatCriteriaValue, getCriterionExplanation } from '../../utils/formUtils';

interface ActiveCriteriaDisplayProps {
  apiParams: PropertyRadarApiParams;
  criteriaDefs: AllCriteriaDefinitions;
  onRemoveCriterion: (criterionName: string) => void;
  onSelectCriterion: (category: string, definition: CriterionDefinition) => void;
  onSubmit: () => void; // Callback for the submit button
}

const ActiveCriteriaDisplay: React.FC<ActiveCriteriaDisplayProps> = ({
  apiParams,
  criteriaDefs,
  onRemoveCriterion,
  onSelectCriterion,
  onSubmit,
}) => {
  const activeCriteriaEntries = Object.entries(apiParams.criteria || {}).filter(
    ([, value]) => value !== undefined
  );
  const activeCriteriaCount = activeCriteriaEntries.length;

  if (activeCriteriaCount === 0) {
    return null; // Don't render anything if no criteria are active
  }

  return (
    <div className="mt-4"> {/* Added mt-4 for spacing */}
      {/* Display active criteria as badges */}
      <div className="mb-3">
        <Form.Label>Active Criteria:</Form.Label>
        <div className="d-flex flex-wrap">
          {activeCriteriaEntries.map(([criteriaName, value]) => {
            // Find the category and definition for coloring and click behavior
            let category = 'other';
            let definition: CriterionDefinition | undefined = undefined;
            
            for (const cat of CRITERIA_CATEGORIES) {
              const foundDef = criteriaDefs[cat.key]?.find((def: CriterionDefinition) => def.name === criteriaName);
              if (foundDef) {
                category = cat.key;
                definition = foundDef;
                break;
              }
            }
            
            return (
              <span
                key={criteriaName}
                className={`badge bg-${getCategoryColor(category)} me-2 mb-2`}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (definition) {
                    onSelectCriterion(category, definition);
                  }
                }}
                title={`Click to edit ${criteriaName}`} // Add tooltip
              >
                {criteriaName}: {formatCriteriaValue(criteriaName, value)}
                <button
                  type="button"
                  className="btn-close btn-close-white ms-2"
                  style={{ fontSize: '0.5rem' }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent badge click when removing
                    onRemoveCriterion(criteriaName);
                  }}
                  aria-label={`Remove ${criteriaName}`} // Improved accessibility
                  title={`Remove ${criteriaName}`} // Add tooltip
                />
              </span>
            );
          })}
        </div>
      </div>
      
      {/* User-Friendly Request Preview */}
      <div className="mt-4 border p-3 rounded bg-light">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Search Request Summary:</h6>
          <Badge bg="secondary">{activeCriteriaCount} criteria</Badge>
        </div>
        
        <div className="mb-3">
          <strong>Basic Settings:</strong>
          <ul className="mt-2 mb-0 ps-3"> {/* Added padding */}
            <li>Number of properties to retrieve: <strong>{apiParams.limit}</strong></li>
            <li>Starting position: <strong>{apiParams.start}</strong></li>
            <li>Mode: <strong>{apiParams.purchase === 0 ? 'Preview (No Charge)' : 'Purchase Records'}</strong></li>
          </ul>
        </div>
        
        {activeCriteriaCount > 0 && (
          <div>
            <strong>Selected Search Criteria:</strong>
            <ul className="mt-2 mb-0 ps-3"> {/* Added padding */}
              {activeCriteriaEntries.map(([criteriaName, value]) => {
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
          disabled={activeCriteriaCount === 0}
          onClick={onSubmit} // Use the passed onSubmit callback
        >
          Submit Query ({activeCriteriaCount} criteria)
        </Button>
        <div className="text-center text-muted mt-2">
          <small>Click submit when you've finished building your search criteria</small>
        </div>
      </div>
    </div>
  );
};

export default ActiveCriteriaDisplay;