import React from 'react';
import { Form } from 'react-bootstrap';

interface BooleanInputProps {
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
}

const BooleanInput: React.FC<BooleanInputProps> = ({ value, onChange }) => {
  return (
    <Form.Group className="mb-3">
      <Form.Select
        value={value === undefined ? '' : value ? '1' : '0'}
        onChange={(e) => {
          const selectedValue = e.target.value;
          onChange(selectedValue === '' ? undefined : selectedValue === '1');
        }}
      >
        <option value="">Any</option>
        <option value="1">Yes</option>
        <option value="0">No</option>
      </Form.Select>
    </Form.Group>
  );
};

export default BooleanInput;