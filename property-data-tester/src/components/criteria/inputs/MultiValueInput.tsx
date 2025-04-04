import React from 'react';
import { Form } from 'react-bootstrap';
import { CriterionDefinition } from '../../../../shared/types/criteria'; // Adjust path as needed

interface MultiValueInputProps {
  value: string[] | undefined;
  definition: CriterionDefinition; // Needed for example text
  onChange: (value: string[] | undefined) => void;
}

const MultiValueInput: React.FC<MultiValueInputProps> = ({ value, definition, onChange }) => {
  const exampleText = Array.isArray(definition.example?.value) 
    ? definition.example.value.join(', ') 
    : 'value1, value2';

  return (
    <Form.Group className="mb-3">
      <Form.Control
        type="text"
        placeholder="Enter comma-separated values"
        value={Array.isArray(value) ? value.join(', ') : ''}
        onChange={(e) => {
          const textValue = e.target.value;
          // Split by comma, trim whitespace, and filter out empty strings
          const arrayValue = textValue
            ? textValue.split(',').map(item => item.trim()).filter(item => item !== '')
            : [];
          onChange(arrayValue.length > 0 ? arrayValue : undefined);
        }}
      />
      <Form.Text className="text-muted">
        Example: {exampleText}
      </Form.Text>
    </Form.Group>
  );
};

export default MultiValueInput;