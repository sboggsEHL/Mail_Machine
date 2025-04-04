import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';

type RangeValue = [number | null, number | null];

interface RangeInputProps {
  value: RangeValue | undefined;
  onChange: (value: RangeValue | undefined) => void;
}

const RangeInput: React.FC<RangeInputProps> = ({ value, onChange }) => {
  const currentMin = Array.isArray(value) ? value[0] : null;
  const currentMax = Array.isArray(value) ? value[1] : null;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = e.target.value === '' ? null : Number(e.target.value);
    const newValue: RangeValue = [newMin, currentMax];
    onChange(newValue[0] !== null || newValue[1] !== null ? newValue : undefined);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = e.target.value === '' ? null : Number(e.target.value);
    const newValue: RangeValue = [currentMin, newMax];
    onChange(newValue[0] !== null || newValue[1] !== null ? newValue : undefined);
  };

  return (
    <Form.Group className="mb-3">
      <Row className="align-items-center">
        <Col>
          <Form.Control
            type="number"
            placeholder="Min"
            value={currentMin ?? ''} // Use empty string if null/undefined for input value
            onChange={handleMinChange}
          />
        </Col>
        <Col xs="auto">to</Col>
        <Col>
          <Form.Control
            type="number"
            placeholder="Max"
            value={currentMax ?? ''} // Use empty string if null/undefined for input value
            onChange={handleMaxChange}
          />
        </Col>
      </Row>
    </Form.Group>
  );
};

export default RangeInput;