import React, { useState, useEffect } from 'react';
import { Form, Row, Col } from 'react-bootstrap';

// Value can be a single string (preset) or a tuple of two strings/nulls (range)
type DateRangeValue = [string] | [string | null, string | null];

interface DateRangeInputProps {
  value: DateRangeValue | undefined;
  onChange: (value: DateRangeValue | undefined) => void;
}

const DATE_PRESETS = [
  "Last 7 Days", "Last 30 Days", "Last 90 Days", 
  "Last 6 Months", "Last 12 Months", "This Month", 
  "This Quarter", "This Year", "Next 7 Days", 
  "Next 30 Days", "Next Quarter"
];

const DateRangeInput: React.FC<DateRangeInputProps> = ({ value, onChange }) => {
  // Determine initial selection type based on the value prop
  const getInitialSelectionType = (): 'preset' | 'range' => {
    if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'string' && DATE_PRESETS.includes(value[0])) {
      return 'preset';
    }
    // Default to 'range' if value is undefined, not a preset, or already a range
    return 'range';
  };

  const [dateSelectionType, setDateSelectionType] = useState<'preset' | 'range'>(getInitialSelectionType);

  // Update selection type if the value prop changes externally to be incompatible
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // getInitialSelectionType only depends on `value` (already in deps) and DATE_PRESETS (constant),
    // so we disable the warning here to avoid potential infinite loops if it were included.
    setDateSelectionType(getInitialSelectionType());
  }, [value]);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value;
    onChange(preset ? [preset] : undefined);
  };

  const handleDateChange = (index: 0 | 1, dateValue: string) => {
    // Ensure we are working with a range array, even if current value is preset or undefined
    const currentValue: [string | null, string | null] = 
      (Array.isArray(value) && value.length === 2 && dateSelectionType === 'range') 
      ? [value[0] ? String(value[0]) : null, value[1] ? String(value[1]) : null] 
      : [null, null];
      
    currentValue[index] = dateValue || null;
    
    // Only call onChange if at least one date is set
    if (currentValue[0] !== null || currentValue[1] !== null) {
      onChange(currentValue);
    } else {
      onChange(undefined); // Clear value if both dates are removed
    }
  };

  // Extract range values safely, defaulting to null if not a range or undefined
  const fromDateValue = (Array.isArray(value) && value.length === 2 && dateSelectionType === 'range' && value[0]) ? String(value[0]) : '';
  const toDateValue = (Array.isArray(value) && value.length === 2 && dateSelectionType === 'range' && value[1]) ? String(value[1]) : '';
  // Extract preset value safely
  const presetValue = (Array.isArray(value) && value.length === 1 && dateSelectionType === 'preset') ? String(value[0]) : '';


  return (
    <Form.Group className="mb-3">
      <div className="mb-3">
        <Form.Label>Date Selection Type:</Form.Label>
        <Form.Select
          value={dateSelectionType}
          onChange={(e) => {
            const newType = e.target.value as 'preset' | 'range';
            setDateSelectionType(newType);
            // Reset value when switching types to avoid invalid state
            onChange(undefined); 
          }}
        >
          <option value="preset">Preset Date Range</option>
          <option value="range">Custom Date Range</option>
        </Form.Select>
      </div>
      
      {dateSelectionType === 'preset' ? (
        <div className="mb-3">
          <Form.Label>Select a preset:</Form.Label>
          <Form.Select
            value={presetValue}
            onChange={handlePresetChange}
          >
            <option value="">Select a preset</option>
            {DATE_PRESETS.map(preset => (
              <option key={preset} value={preset}>{preset}</option>
            ))}
          </Form.Select>
        </div>
      ) : (
        <Row className="align-items-center">
          <Col>
            <Form.Label>From:</Form.Label>
            <Form.Control
              type="date"
              placeholder="From Date"
              value={fromDateValue}
              onChange={(e) => handleDateChange(0, e.target.value)}
            />
          </Col>
          <Col xs="auto" className="mt-4 pt-2">to</Col> {/* Adjusted alignment */}
          <Col>
            <Form.Label>To:</Form.Label>
            <Form.Control
              type="date"
              placeholder="To Date"
              value={toDateValue}
              onChange={(e) => handleDateChange(1, e.target.value)}
            />
          </Col>
        </Row>
      )}
    </Form.Group>
  );
};

export default DateRangeInput;