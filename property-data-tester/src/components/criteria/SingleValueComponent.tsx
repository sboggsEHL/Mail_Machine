import React, { useState, useEffect } from 'react';
import { BaseCriteriaProps } from './BaseCriteriaComponent';

/**
 * Component for single value criteria
 */
export const SingleValueComponent: React.FC<BaseCriteriaProps> = (props) => {
  const [value, setValue] = useState<string>(
    Array.isArray(props.value) && props.value.length > 0 ? String(props.value[0]) : ''
  );
  
  // Initialize from props.value if available
  useEffect(() => {
    if (Array.isArray(props.value) && props.value.length > 0) {
      setValue(String(props.value[0]));
    }
  }, [props.value]);
  
  // Handle change and call parent onChange
  const handleChange = (newValue: string) => {
    setValue(newValue);
    props.onChange(props.name, [newValue]);
  };
  
  return (
    <div className="single-value-criteria criteria-component">
      <h4>{props.name}</h4>
      <p className="description">{props.description}</p>
      
      <div className="mb-3">
        <label htmlFor={`${props.name}-input`} className="form-label">Value:</label>
        <input 
          type="text" 
          id={`${props.name}-input`}
          value={value} 
          onChange={e => handleChange(e.target.value)}
          placeholder="Enter a value"
          className="form-control"
        />
      </div>
    </div>
  );
};