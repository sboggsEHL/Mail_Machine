import React from 'react';
import { Form } from 'react-bootstrap';
import { PROPERTY_TYPES } from '../../../constants/formConstants'; // Adjust path as needed

interface PropertyTypeInputProps {
  value: string[] | undefined;
  onChange: (value: string[] | undefined) => void;
}

const PropertyTypeInput: React.FC<PropertyTypeInputProps> = ({ value, onChange }) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, typeValue: string) => {
    const currentTypes = Array.isArray(value) ? [...value] : [];
    
    if (e.target.checked) {
      if (!currentTypes.includes(typeValue)) {
        currentTypes.push(typeValue);
      }
    } else {
      const index = currentTypes.indexOf(typeValue);
      if (index !== -1) {
        currentTypes.splice(index, 1);
      }
    }
    
    onChange(currentTypes.length > 0 ? currentTypes.sort() : undefined); // Keep sorted
  };

  return (
    <Form.Group className="mb-3">
      <Form.Label>Property Types</Form.Label>
      <div className="d-flex flex-wrap mt-2">
        {PROPERTY_TYPES.map(type => (
          <Form.Check
            key={type.value}
            type="checkbox"
            id={`property-type-selector-${type.value}`} // Simplified ID
            label={type.label}
            className="me-3 mb-2"
            checked={Array.isArray(value) && value.includes(type.value)}
            onChange={(e) => handleChange(e, type.value)}
          />
        ))}
      </div>
    </Form.Group>
  );
};

export default PropertyTypeInput;