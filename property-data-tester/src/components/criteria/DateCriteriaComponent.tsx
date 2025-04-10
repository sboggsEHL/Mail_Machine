import React, { useState, useEffect } from 'react';
import { BaseCriteriaProps } from './BaseCriteriaComponent';

/**
 * Component for date-based criteria
 */
export const DateCriteriaComponent: React.FC<BaseCriteriaProps & { includeUnknowns?: boolean }> = (props) => {
  const [dateType, setDateType] = useState<'preset' | 'range' | 'specific'>('preset');
  const [preset, setPreset] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [includeUnknowns, setIncludeUnknowns] = useState<boolean>(
    props.includeUnknowns || false
  );

  // Initialize from props.value if available
  useEffect(() => {
    if (Array.isArray(props.value) && props.value.length > 0) {
      const value = props.value[0];
      
      // Check if it's a preset
      if (typeof value === 'string' && 
          (value.startsWith('Last') || 
           value.startsWith('Next') || 
           value.startsWith('This'))) {
        setDateType('preset');
        setPreset(value);
      }
      // Check if it's a date range
      else if (typeof value === 'string' && value.startsWith('from:')) {
        setDateType('range');
        
        // Parse the date range
        const fromMatch = value.match(/from:\s*([^\s]*)/);
        const toMatch = value.match(/to:\s*([^\s]*)/);
        
        const fromDate = fromMatch && fromMatch[1] ? fromMatch[1].trim() : '';
        const toDate = toMatch && toMatch[1] ? toMatch[1].trim() : '';
        
        setStartDate(fromDate);
        setEndDate(toDate);
        
        // If from date is empty, it includes unknowns
        if (!fromDate && props.includeUnknowns) {
          setIncludeUnknowns(true);
        }
      }
      // Otherwise assume it's a specific date
      else {
        setDateType('specific');
        setStartDate(String(value));
      }
    }
  }, [props.value, props.includeUnknowns]);

  // Extract name and onChange from props to avoid dependency on the entire props object
  const { name, onChange } = props;

  // Handle changes and call parent onChange
  useEffect(() => {
    let value: string[] = [];
    
    if (dateType === 'preset' && preset) {
      value = [preset];
    } else if (dateType === 'specific' && startDate) {
      value = [startDate];
    } else if (dateType === 'range') {
      if (includeUnknowns && endDate) {
        value = [`from: to: ${endDate}`];
      } else if (startDate && endDate) {
        value = [`from: ${startDate} to: ${endDate}`];
      } else if (startDate) {
        value = [`from: ${startDate} to:`];
      } else if (endDate) {
        value = [`from: to: ${endDate}`];
      }
    }
    
    if (value.length > 0) {
      onChange(name, value);
    }
  }, [dateType, preset, startDate, endDate, includeUnknowns, name, onChange]);

  return (
    <div className="date-criteria criteria-component">
      <h4>{props.name}</h4>
      <p className="description">{props.description}</p>
      
      <div className="date-type-selector">
        <label>Date Selection Type:</label>
        <select 
          value={dateType} 
          onChange={e => setDateType(e.target.value as 'preset' | 'range' | 'specific')}
          className="form-select"
        >
          <option value="preset">Preset Date Range</option>
          <option value="range">Custom Date Range</option>
          <option value="specific">Specific Date</option>
        </select>
      </div>
      
      {dateType === 'preset' && (
        <div className="presets mt-2">
          <label>Select a preset:</label>
          <select 
            value={preset} 
            onChange={e => setPreset(e.target.value)}
            className="form-select"
          >
            <option value="">Select a preset</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 90 Days">Last 90 Days</option>
            <option value="Last 6 Months">Last 6 Months</option>
            <option value="Last 12 Months">Last 12 Months</option>
            <option value="This Month">This Month</option>
            <option value="This Quarter">This Quarter</option>
            <option value="This Year">This Year</option>
            <option value="Next 7 Days">Next 7 Days</option>
            <option value="Next 30 Days">Next 30 Days</option>
            <option value="Next Quarter">Next Quarter</option>
          </select>
        </div>
      )}
      
      {dateType === 'specific' && (
        <div className="specific-date mt-2">
          <label>Select a date:</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            placeholder="MM/DD/YYYY"
            className="form-control"
          />
        </div>
      )}
      
      {dateType === 'range' && (
        <div className="date-range mt-2">
          <div className="date-inputs row">
            <div className="col-md-6">
              <label>From:</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                disabled={includeUnknowns}
                placeholder="MM/DD/YYYY"
                className="form-control"
              />
            </div>
            <div className="col-md-6">
              <label>To:</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                placeholder="MM/DD/YYYY"
                className="form-control"
              />
            </div>
          </div>
          
          {props.includeUnknowns && (
            <div className="include-unknowns form-check mt-2">
              <input 
                type="checkbox" 
                id={`${props.name}-include-unknowns`}
                checked={includeUnknowns} 
                onChange={e => setIncludeUnknowns(e.target.checked)} 
                className="form-check-input"
              />
              <label 
                htmlFor={`${props.name}-include-unknowns`}
                className="form-check-label"
              >
                Include properties with unknown dates
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};