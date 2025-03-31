import React, { useState, useEffect } from 'react';
import { BaseCriteriaProps } from './BaseCriteriaComponent';

/**
 * Component for multiple values beginning with criteria
 * Similar to MultipleValuesComponent but with a note about partial matching
 */
export const MultipleValuesBeginningWithComponent: React.FC<BaseCriteriaProps> = (props) => {
  const [values, setValues] = useState<string[]>(
    Array.isArray(props.value) ? props.value.map(String) : []
  );
  const [inputValue, setInputValue] = useState<string>('');
  
  // Initialize from props.value if available
  useEffect(() => {
    if (Array.isArray(props.value)) {
      setValues(props.value.map(String));
    }
  }, [props.value]);
  
  // Add a new value
  const addValue = () => {
    if (inputValue.trim() && !values.includes(inputValue.trim())) {
      const newValues = [...values, inputValue.trim()];
      setValues(newValues);
      props.onChange(props.name, newValues);
      setInputValue('');
    }
  };
  
  // Remove a value
  const removeValue = (index: number) => {
    const newValues = [...values];
    newValues.splice(index, 1);
    setValues(newValues);
    props.onChange(props.name, newValues);
  };
  
  // Handle key press (Enter to add)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValue();
    }
  };
  
  return (
    <div className="multiple-values-beginning-with-criteria criteria-component">
      <h4>{props.name}</h4>
      <p className="description">{props.description}</p>
      <p className="text-info">
        <small>
          <i className="bi bi-info-circle me-1"></i>
          Values will match properties where the {props.name} begins with any of the values you enter.
        </small>
      </p>
      
      <div className="input-with-button input-group mb-3">
        <input 
          type="text" 
          value={inputValue} 
          onChange={e => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter a partial value and press Enter"
          className="form-control"
        />
        <button 
          onClick={addValue}
          className="btn btn-primary"
          type="button"
        >
          Add
        </button>
      </div>
      
      <div className="values-list">
        {values.length === 0 && (
          <p className="text-muted">No values added yet</p>
        )}
        
        {values.map((value, index) => (
          <div key={index} className="value-tag badge bg-info text-dark me-2 mb-2">
            <span>{value}*</span>
            <button 
              onClick={() => removeValue(index)}
              className="btn-close ms-2"
              aria-label="Remove"
              type="button"
              style={{ fontSize: '0.5rem', padding: '0.25rem' }}
            ></button>
          </div>
        ))}
      </div>
    </div>
  );
};