import React, { useState, useEffect, ChangeEvent } from 'react';
import { Card, Badge, Button, Spinner, Alert, ListGroup, Row, Col, ProgressBar, Form } from 'react-bootstrap';
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
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [radarIdSearch, setRadarIdSearch] = useState<string>('');

  // Load job details on component mount
  useEffect(() => {
    let isMounted = true;
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const loadInitialData = async () => {
      if (!isMounted) return;
      
      try {
        // Load initial job data
        await loadJobDetails();
        
        // Get the job status
        const initialJobData = await getBatchJobById(jobId);
        if (!isMounted) return;
        
        console.log(`Initial job status: ${initialJobData?.status}`);
        
        // Only set up polling for active jobs
        if (initialJobData && (initialJobData.status === 'PENDING' || initialJobData.status === 'PROCESSING')) {
          console.log('Setting up polling for active job');
          
          // Set up polling for active jobs
          pollingInterval = setInterval(async () => {
            if (!isMounted || isUpdating) return;
            
            try {
              // Get the current job status
              const currentJobData = await getBatchJobById(jobId);
              if (!isMounted) return;
              
              console.log(`Current job status: ${currentJobData?.status}`);
              
              if (currentJobData && (currentJobData.status === 'PENDING' || currentJobData.status === 'PROCESSING')) {
                // Job is still active, update the details
                await loadJobDetails(false);
              } else if (currentJobData && (currentJobData.status === 'COMPLETED' || currentJobData.status === 'FAILED')) {
                // Job is complete or failed, stop polling
                console.log('Job completed or failed, stopping polling');
                
                if (pollingInterval) {
                  clearInterval(pollingInterval);
                  pollingInterval = null;
                }
                
                // Update the refresh interval state
                if (refreshInterval) {
                  clearInterval(refreshInterval);
                  setRefreshInterval(null);
                }
                
                // Load the final state
                await loadJobDetails(false);
              }
            } catch (error) {
              console.error('Error in polling interval:', error);
            }
          }, 5000);
          
          // Store the interval in state
          if (isMounted) {
            setRefreshInterval(pollingInterval);
          }
        } else {
          console.log('Job already completed or failed, not setting up polling');
        }
      } catch (error) {
        console.error('Error in loadInitialData:', error);
      }
    };
    
    loadInitialData();
    
    // Clean up interval on unmount
    return () => {
      console.log('Component unmounting, cleaning up intervals');
      isMounted = false;
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]); // Dependencies loadJobDetails, isUpdating, refreshInterval omitted for now

  /**
   * Load job details from the API
   * @param showLoading Whether to show loading indicator
   */
  const loadJobDetails = async (showLoading = true) => {
    // Prevent multiple simultaneous API requests
    if (isUpdating) {
      console.log('Already updating, skipping loadJobDetails');
      return;
    }
    
    console.log(`Loading job details (showLoading=${showLoading})`);
    
    try {
      setIsUpdating(true);
      
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
      
      console.log(`Loaded job data: status=${jobData?.status}`);
      
      if (jobData) {
        // Only update if the status has changed or this is the first load
        if (!job || job.status !== jobData.status) {
          console.log(`Updating job state: ${job?.status} -> ${jobData.status}`);
          setJob(jobData);
          
          // If the job is complete or failed, stop polling
          if (jobData.status === 'COMPLETED' || jobData.status === 'FAILED') {
            console.log('Job completed or failed, clearing refresh interval');
            if (refreshInterval) {
              clearInterval(refreshInterval);
              setRefreshInterval(null);
            }
          }
        } else {
          console.log(`Job status unchanged (${jobData.status}), not updating state`);
        }
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
      
      // Add a small delay before allowing another update
      setTimeout(() => {
        console.log('Resetting isUpdating flag');
        setIsUpdating(false);
      }, 2000); // Increased delay to 2 seconds
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
            disabled={loading || !!(job && (job.status === 'COMPLETED' || job.status === 'FAILED'))}
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
                      {' '}
                      {refreshInterval ? (
                        <Badge bg="info" className="ms-2">Auto-refreshing</Badge>
                      ) : (
                        job.status !== 'COMPLETED' && job.status !== 'FAILED' ? (
                          <Badge bg="warning" className="ms-2">Refresh paused</Badge>
                        ) : (
                          <Badge bg="secondary" className="ms-2">Completed</Badge>
                        )
                      )}
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
          
          {/* Display RadarIDs if available */}
          {job.criteria && job.criteria.RadarID && Array.isArray(job.criteria.RadarID) && (
            <Card className="mb-4">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h3>RadarIDs ({job.criteria.RadarID.length})</h3>
                <div className="d-flex align-items-center">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="me-2"
                    onClick={() => {
                      const radarIds = job.criteria.RadarID.join('\n');
                      navigator.clipboard.writeText(radarIds);
                      alert('All RadarIDs copied to clipboard!');
                    }}
                  >
                    Copy All
                  </Button>
                  <Form.Control
                    type="text"
                    placeholder="Search RadarIDs..."
                    value={radarIdSearch}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setRadarIdSearch(e.target.value)}
                    className="me-2"
                    style={{ width: '250px' }}
                  />
                  {radarIdSearch && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setRadarIdSearch('')}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </Card.Header>
              <Card.Body>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <ListGroup variant="flush">
                    {job.criteria.RadarID
                      .filter((radarId: string) =>
                        radarId.toLowerCase().includes(radarIdSearch.toLowerCase())
                      )
                      .map((radarId: string, index: number) => (
                        <ListGroup.Item key={radarId} className="d-flex justify-content-between align-items-center">
                          <span>{radarId}</span>
                          <Badge bg="secondary">{
                            job.criteria.RadarID.indexOf(radarId) + 1
                          }</Badge>
                        </ListGroup.Item>
                      ))}
                  </ListGroup>
                  
                  {radarIdSearch && job.criteria.RadarID.filter((radarId: string) =>
                    radarId.toLowerCase().includes(radarIdSearch.toLowerCase())
                  ).length === 0 && (
                    <Alert variant="info" className="mt-3">
                      No RadarIDs match your search.
                    </Alert>
                  )}
                </div>
              </Card.Body>
            </Card>
          )}

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
