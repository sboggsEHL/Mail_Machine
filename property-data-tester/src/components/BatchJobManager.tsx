import React, { useState } from 'react';
import { Container } from 'react-bootstrap';
import BatchJobList from './BatchJobList';
import BatchJobDetails from './BatchJobDetails';

/**
 * Component for managing batch jobs
 */
const BatchJobManager: React.FC = () => {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  /**
   * Handle job selection
   * @param jobId Job ID
   */
  const handleSelectJob = (jobId: number) => {
    setSelectedJobId(jobId);
  };

  /**
   * Handle back button click
   */
  const handleBack = () => {
    setSelectedJobId(null);
  };

  return (
    <Container className="mt-4">
      {selectedJobId ? (
        <BatchJobDetails jobId={selectedJobId} onBack={handleBack} />
      ) : (
        <BatchJobList onSelectJob={handleSelectJob} />
      )}
    </Container>
  );
};

export default BatchJobManager;