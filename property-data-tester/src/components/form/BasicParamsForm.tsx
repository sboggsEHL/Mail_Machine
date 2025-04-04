import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';

interface BasicParamsFormProps {
  limit: number;
  start: number;
  purchase: number; // The state holds a number, but Form.Select value is string. We'll cast here.
  onParamChange: (field: 'limit' | 'start' | 'purchase', value: string) => void;
}

const BasicParamsForm: React.FC<BasicParamsFormProps> = ({
  limit,
  start,
  purchase,
  onParamChange
}) => {
  return (
    <>
      {/* Basic Request Parameters */}
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Limit (number of properties)</Form.Label>
            <Form.Control
              type="number"
              min="1"
              max="50000"
              value={limit}
              onChange={(e) => onParamChange('limit', e.target.value)}
            />
            <Form.Text className="text-muted">
              You can request up to 50,000 properties. Large requests (over 1000) will be processed in the background.
            </Form.Text>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Start Index</Form.Label>
            <Form.Control
              type="number"
              min="1"
              value={start}
              onChange={(e) => onParamChange('start', e.target.value)}
            />
            <Form.Text className="text-muted">
              Starting position in results
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>
      
      <Form.Group className="mb-3">
        <Form.Label>Purchase</Form.Label>
        <Form.Select
          value={String(purchase)} // Cast number to string for Form.Select value
          onChange={(e) => onParamChange('purchase', e.target.value)}
        >
          <option value="0">0 - Preview (No Charge)</option>
          <option value="1">1 - Purchase Records</option>
        </Form.Select>
        <Form.Text className="text-muted">
          Set to 0 for free preview or 1 to purchase records
        </Form.Text>
      </Form.Group>
    </>
  );
};

export default BasicParamsForm;