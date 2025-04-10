import React, { lazy, Suspense } from 'react';
import './criteria.css';

// Lazy load components to avoid circular dependencies
const DateCriteriaComponent = lazy(() => import('./DateCriteriaComponent').then(module => ({ default: module.DateCriteriaComponent })));
const BooleanCriteriaComponent = lazy(() => import('./BooleanCriteriaComponent').then(module => ({ default: module.BooleanCriteriaComponent })));
const MultipleValuesComponent = lazy(() => import('./MultipleValuesComponent').then(module => ({ default: module.MultipleValuesComponent })));
const MultipleValuesBeginningWithComponent = lazy(() => import('./MultipleValuesBeginningWithComponent').then(module => ({ default: module.MultipleValuesBeginningWithComponent })));
const MultipleRangeComponent = lazy(() => import('./MultipleRangeComponent').then(module => ({ default: module.MultipleRangeComponent })));
const SingleValueComponent = lazy(() => import('./SingleValueComponent').then(module => ({ default: module.SingleValueComponent })));
const PropertyTypeComponent = lazy(() => import('./PropertyTypeComponent').then(module => ({ default: module.PropertyTypeComponent })));

/**
 * Props for the BaseCriteriaComponent
 */
export interface BaseCriteriaProps {
  name: string;
  description: string;
  criteriaType: string;
  value: any;
  onChange: (name: string, value: any) => void;
}

/**
 * Base component that renders the appropriate criteria component based on criteria type
 */
export const BaseCriteriaComponent: React.FC<BaseCriteriaProps> = (props) => {
  // Loading fallback
  const fallback = (
    <div className="criteria-loading">
      <p>Loading component...</p>
    </div>
  );

  // Render appropriate component based on criteriaType
  const renderComponent = () => {
    switch(props.criteriaType) {
      case "Relative Date":
      case "Relative Date Including Unknowns":
        return (
          <Suspense fallback={fallback}>
            <DateCriteriaComponent {...props} includeUnknowns={props.criteriaType === "Relative Date Including Unknowns"} />
          </Suspense>
        );
        
      case "Boolean":
        return (
          <Suspense fallback={fallback}>
            <BooleanCriteriaComponent {...props} />
          </Suspense>
        );
        
      case "Multiple Values":
        return (
          <Suspense fallback={fallback}>
            <MultipleValuesComponent {...props} />
          </Suspense>
        );
        
      case "Multiple Values Beginning With":
        return (
          <Suspense fallback={fallback}>
            <MultipleValuesBeginningWithComponent {...props} />
          </Suspense>
        );
        
      case "Multiple Range":
        return (
          <Suspense fallback={fallback}>
            <MultipleRangeComponent {...props} includeUnknowns={false} />
          </Suspense>
        );
        
      case "Multiple Range Including Unknowns":
        return (
          <Suspense fallback={fallback}>
            <MultipleRangeComponent {...props} includeUnknowns={true} />
          </Suspense>
        );
        
      case "Single Value":
        return (
          <Suspense fallback={fallback}>
            <SingleValueComponent {...props} />
          </Suspense>
        );
        
      case "PropertyType":
        return (
          <Suspense fallback={fallback}>
            <PropertyTypeComponent {...props} />
          </Suspense>
        );
        
      default:
        // Default fallback component for unknown criteria types
        return (
          <div className="default-criteria">
            <h4>{props.name}</h4>
            <p className="description">{props.description}</p>
            <p className="warning">Unsupported criteria type: {props.criteriaType}</p>
            <input 
              type="text" 
              value={Array.isArray(props.value) ? props.value.join(', ') : props.value || ''} 
              onChange={(e) => props.onChange(props.name, e.target.value ? [e.target.value] : [])}
              placeholder="Enter value"
              className="form-control"
            />
          </div>
        );
    }
  };

  return renderComponent();
};

/**
 * Default component for criteria types that aren't specifically implemented
 */
export const DefaultCriteriaComponent: React.FC<BaseCriteriaProps> = (props) => {
  return (
    <div className="default-criteria">
      <h4>{props.name}</h4>
      <p className="description">{props.description}</p>
      <input 
        type="text" 
        value={Array.isArray(props.value) ? props.value.join(', ') : props.value || ''} 
        onChange={(e) => props.onChange(props.name, e.target.value ? [e.target.value] : [])}
        placeholder="Enter value"
        className="form-control"
      />
    </div>
  );
};

export default BaseCriteriaComponent;