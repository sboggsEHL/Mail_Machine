import React, { useState, useEffect } from 'react';
import { BaseCriteriaProps } from './BaseCriteriaComponent';

/**
 * Interface for range values
 */
interface RangeValue {
  min: number | null;
  max: number | null;
}

/**
 * Component for multiple range criteria
 */
export const MultipleRangeComponent: React.FC<BaseCriteriaProps & { includeUnknowns: boolean }> = (props) => {
  const [ranges, setRanges] = useState<RangeValue[]>([{ min: null, max: null }]);
  const [includeUnknowns, setIncludeUnknowns] = useState<boolean>(props.includeUnknowns);
  
  // Initialize from props.value if available
  useEffect(() => {
    if (Array.isArray(props.value) && props.value.length > 0) {
      // Check if the value is already in the correct format
      if (Array.isArray(props.value[0])) {
        const initialRanges = props.value.map(range => {
          if (Array.isArray(range) && range.length === 2) {
            return { 
              min: range[0] === null || range[0] === undefined ? null : Number(range[0]), 
              max: range[1] === null || range[1] === undefined ? null : Number(range[1]) 
            };
          }
          return { min: null, max: null };
        });
        setRanges(initialRanges);
        
        // Check if unknowns are included (min is null)
        if (props.includeUnknowns && initialRanges.some(r => r.min === null)) {
          setIncludeUnknowns(true);
        }
      }
      // If it's a single value, try to parse it as a range
      else if (typeof props.value[0] === 'string') {
        try {
          const parsedValue = JSON.parse(props.value[0]);
          if (Array.isArray(parsedValue) && parsedValue.length === 2) {
            setRanges([{ 
              min: parsedValue[0] === null ? null : Number(parsedValue[0]), 
              max: parsedValue[1] === null ? null : Number(parsedValue[1]) 
            }]);
            
            // Check if unknowns are included
            if (props.includeUnknowns && parsedValue[0] === null) {
              setIncludeUnknowns(true);
            }
          }
        } catch (e) {
          // If parsing fails, keep default
        }
      }
    }
  }, [props.value, props.includeUnknowns]);
  
  // Extract name and onChange from props to avoid dependency on the entire props object
  const { name, onChange } = props;
  
  // Update parent when ranges change
  useEffect(() => {
    const formattedRanges = ranges.map(range => [range.min, range.max]);
    onChange(name, formattedRanges);
  }, [ranges, includeUnknowns, name, onChange]);
  
  // Update a specific range
  const updateRange = (index: number, field: 'min' | 'max', value: number | null) => {
    const newRanges = [...ranges];
    newRanges[index][field] = value;
    setRanges(newRanges);
  };
  
  // Add a new range
  const addRange = () => {
    setRanges([...ranges, { min: includeUnknowns ? null : null, max: null }]);
  };
  
  // Remove a range
  const removeRange = (index: number) => {
    if (ranges.length > 1) {
      const newRanges = [...ranges];
      newRanges.splice(index, 1);
      setRanges(newRanges);
    }
  };
  
  // Handle include unknowns change
  const handleIncludeUnknownsChange = (checked: boolean) => {
    setIncludeUnknowns(checked);
    if (checked) {
      // Set min to null for all ranges to include unknowns
      const newRanges = ranges.map(range => ({ ...range, min: null }));
      setRanges(newRanges);
    }
  };
  
  return (
    <div className="multiple-range-criteria criteria-component">
      <h4>{props.name}</h4>
      <p className="description">{props.description}</p>
      
      {props.includeUnknowns && (
        <div className="include-unknowns form-check mb-3">
          <input 
            type="checkbox" 
            id={`${props.name}-include-unknowns`}
            checked={includeUnknowns} 
            onChange={e => handleIncludeUnknownsChange(e.target.checked)} 
            className="form-check-input"
          />
          <label 
            htmlFor={`${props.name}-include-unknowns`}
            className="form-check-label"
          >
            Include properties with unknown values
          </label>
        </div>
      )}
      
      {ranges.map((range, index) => (
        <div key={index} className="range-inputs row mb-2">
          <div className="col-md-5">
            <label>Min:</label>
            <input 
              type="number" 
              value={range.min === null ? '' : range.min} 
              onChange={e => updateRange(index, 'min', e.target.value === '' ? null : Number(e.target.value))}
              disabled={includeUnknowns}
              placeholder="No minimum"
              className="form-control"
            />
          </div>
          <div className="col-md-5">
            <label>Max:</label>
            <input 
              type="number" 
              value={range.max === null ? '' : range.max} 
              onChange={e => updateRange(index, 'max', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="No maximum"
              className="form-control"
            />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            {ranges.length > 1 && (
              <button 
                onClick={() => removeRange(index)}
                className="btn btn-sm btn-danger"
                type="button"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
      
      <button 
        onClick={addRange}
        className="btn btn-sm btn-primary mt-2"
        type="button"
      >
        Add Another Range
      </button>
    </div>
  );
};