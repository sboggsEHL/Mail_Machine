import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Tabs, Tab, Badge } from 'react-bootstrap';
import { PropertyRadarApiParams } from '../types/api';
import { 
  CriterionDefinition, 
  AllCriteriaDefinitions
} from '../../shared/types/criteria';
import { criteriaDefinitions } from '../utils/criteriaDefinitions'; // Assuming this remains the source
import { CRITERIA_CATEGORIES } from '../constants/formConstants';

// Import New Components
import BasicParamsForm from './form/BasicParamsForm';
import CriteriaSelector from './criteria/CriteriaSelector';
import CriteriaInputRenderer from './criteria/CriteriaInputRenderer';
import ActiveCriteriaDisplay from './criteria/ActiveCriteriaDisplay';

interface ApiParamsFormProps {
  apiParams: PropertyRadarApiParams;
  setApiParams: React.Dispatch<React.SetStateAction<PropertyRadarApiParams>>;
  onSubmitQuery: () => void; // Add a prop for handling the final submission
}

function ApiParamsForm({ apiParams, setApiParams, onSubmitQuery }: ApiParamsFormProps) {
  // State Management (remains mostly the same)
  const [activeTab, setActiveTab] = useState<string>(CRITERIA_CATEGORIES[0]?.key || ''); // Default to first category key
  const [criteriaDefs] = useState<AllCriteriaDefinitions>(criteriaDefinitions); // Removed setCriteriaDefs if not used
  const [selectedCriterion, setSelectedCriterion] = useState<CriterionDefinition | null>(null);
  // Removed loading, showAdvanced, dateSelectionType states as they are handled within child components or not needed

  // --- Effects ---

  // Log criteria definitions for debugging on mount (optional, can be removed)
  useEffect(() => {
    console.log('Available criteria categories:', Object.keys(criteriaDefinitions));
    Object.keys(criteriaDefinitions).forEach(category => {
      console.log(`Category ${category} has ${criteriaDefinitions[category].length} criteria`);
    });
  }, []); // Removed criteriaDefs dependency if it's static
  
  // Select first criterion in active category by default when tab changes or definitions load
  useEffect(() => {
    const currentCategoryCriteria = criteriaDefs[activeTab] || [];
    if (currentCategoryCriteria.length > 0) {
      // Only set a default selection if:
      // 1. There's no currently selected criterion, or
      // 2. The currently selected criterion is not from this category
      if (!selectedCriterion || !currentCategoryCriteria.some(c => c.name === selectedCriterion.name)) {
        // First, check if any criterion from this category is already in use
        const activeCriterionInCurrentCategory = currentCategoryCriteria.find(
          criterion => (apiParams.criteria as any)?.[criterion.name] !== undefined
        );
        
        if (activeCriterionInCurrentCategory) {
          // If there's a criterion from this category already in use, select it
          setSelectedCriterion(activeCriterionInCurrentCategory);
        } else {
          // Otherwise, select the first one in the category
          setSelectedCriterion(currentCategoryCriteria[0]);
        }
      }
      // If the user has already selected a criterion in this category, we don't change it
    } else {
      // If the new tab has no criteria, clear the selection
      setSelectedCriterion(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [activeTab, criteriaDefs]); // Keep apiParams.criteria out to avoid loops when selecting existing

  // --- Handlers ---

  // Handles changes for basic parameters (limit, start, purchase)
  const handleBasicParamChange = (field: 'limit' | 'start' | 'purchase', value: string): void => {
    const numericValue = Number(value); // Convert string value from form controls
    setApiParams(prevParams => ({
      ...prevParams,
      [field]: numericValue
    }));
  };

  // Handles changes for specific criteria values from input components
  const handleCriteriaChange = (criteriaName: string, value: any): void => {
    setApiParams(prevParams => {
      const newCriteria = { ...(prevParams.criteria || {}) };
      if (value === undefined) {
        delete (newCriteria as any)[criteriaName]; // Remove criterion if value is undefined
      } else {
        (newCriteria as any)[criteriaName] = value; // Add/update criterion
      }
      // If removing the currently selected criterion, clear the selection
      if (value === undefined && selectedCriterion?.name === criteriaName) {
          setSelectedCriterion(null); 
          // Optionally select the next/first criterion in the current tab here
      }
      return {
        ...prevParams,
        criteria: newCriteria
      };
    });
  };

  // Handles selecting a criterion from the list
  const handleCriterionSelect = (criterion: CriterionDefinition) => {
    setSelectedCriterion(criterion);
  };

  // Handles selecting a criterion by clicking its badge in the summary
  const handleSelectCriterionFromBadge = (categoryKey: string, definition: CriterionDefinition) => {
    setActiveTab(categoryKey);
    setSelectedCriterion(definition);
  };

  // Handles tab selection
  const handleTabSelect = (key: string | null) => {
    if (key) {
      setActiveTab(key);
      // The useEffect hook will handle selecting a default criterion for the new tab
    }
  };

  // --- Rendering ---

  const currentCategoryCriteria = criteriaDefs[activeTab] || [];
  const selectedCriterionValue = selectedCriterion ? (apiParams.criteria as any)?.[selectedCriterion.name] : undefined;

  return (
    <Card>
      <Card.Header>
        <Card.Title className="mb-0">API Parameters</Card.Title>
      </Card.Header>
      <Card.Body>
        {/* Prevent default form submission */}
        <Form onSubmit={(e) => e.preventDefault()}> 
          
          {/* Basic Parameters Section */}
          <BasicParamsForm
            limit={apiParams.limit}
            start={apiParams.start}
            purchase={apiParams.purchase}
            onParamChange={handleBasicParamChange}
          />
          
          <hr />
          
          {/* Search Criteria Section */}
          <h5 className="mb-3">Search Criteria</h5>
          
          <Tabs
            activeKey={activeTab}
            onSelect={handleTabSelect}
            className="mb-3"
            variant="pills"
            id="criteria-tabs" // Added ID for accessibility/testing
          >
            {CRITERIA_CATEGORIES.map((category) => {
              const categoryHasActiveCriteria = Object.entries(apiParams.criteria || {}).some(
                ([criteriaName, value]) => value !== undefined && criteriaDefs[category.key]?.some(def => def.name === criteriaName)
              );
              return (
                <Tab
                  key={category.key}
                  eventKey={category.key}
                  title={
                    <span>
                      {category.label}
                      {categoryHasActiveCriteria && (
                        <Badge bg="success" className="ms-2" pill>
                          <small>✓</small>
                        </Badge>
                      )}
                    </span>
                  }
                  className="pt-3" // Keep padding for content below tabs
                >
                  {/* Render Selector and Input side-by-side */}
                  <Row>
                    <CriteriaSelector
                      categoryCriteria={currentCategoryCriteria}
                      selectedCriterion={selectedCriterion}
                      activeCriteria={apiParams.criteria}
                      onCriterionSelect={handleCriterionSelect}
                    />
                    <CriteriaInputRenderer
                      selectedCriterion={selectedCriterion}
                      criterionValue={selectedCriterionValue}
                      onCriteriaChange={handleCriteriaChange}
                    />
                  </Row>
                </Tab>
              );
            })}
          </Tabs>
          
          {/* Active Criteria Display & Summary Section */}
          <ActiveCriteriaDisplay
            apiParams={apiParams}
            criteriaDefs={criteriaDefs}
            onRemoveCriterion={(name) => handleCriteriaChange(name, undefined)} // Reuse handler
            onSelectCriterion={handleSelectCriterionFromBadge}
            onSubmit={onSubmitQuery} // Pass the submit handler from props
          />
          
        </Form>
      </Card.Body>
    </Card>
  );
}

export default ApiParamsForm;
