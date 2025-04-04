import React from 'react';
import { Form } from 'react-bootstrap';

interface SingleValueInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

const SingleValueInput: React.FC<SingleValueInputProps> = ({ value, onChange }) => {
  return (
    <Form.Group className="mb-3">
      <Form.Control
        type="text"
        placeholder="Enter value"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </Form.Group>
  );
};

export default SingleValueInput;