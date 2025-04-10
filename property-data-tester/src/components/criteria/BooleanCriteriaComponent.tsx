import React, { useState, useEffect } from 'react';
import { BaseCriteriaProps } from './BaseCriteriaComponent';

/**
 * Component for boolean criteria
 */
export const BooleanCriteriaComponent: React.FC<BaseCriteriaProps> = (props) => {
  const [value, setValue] = useState<number>(
    Array.isArray(props.value) && props.value.length > 0 ? 
      (typeof props.value[0] === 'boolean' ? (props.value[0] ? 1 : 0) : Number(props.value[0])) : 
      1
  );
  
  // Handle changes and call parent onChange
  const handleChange = (newValue: number) => {
    setValue(newValue);
    props.onChange(props.name, [newValue]);
  };
  
  // Initialize from props.value if available
  useEffect(() => {
    if (Array.isArray(props.value) && props.value.length > 0) {
      const val = props.value[0];
      if (typeof val === 'boolean') {
        setValue(val ? 1 : 0);
      } else if (typeof val === 'number') {
        setValue(val);
      } else if (typeof val === 'string') {
        setValue(val === 'true' || val === '1' ? 1 : 0);
      }
    }
  }, [props.value]);
  
  return (
    <div className="boolean-criteria criteria-component">
      <h4>{props.name}</h4>
      <p className="description">{props.description}</p>
      
      <div className="radio-options">
        <div className="form-check">
          <input 
            type="radio" 
            id={`${props.name}-yes`} 
            name={`${props.name}-option`}
            className="form-check-input"
            checked={value === 1} 
            onChange={() => handleChange(1)} 
          />
          <label 
            htmlFor={`${props.name}-yes`}
            className="form-check-label"
          >
            Yes
          </label>
        </div>
        <div className="form-check">
          <input 
            type="radio" 
            id={`${props.name}-no`} 
            name={`${props.name}-option`}
            className="form-check-input"
            checked={value === 0} 
            onChange={() => handleChange(0)} 
          />
          <label 
            htmlFor={`${props.name}-no`}
            className="form-check-label"
          >
            No
          </label>
        </div>
      </div>
    </div>
  );
};