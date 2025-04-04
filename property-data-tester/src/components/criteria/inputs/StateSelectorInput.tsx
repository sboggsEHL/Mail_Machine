import React from 'react';
import { Form } from 'react-bootstrap';
import { US_STATES } from '../../../constants/formConstants'; // Corrected path

interface StateSelectorInputProps {
  value: string[] | undefined;
  onChange: (value: string[] | undefined) => void;
}

const StateSelectorInput: React.FC<StateSelectorInputProps> = ({ value, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, state: string) => {
    const currentStates = Array.isArray(value) ? [...value] : [];
    
    if (e.target.checked) {
      if (!currentStates.includes(state)) {
        currentStates.push(state);
      }
    } else {
      const index = currentStates.indexOf(state);
      if (index !== -1) {
        currentStates.splice(index, 1);
      }
    }
    
    onChange(currentStates.length > 0 ? currentStates.sort() : undefined); // Keep states sorted
  };

  return (
    <Form.Group className="mb-3">
      <Form.Label>Select States</Form.Label>
      <div className="d-flex flex-wrap mt-2 border p-2 rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {US_STATES.map((state: string) => (
          <Form.Check
            key={state}
            type="checkbox"
            id={`state-selector-${state}`} // Simplified ID
            label={state}
            className="me-3 mb-2"
            style={{ minWidth: '60px' }}
            checked={Array.isArray(value) && value.includes(state)}
            onChange={(e) => handleChange(e, state)}
          />
        ))}
      </div>
      <Form.Text className="text-muted mt-2">
        Select one or more states
      </Form.Text>
    </Form.Group>
  );
};

export default StateSelectorInput;