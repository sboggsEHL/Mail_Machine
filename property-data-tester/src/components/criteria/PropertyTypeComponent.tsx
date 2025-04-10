import React, { useState, useEffect } from 'react';
import { BaseCriteriaProps } from './BaseCriteriaComponent';

/**
 * Component for property type criteria
 * This is a special format that combines PType and AdvancedPropertyTypes
 */
export const PropertyTypeComponent: React.FC<BaseCriteriaProps> = (props) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  // Common property types
  const propertyTypes = [
    { value: 'SFR', label: 'Single Family Residence' },
    { value: 'Condo', label: 'Condominium' },
    { value: 'Duplex', label: 'Duplex' },
    { value: 'Triplex', label: 'Triplex' },
    { value: 'Fourplex', label: 'Fourplex' },
    { value: 'Apartment', label: 'Apartment Building' },
    { value: 'Mobile', label: 'Mobile Home' },
    { value: 'Commercial', label: 'Commercial Property' },
    { value: 'Land', label: 'Vacant Land' },
    { value: 'Farm', label: 'Farm/Agricultural' },
    { value: 'Industrial', label: 'Industrial' },
    { value: 'Mixed', label: 'Mixed Use' }
  ];
  
  // Initialize from props.value if available
  useEffect(() => {
    if (Array.isArray(props.value) && props.value.length > 0) {
      // Check if it's in the special PropertyType format
      if (typeof props.value[0] === 'object' && props.value[0].name === 'PType') {
        setSelectedTypes(Array.isArray(props.value[0].value) ? [...props.value[0].value] : []);
      }
      // Otherwise, try to use the value directly
      else if (Array.isArray(props.value)) {
        setSelectedTypes([...props.value]);
      }
    }
  }, [props.value]);
  
  // Handle change and call parent onChange
  const handleChange = (type: string, checked: boolean) => {
    let newTypes: string[];
    
    if (checked) {
      newTypes = [...selectedTypes, type];
    } else {
      newTypes = selectedTypes.filter(t => t !== type);
    }
    
    setSelectedTypes(newTypes);
    
    // Format in the special PropertyType format
    props.onChange(props.name, [
      {
        name: 'PType',
        value: newTypes
      }
    ]);
  };
  
  return (
    <div className="property-type-criteria criteria-component">
      <h4>{props.name}</h4>
      <p className="description">{props.description}</p>
      
      <div className="property-types-list">
        {propertyTypes.map((type) => (
          <div key={type.value} className="form-check">
            <input 
              type="checkbox" 
              id={`${props.name}-${type.value}`}
              className="form-check-input"
              checked={selectedTypes.includes(type.value)} 
              onChange={(e) => handleChange(type.value, e.target.checked)} 
            />
            <label 
              htmlFor={`${props.name}-${type.value}`}
              className="form-check-label"
            >
              {type.label}
            </label>
          </div>
        ))}
      </div>
      
      {selectedTypes.length === 0 && (
        <p className="text-warning mt-2">
          <small>
            <i className="bi bi-exclamation-triangle me-1"></i>
            No property types selected. This will match all property types.
          </small>
        </p>
      )}
    </div>
  );
};