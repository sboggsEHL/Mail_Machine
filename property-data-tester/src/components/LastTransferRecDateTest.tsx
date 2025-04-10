import React, { useState } from 'react';
import { DateCriteriaComponent } from './criteria/DateCriteriaComponent';

/**
 * Test component for LastTransferRecDate
 */
export const LastTransferRecDateTest: React.FC = () => {
  const [value, setValue] = useState<any>([]);
  
  const handleChange = (name: string, newValue: any) => {
    console.log(`${name} changed to:`, newValue);
    setValue(newValue);
  };
  
  return (
    <div className="container mt-4">
      <h1>LastTransferRecDate Test</h1>
      <p className="lead">
        This is a test component to verify that LastTransferRecDate is rendered as a date picker.
      </p>
      
      <div className="card">
        <div className="card-body">
          <DateCriteriaComponent
            name="LastTransferRecDate"
            description="The date the last property transfer was recorded"
            criteriaType="Relative Date"
            value={value}
            onChange={handleChange}
            includeUnknowns={false}
          />
        </div>
      </div>
      
      <div className="card mt-4">
        <div className="card-header">
          <h5 className="mb-0">Current Value</h5>
        </div>
        <div className="card-body">
          <pre className="bg-light p-3 rounded">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};