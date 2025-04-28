import React, { useState, useEffect, useMemo } from 'react';
import { Card, Form, Row, Tabs, Tab, Badge, Alert } from 'react-bootstrap';
import { PropertyRadarApiParams } from '../types/api';
// Import provider context and types
import { useProvider } from '../context/ProviderContext';
import { PROVIDER_MODULES, ProviderId, CriteriaDefinition } from '../providers';
// Removed unused imports: CriterionDefinition, AllCriteriaDefinitions from '../../shared/types/criteria'
// CRITERIA_CATEGORIES import removed as categories are now derived dynamically.

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

// Type for grouped criteria definitions used internally
type GroupedCriteriaDefinitions = Record<string, CriteriaDefinition[]>;

function ApiParamsForm({ apiParams, setApiParams, onSubmitQuery }: ApiParamsFormProps) {
  const { selectedProvider } = useProvider();
  const providerModule = PROVIDER_MODULES[selectedProvider as ProviderId];

  // Get available criteria definitions from the provider module
  const availableCriteria: CriteriaDefinition[] = useMemo(() => providerModule?.criteria || [], [providerModule]);

  // Group criteria definitions by category
  const groupedCriteriaDefs: GroupedCriteriaDefinitions = useMemo(() => {
    return availableCriteria.reduce((acc, criterion) => {
      const categoryKey = criterion.category || 'other'; // Use 'other' if no category
      if (!acc[categoryKey]) {
        acc[categoryKey] = [];
      }
      acc[categoryKey].push(criterion);
      return acc;
    }, {} as GroupedCriteriaDefinitions);
  }, [availableCriteria]);

  // State Management
  // Derive categories dynamically from the grouped criteria
  const dynamicCategories = useMemo(() => Object.keys(groupedCriteriaDefs).map(key => ({
      key: key,
      // Simple label generation (can be improved if needed)
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/&/g, ' & ')
  })), [groupedCriteriaDefs]);

  const [activeTab, setActiveTab] = useState<string>(''); // Initialize empty
  const [selectedCriterion, setSelectedCriterion] = useState<CriteriaDefinition | null>(null);

  // --- Effects ---

  // Log criteria definitions for debugging on mount (optional, can be removed)
  // Optional: Log grouped criteria for debugging
  // Set initial active tab once dynamic categories are available
  useEffect(() => {
    if (!activeTab && dynamicCategories.length > 0) {
      setActiveTab(dynamicCategories[0].key);
    }
  }, [dynamicCategories, activeTab]);


  // Select first criterion in active category by default when tab changes or definitions load
  useEffect(() => {
    console.log(`Provider ${selectedProvider} criteria categories:`, Object.keys(groupedCriteriaDefs));
    Object.keys(groupedCriteriaDefs).forEach(category => {
      console.log(`Category ${category} has ${groupedCriteriaDefs[category].length} criteria`);
    });
  }, [groupedCriteriaDefs, selectedProvider]);
  
  // Select first criterion in active category by default when tab changes or definitions load
  // Select first criterion in active category by default when tab changes or definitions load
  useEffect(() => {
    // Removed unused currentCategoryCriteria variable
    const criteria = groupedCriteriaDefs[activeTab] || [];
    if (criteria.length > 0) {
      // Only set a default selection if:
      // 1. There's no currently selected criterion, or
      // 2. The currently selected criterion is not from this category
      if (!selectedCriterion || !criteria.some(c => c.name === selectedCriterion.name)) {
        // First, check if any criterion from this category is already in use
        const activeCriterionInCurrentCategory = criteria.find(
          criterion => (apiParams.criteria as any)?.[criterion.name] !== undefined
        );
        
        if (activeCriterionInCurrentCategory) {
          // If there's a criterion from this category already in use, select it
          setSelectedCriterion(activeCriterionInCurrentCategory);
        } else {
          // Otherwise, select the first one in the category
          setSelectedCriterion(criteria[0]);
        }
      }
      // If the user has already selected a criterion in this category, we don't change it
    } else {
      // If the new tab has no criteria, clear the selection
      setSelectedCriterion(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [activeTab, groupedCriteriaDefs, selectedCriterion, apiParams.criteria]); // Dependencies updated

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
  const handleCriterionSelect = (criterion: CriteriaDefinition) => { // Use updated type
    setSelectedCriterion(criterion);
  };

  // Handles selecting a criterion by clicking its badge in the summary
  const handleSelectCriterionFromBadge = (categoryKey: string, definition: CriteriaDefinition) => { // Use updated type
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
          
          {availableCriteria.length === 0 ? (
            <Alert variant="warning">No criteria definitions available for the selected provider ({selectedProvider}).</Alert>
          ) : (
            <Tabs
              activeKey={activeTab}
              onSelect={handleTabSelect}
              className="mb-3"
              variant="pills"
              id="criteria-tabs"
            >
              {dynamicCategories.map((category) => {
                // Criteria for this category are already filtered in groupedCriteriaDefs
                const criteriaForThisCategory = groupedCriteriaDefs[category.key];
                // No need to check length again as dynamicCategories is derived from non-empty groups

                const categoryHasActiveCriteria = Object.entries(apiParams.criteria || {}).some(
                  ([criteriaName, value]) => value !== undefined && criteriaForThisCategory.some(def => def.name === criteriaName)
                );

                return (
                  <Tab
                    key={category.key}
                    eventKey={category.key}
                    title={
                      <span>
                        {category.label} {/* Use derived label */}
                        {categoryHasActiveCriteria && (
                          <Badge bg="success" className="ms-2" pill>
                            <small>✓</small>
                          </Badge>
                        )}
                      </span>
                    }
                    className="pt-3"
                  >
                    {/* Ensure activeTab matches current category before rendering content */}
                    {activeTab === category.key && (
                       <Row>
                        <CriteriaSelector
                          categoryCriteria={criteriaForThisCategory}
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
                    )}
                  </Tab>
                );
              })}
            </Tabs>
          )}
          
          {/* Active Criteria Display & Summary Section */}
          <ActiveCriteriaDisplay
            apiParams={apiParams}
            criteriaDefs={groupedCriteriaDefs} // Pass grouped definitions
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
