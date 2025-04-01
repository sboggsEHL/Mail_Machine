import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Spinner, Alert, ListGroup, Row, Col, ProgressBar } from 'react-bootstrap';
import { 
  getBatchJobById, 
  getJobLogs, 
  getJobProgress, 
  BatchJob, 
  BatchJobLog, 
  BatchJobProgress 
} from '../services/batchJob.service';

interface BatchJobDetailsProps {
  jobId: number;
  onBack: () => void;
}

/**
 * Component for displaying batch job details
 */
const BatchJobDetails: React.FC<BatchJobDetailsProps> = ({ jobId, onBack }) => {
  const [job, setJob] = useState<BatchJob | null>(null);
  const [logs, setLogs] = useState<BatchJobLog[]>([]);
  const [progress, setProgress] = useState<BatchJobProgress | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Load job details on component mount
  useEffect(() => {
    loadJobDetails();
    
    // Set up polling for active jobs
    const interval = setInterval(() => {
      if (job && (job.status === 'PENDING' || job.status === 'PROCESSING')) {
        loadJobDetails(false);
      }
    }, 5000);
    
    setRefreshInterval(interval);
    
    // Clean up interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [jobId, job?.status]);

  /**
   * Load job details from the API
   * @param showLoading Whether to show loading indicator
   */
  const loadJobDetails = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      // Load job, logs, and progress in parallel
      const [jobData, logsData, progressData] = await Promise.all([
        getBatchJobById(jobId),
        getJobLogs(jobId),
        getJobProgress(jobId)
      ]);
      
      if (jobData) {
        setJob(jobData);
      } else {
        setError(`Job with ID ${jobId} not found.`);
      }
      
      setLogs(logsData);
      setProgress(progressData);
    } catch (err) {
      setError('Error loading job details. Please try again.');
      console.error('Error loading job details:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  /**
   * Get status badge variant
   * @param status Job status
   * @returns Bootstrap badge variant
   */
  const getStatusBadgeVariant = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'PROCESSING':
        return 'primary';
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  /**
   * Format date string
   * @param dateString Date string
   * @returns Formatted date string
   */
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  /**
   * Get log level badge variant
   * @param level Log level
   * @returns Bootstrap badge variant
   */
  const getLogLevelBadgeVariant = (level: string): string => {
    switch (level) {
      case 'INFO':
        return 'info';
      case 'WARNING':
        return 'warning';
      case 'ERROR':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  /**
   * Format criteria as string
   * @param criteria Criteria object
   * @returns Formatted criteria string
   */
  const formatCriteria = (criteria: Record<string, any>): string => {
    try {
      return JSON.stringify(criteria, null, 2);
    } catch (err) {
      return 'Invalid criteria format';
    }
  };

  return (
    <div className="batch-job-details">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Batch Job Details</h2>
        <div>
          <Button 
            variant="outline-primary" 
            className="me-2" 
            onClick={() => loadJobDetails()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-1"
                />
                Loading...
              </>
            ) : (
              'Refresh'
            )}
          </Button>
          
          <Button 
            variant="outline-secondary" 
            onClick={onBack}
          >
            Back to List
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="danger">{error}</Alert>
      )}
      
      {loading && !error && (
        <div className="text-center p-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading job details...</p>
        </div>
      )}
      
      {!loading && !error && job && (
        <>
          <Card className="mb-4">
            <Card.Header>
              <h3>Job #{job.job_id}</h3>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <strong>Status:</strong>{' '}
                      <Badge bg={getStatusBadgeVariant(job.status)}>
                        {job.status}
                      </Badge>
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Created:</strong> {formatDate(job.created_at)}
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Updated:</strong> {formatDate(job.updated_at)}
                    </ListGroup.Item>
                    {job.completed_at && (
                      <ListGroup.Item>
                        <strong>Completed:</strong> {formatDate(job.completed_at)}
                      </ListGroup.Item>
                    )}
                    <ListGroup.Item>
                      <strong>Created By:</strong> {job.created_by}
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
                <Col md={6}>
                  {progress && (
                    <div className="mb-3">
                      <h4>Progress</h4>
                      <ProgressBar
                        variant={getStatusBadgeVariant(job.status)}
                        now={progress.percent_complete}
                        label={`${progress.percent_complete}%`}
                        className="mb-2"
                      />
                      <div className="d-flex justify-content-between">
                        <small className="text-muted">
                          {progress.processed_records} / {progress.total_records} records
                        </small>
                        <small className="text-muted">
                          {progress.success_count} successes, {progress.error_count} errors
                        </small>
                      </div>
                    </div>
                  )}
                  
                  <h4>Criteria</h4>
                  <pre className="bg-light p-2 rounded">
                    {formatCriteria(job.criteria)}
                  </pre>
                  
                  {job.error_details && (
                    <div className="mt-3">
                      <h4>Error Details</h4>
                      <Alert variant="danger">
                        {job.error_details}
                      </Alert>
                    </div>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Header>
              <h3>Job Logs</h3>
            </Card.Header>
            <Card.Body>
              {logs.length === 0 ? (
                <Alert variant="info">No logs available for this job.</Alert>
              ) : (
                <ListGroup variant="flush">
                  {logs.map((log) => (
                    <ListGroup.Item key={log.log_id} className="d-flex">
                      <div className="me-3">
                        <Badge bg={getLogLevelBadgeVariant(log.level)}>
                          {log.level}
                        </Badge>
                      </div>
                      <div className="me-3 text-muted">
                        {formatDate(log.timestamp)}
                      </div>
                      <div>
                        {log.message}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
};

export default BatchJobDetails;