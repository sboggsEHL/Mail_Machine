# PropertyRadar UI Implementation Plan (Updated)

This document outlines the updated plan for implementing UI components that accurately reflect the data types for PropertyRadar criteria.

## Table of Contents

1. [Overview](#overview)
2. [Criteria Types](#criteria-types)
3. [Implementation Plan](#implementation-plan)
   - [Backend Preparation](#backend-preparation)
   - [Frontend Components](#frontend-components)
   - [Integration and Testing](#integration-and-testing)
4. [Component Implementations](#component-implementations)
5. [Timeline](#timeline)
6. [Files to Create/Modify](#files-to-createmodify)
7. [Additional Notes](#additional-notes)

## Overview

The current UI doesn't accurately reflect the data types when making queries, particularly for date fields which are using min/max inputs instead of date pickers. This plan outlines how to implement specialized UI components for each criteria type defined in the PropertyRadar API.

## Criteria Types

We've already updated the PropertyRadarCriteriaMapper.ts file to include all these criteria types:

1. **Multiple Values** - Accepts one or more values, which are OR'd together
   - Example: `{"name":"ZipFive", "value":["97202", "97212"]}`

2. **Multiple Values Beginning With** - Similar to Multiple Value, but for partial matching
   - Example: `{"name":"APN", "value":["123","910-021-669-000"]}`

3. **Boolean** - Accepts either integer 1 (true) or 0 (false)
   - Example: `{"name":"Pool", "value":[1]}`

4. **Multiple Range** - Accepts a series of arrays with min and max values
   - Example: `{"name":"TransferAmount", "value":[[200000, 500000]]}`
   - Use `null` for unbounded ranges: `[[100000, null]]` (from $100,000 to infinity)

5. **Multiple Range Including Unknowns** - Same as Multiple Range but includes unknown values
   - Example: `{"name":"SqFt", "value":[[null, 1000]]}`
   - When `null` is used as the left (minimum) end of the range, unknown values are included

6. **Relative Date** - Accepts preset date strings or specific date ranges
   - Example: `{"name":"TransferDate", "value":["Last 30 Days"]}`
   - Also accepts date ranges: `{"name":"ForeclosureSaleDate", "value":["from: 1/1/2023 to: 1/31/2023"]}`

7. **Relative Date Including Unknowns** - Same as Relative Date but includes unknown values
   - Example: `{"name":"ForeclosureSaleDate", "value":["from: to: 1/1/1999"]}`
   - When the `from:` section is left empty, includes properties with unknown values

8. **Single Value** - Like Multiple Value but accepts only one value
   - Example: `{"name":"OddEven", "value":["Odd"]}`

9. **PropertyType** - Special format combining PType and AdvancedPropertyTypes
   - Example: `{"name":"PropertyType", "value":[{"name":"PType", "value":["SFR"]}]}`

## Implementation Plan

### Backend Preparation

Since we've already updated the PropertyRadarCriteriaMapper.ts file to include all criteria types and their correct formats, and we've fixed the PropertyController.ts file to handle date ranges properly, we don't need to create additional backend services to load criteria from JSON files.

Instead, we'll create a service that uses the PropertyRadarCriteriaMapper to get criteria types:

```typescript
// property-data-tester/server/services/CriteriaService.ts

import { PropertyRadarCriteriaMapper } from './lead-providers/propertyradar/PropertyRadarCriteriaMapper';

export class CriteriaService {
  // Get all criteria with their types
  getAllCriteria(): CriteriaDefinition[] {
    // Get all criteria names and types from PropertyRadarCriteriaMapper
    const criteriaMap = PropertyRadarCriteriaMapper.getCriteriaTypeMap();
    
    return Object.entries(criteriaMap).map(([name, type]) => ({
      name,
      criteriaType: type,
      description: this.getCriteriaDescription(name)
    }));
  }
  
  // Get criteria by category
  getCriteriaByCategory(category: string): CriteriaDefinition[] {
    // Implementation based on categories
    // This could be hardcoded or derived from criteria names
    return this.getAllCriteria().filter(c => this.getCriteriaCategory(c.name) === category);
  }
  
  // Helper method to get criteria description
  private getCriteriaDescription(name: string): string {
    // Provide descriptions for common criteria
    const descriptions: Record<string, string> = {
      'ZipFive': 'ZIP Code in which the property is located',
      'Pool': 'Whether or not the property has a swimming pool',
      'AvailableEquity': 'The dollar value of equity in the property',
      'TransferDate': 'The date the property was transferred',
      // Add more descriptions as needed
    };
    
    return descriptions[name] || `Criteria for ${name}`;
  }
  
  // Helper method to determine criteria category
  private getCriteriaCategory(name: string): string {
    // Map criteria names to categories
    if (/^(State|County|City|ZipFive|Address)/.test(name)) return 'location';
    if (/^(PropertyType|OwnerOccupied|Beds|Baths)/.test(name)) return 'property';
    if (/^(EstimatedValue|AvailableEquity)/.test(name)) return 'value';
    if (/^(Transfer|Buyer|Seller)/.test(name)) return 'transfer';
    // Add more category mappings
    
    return 'other';
  }
}
```

### Frontend Components

#### Base Component Structure

```typescript
// property-data-tester/src/components/criteria/BaseCriteriaComponent.tsx

interface BaseCriteriaProps {
  name: string;
  description: string;
  criteriaType: string;
  value: any;
  onChange: (name: string, value: any) => void;
}

const BaseCriteriaComponent: React.FC<BaseCriteriaProps> = (props) => {
  // Render appropriate component based on criteriaType
  switch(props.criteriaType) {
    case "Relative Date":
    case "Relative Date Including Unknowns":
      return <DateCriteriaComponent {...props} />;
    case "Boolean":
      return <BooleanCriteriaComponent {...props} />;
    case "Multiple Values":
      return <MultipleValuesComponent {...props} />;
    case "Multiple Values Beginning With":
      return <MultipleValuesBeginningWithComponent {...props} />;
    case "Multiple Range":
      return <MultipleRangeComponent {...props} includeUnknowns={false} />;
    case "Multiple Range Including Unknowns":
      return <MultipleRangeComponent {...props} includeUnknowns={true} />;
    case "Single Value":
      return <SingleValueComponent {...props} />;
    case "PropertyType":
      return <PropertyTypeComponent {...props} />;
    default:
      return <DefaultCriteriaComponent {...props} />;
  }
}
```

### Integration and Testing

1. **Update Existing UI**
   - Replace current criteria selection UI with new components
   - Ensure proper styling and layout

2. **Test Each Criteria Type**
   - Create test cases for each criteria type
   - Verify that UI components render correctly
   - Verify that data is properly formatted for the backend

3. **End-to-End Testing**
   - Test the complete flow from UI selection to API request
   - Verify that PropertyRadar API receives correctly formatted criteria

## Component Implementations

### 1. Date Criteria Component

```typescript
// property-data-tester/src/components/criteria/DateCriteriaComponent.tsx

const DateCriteriaComponent: React.FC<BaseCriteriaProps & {includeUnknowns?: boolean}> = (props) => {
  const [dateType, setDateType] = useState<'preset'|'range'|'specific'>('preset');
  const [preset, setPreset] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [includeUnknowns, setIncludeUnknowns] = useState<boolean>(
    props.criteriaType === "Relative Date Including Unknowns"
  );
  
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
        value = [startDate];
      } else if (endDate) {
        value = [`from: to: ${endDate}`];
      }
    }
    
    if (value.length > 0) {
      props.onChange(props.name, value);
    }
  }, [dateType, preset, startDate, endDate, includeUnknowns]);
  
  return (
    <div className="date-criteria">
      <label>{props.name}</label>
      <p className="description">{props.description}</p>
      
      <div className="date-type-selector">
        <select value={dateType} onChange={e => setDateType(e.target.value as any)}>
          <option value="preset">Preset Date Range</option>
          <option value="range">Custom Date Range</option>
          <option value="specific">Specific Date</option>
        </select>
      </div>
      
      {dateType === 'preset' && (
        <div className="presets">
          <select value={preset} onChange={e => setPreset(e.target.value)}>
            <option value="">Select a preset</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 90 Days">Last 90 Days</option>
            <option value="Last 6 Months">Last 6 Months</option>
            <option value="Last 12 Months">Last 12 Months</option>
            <option value="Next 7 Days">Next 7 Days</option>
            <option value="Next 30 Days">Next 30 Days</option>
            <option value="Next Quarter">Next Quarter</option>
          </select>
        </div>
      )}
      
      {dateType === 'specific' && (
        <div className="specific-date">
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            placeholder="MM/DD/YYYY"
          />
        </div>
      )}
      
      {dateType === 'range' && (
        <div className="date-range">
          <div className="date-inputs">
            <div>
              <label>From</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                disabled={includeUnknowns}
                placeholder="MM/DD/YYYY"
              />
            </div>
            <div>
              <label>To</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                placeholder="MM/DD/YYYY"
              />
            </div>
          </div>
          
          {props.criteriaType === "Relative Date Including Unknowns" && (
            <div className="include-unknowns">
              <input 
                type="checkbox" 
                checked={includeUnknowns} 
                onChange={e => setIncludeUnknowns(e.target.checked)} 
              />
              <label>Include properties with unknown dates</label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 2. Boolean Criteria Component

```typescript
// property-data-tester/src/components/criteria/BooleanCriteriaComponent.tsx

const BooleanCriteriaComponent: React.FC<BaseCriteriaProps> = (props) => {
  const [value, setValue] = useState<number>(
    Array.isArray(props.value) && props.value.length > 0 ? props.value[0] : 1
  );
  
  const handleChange = (newValue: number) => {
    setValue(newValue);
    props.onChange(props.name, [newValue]);
  };
  
  return (
    <div className="boolean-criteria">
      <label>{props.name}</label>
      <p className="description">{props.description}</p>
      
      <div className="radio-options">
        <div className="radio-option">
          <input 
            type="radio" 
            id={`${props.name}-yes`} 
            checked={value === 1} 
            onChange={() => handleChange(1)} 
          />
          <label htmlFor={`${props.name}-yes`}>Yes</label>
        </div>
        <div className="radio-option">
          <input 
            type="radio" 
            id={`${props.name}-no`} 
            checked={value === 0} 
            onChange={() => handleChange(0)} 
          />
          <label htmlFor={`${props.name}-no`}>No</label>
        </div>
      </div>
    </div>
  );
}
```

### 3. Multiple Range Component

```typescript
// property-data-tester/src/components/criteria/MultipleRangeComponent.tsx

interface RangeValue {
  min: number | null;
  max: number | null;
}

const MultipleRangeComponent: React.FC<BaseCriteriaProps & {includeUnknowns: boolean}> = (props) => {
  const [ranges, setRanges] = useState<RangeValue[]>([{ min: null, max: null }]);
  const [includeUnknowns, setIncludeUnknowns] = useState<boolean>(props.includeUnknowns);
  
  // Initialize from props.value if available
  useEffect(() => {
    if (Array.isArray(props.value) && props.value.length > 0) {
      const initialRanges = props.value.map(range => {
        if (Array.isArray(range) && range.length === 2) {
          return { min: range[0], max: range[1] };
        }
        return { min: null, max: null };
      });
      setRanges(initialRanges);
    }
  }, []);
  
  // Update parent when ranges change
  useEffect(() => {
    const formattedRanges = ranges.map(range => [range.min, range.max]);
    props.onChange(props.name, formattedRanges);
  }, [ranges, includeUnknowns]);
  
  const updateRange = (index: number, field: 'min' | 'max', value: number | null) => {
    const newRanges = [...ranges];
    newRanges[index][field] = value;
    setRanges(newRanges);
  };
  
  const addRange = () => {
    setRanges([...ranges, { min: null, max: null }]);
  };
  
  const removeRange = (index: number) => {
    if (ranges.length > 1) {
      const newRanges = [...ranges];
      newRanges.splice(index, 1);
      setRanges(newRanges);
    }
  };
  
  const handleIncludeUnknownsChange = (checked: boolean) => {
    setIncludeUnknowns(checked);
    if (checked) {
      // Set min to null for all ranges to include unknowns
      const newRanges = ranges.map(range => ({ ...range, min: null }));
      setRanges(newRanges);
    }
  };
  
  return (
    <div className="multiple-range-criteria">
      <label>{props.name}</label>
      <p className="description">{props.description}</p>
      
      {props.includeUnknowns && (
        <div className="include-unknowns">
          <input 
            type="checkbox" 
            checked={includeUnknowns} 
            onChange={e => handleIncludeUnknownsChange(e.target.checked)} 
          />
          <label>Include properties with unknown values</label>
        </div>
      )}
      
      {ranges.map((range, index) => (
        <div key={index} className="range-inputs">
          <div>
            <label>Min</label>
            <input 
              type="number" 
              value={range.min === null ? '' : range.min} 
              onChange={e => updateRange(index, 'min', e.target.value === '' ? null : Number(e.target.value))}
              disabled={includeUnknowns}
              placeholder="No minimum"
            />
          </div>
          <div>
            <label>Max</label>
            <input 
              type="number" 
              value={range.max === null ? '' : range.max} 
              onChange={e => updateRange(index, 'max', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="No maximum"
            />
          </div>
          {ranges.length > 1 && (
            <button onClick={() => removeRange(index)}>Remove</button>
          )}
        </div>
      ))}
      
      <button onClick={addRange}>Add Another Range</button>
    </div>
  );
}
```

### 4. Multiple Values Component

```typescript
// property-data-tester/src/components/criteria/MultipleValuesComponent.tsx

const MultipleValuesComponent: React.FC<BaseCriteriaProps> = (props) => {
  const [values, setValues] = useState<string[]>(
    Array.isArray(props.value) ? props.value.map(String) : []
  );
  const [inputValue, setInputValue] = useState<string>('');
  
  const addValue = () => {
    if (inputValue.trim() && !values.includes(inputValue.trim())) {
      const newValues = [...values, inputValue.trim()];
      setValues(newValues);
      props.onChange(props.name, newValues);
      setInputValue('');
    }
  };
  
  const removeValue = (index: number) => {
    const newValues = [...values];
    newValues.splice(index, 1);
    setValues(newValues);
    props.onChange(props.name, newValues);
  };
  
  return (
    <div className="multiple-values-criteria">
      <label>{props.name}</label>
      <p className="description">{props.description}</p>
      
      <div className="input-with-button">
        <input 
          type="text" 
          value={inputValue} 
          onChange={e => setInputValue(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && addValue()}
          placeholder="Enter a value and press Enter"
        />
        <button onClick={addValue}>Add</button>
      </div>
      
      <div className="values-list">
        {values.map((value, index) => (
          <div key={index} className="value-tag">
            <span>{value}</span>
            <button onClick={() => removeValue(index)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 5. Other Component Implementations

For brevity, the remaining component implementations (Multiple Values Beginning With, Single Value, PropertyType) follow similar patterns to the ones shown above. Each component should be tailored to the specific requirements of its criteria type.

## Timeline

1. **Frontend Components**: 3-4 days
   - Creating base component structure
   - Implementing specific components for each criteria type
   - Styling and UI refinement

2. **Integration and Testing**: 2-3 days
   - Integrating components into existing UI
   - Testing each criteria type
   - End-to-end testing

Total estimated time: 5-7 days

## Files to Create/Modify

### Backend Files:
1. `property-data-tester/server/services/CriteriaService.ts` (new)
2. `property-data-tester/server/controllers/CriteriaController.ts` (new)
3. `property-data-tester/server/routes.ts` (update)

### Frontend Files:
1. `property-data-tester/src/components/criteria/BaseCriteriaComponent.tsx` (new)
2. `property-data-tester/src/components/criteria/DateCriteriaComponent.tsx` (new)
3. `property-data-tester/src/components/criteria/BooleanCriteriaComponent.tsx` (new)
4. `property-data-tester/src/components/criteria/MultipleRangeComponent.tsx` (new)
5. `property-data-tester/src/components/criteria/MultipleValuesComponent.tsx` (new)
6. `property-data-tester/src/components/criteria/MultipleValuesBeginningWithComponent.tsx` (new)
7. `property-data-tester/src/components/criteria/SingleValueComponent.tsx` (new)
8. `property-data-tester/src/components/criteria/PropertyTypeComponent.tsx` (new)
9. `property-data-tester/src/components/CriteriaSelector.tsx` (new)
10. `property-data-tester/src/services/api.ts` (update)

## Additional Notes

### Important Considerations for Implementation

1. **Date Formatting**
   - Ensure dates are formatted as MM/DD/YYYY for the PropertyRadar API
   - For date ranges, use the format "from: MM/DD/YYYY to: MM/DD/YYYY"
   - For unknown dates, use "from: to: MM/DD/YYYY" format

2. **Range Handling**
   - Use `null` for unbounded ranges
   - For "Including Unknowns" types, set the minimum value to `null`

3. **Boolean Values**
   - Always use integers (1 or 0) for boolean values, not true/false

4. **PropertyType Special Format**
   - Always use the nested structure with "name": "PType" for property types

5. **UI/UX Considerations**
   - Provide clear labels and descriptions for each criteria
   - Use appropriate input types (date pickers for dates, number inputs for ranges, etc.)
   - Include validation to ensure correct data formats

### Existing Code Integration

When integrating with the existing codebase:

1. Ensure the PropertyRadarCriteriaMapper.ts file correctly handles all criteria types
2. Update the PropertyController.ts file to properly format criteria from the frontend
3. Test with real API calls to verify correct formatting

### Testing Strategy

1. **Unit Tests**
   - Test each component in isolation
   - Verify correct output format for each criteria type

2. **Integration Tests**
   - Test the complete flow from UI to API
   - Verify correct API request format

3. **Manual Testing**
   - Test each criteria type with various inputs
   - Verify correct behavior for edge cases (empty values, null ranges, etc.)