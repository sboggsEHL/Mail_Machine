import React, { useState, useEffect, ChangeEvent } from 'react';
import { Modal } from 'react-bootstrap';
import { Card, Badge, Button, Spinner, Alert, ListGroup, Row, Col, ProgressBar, Form, Table } from 'react-bootstrap';
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

  // DNM CSV Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showDnmModal, setShowDnmModal] = useState(false);
  const [dnmPreviewData, setDnmPreviewData] = useState<any>(null);

  // DNM Registry Check state (separate from CSV preview)
  const [checkingDnm, setCheckingDnm] = useState(false);
  const [dnmRecords, setDnmRecords] = useState<any[]>([]);
  const [showDnmRegistryModal, setShowDnmRegistryModal] = useState(false);
  const [dnmError, setDnmError] = useState<string | null>(null);
  const [excludedDnmRadarIds, setExcludedDnmRadarIds] = useState<string[]>([]);

  // Download CSV function with DNM exclusions
  const downloadCsv = async (jobId: number, remailIds?: string[]) => {
    try {
      const response = await fetch(`/api/batch-jobs/${jobId}/leads-csv`, {
        method: 'GET',
        headers: { 'Accept': 'text/csv' }
      });
      if (!response.ok) {
        alert('Failed to download CSV.');
        return;
      }
      
      const csvText = await response.text();
      
      // If there are excluded DNM records, filter them out
      let filteredCsvText = csvText;
      if (excludedDnmRadarIds.length > 0) {
        const lines = csvText.split('\n');
        const header = lines[0];
        const dataLines = lines.slice(1);
        
        // Filter out rows that contain excluded radar IDs
        const filteredDataLines = dataLines.filter(line => {
          const columns = line.split(',');
          // Find radar_id column (assuming it's in the CSV)
          // You might need to adjust this based on your CSV structure
          const radarIdColumn = columns.find(col => 
            excludedDnmRadarIds.some(excludedId => 
              col.includes(excludedId) || col.replace(/"/g, '') === excludedId
            )
          );
          return !radarIdColumn;
        });
        
        filteredCsvText = [header, ...filteredDataLines].join('\n');
        
        console.log(`Filtered out ${dataLines.length - filteredDataLines.length} DNM records from CSV`);
      }
      
      const blob = new Blob([filteredCsvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_job_${jobId}_leads${excludedDnmRadarIds.length > 0 ? '_dnm_filtered' : ''}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading CSV.');
      console.error(err);
    }
  };

  // DNM CSV Preview Modal component
  const DnmCsvPreviewModal = ({
    show,
    onHide,
    dnmLeads,
    includedLeadsCount,
    onConfirmRemail,
    missingLeadsCount,
    totalRadarIds
  }: {
    show: boolean;
    onHide: () => void;
    dnmLeads: any[];
    includedLeadsCount: number;
    onConfirmRemail: (ids: string[]) => void;
    missingLeadsCount?: number;
    totalRadarIds?: number;
  }) => {
    const [selected, setSelected] = useState<string[]>([]);
    useEffect(() => {
      setSelected([]);
    }, [show]);
    return (
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>DNM Check</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            <b>{totalRadarIds ?? includedLeadsCount + (dnmLeads?.length || 0) + (missingLeadsCount || 0)}</b> total records in original list.<br />
            <b>{includedLeadsCount}</b> leads will be included in the CSV.<br />
            <b>{dnmLeads.length}</b> leads are on the DNM list and will be excluded by default.<br />
            <b>{missingLeadsCount ?? 0}</b> records were not found in the property database and will not be included.
          </p>
          {dnmLeads.length > 0 && (
            <>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <ListGroup>
                  {dnmLeads.map((lead: any) => (
                    <ListGroup.Item key={lead.radar_id}>
                      <Form.Check
                        type="checkbox"
                        checked={selected.includes(lead.radar_id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelected([...selected, lead.radar_id]);
                          } else {
                            setSelected(selected.filter(id => id !== lead.radar_id));
                          }
                        }}
                        label={
                          <>
                            <b>Radar ID:</b> {lead.radar_id}
                            {lead.blocked_at && (
                              <> | <b>Blocked At:</b> {lead.blocked_at}</>
                            )}
                            {lead.address && (
                              <> | <b>Address:</b> {lead.address}, {lead.city}, {lead.state} {lead.zip}</>
                            )}
                          </>
                        }
                      />
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
              <div className="mt-3">
                <Button
                  variant="primary"
                  onClick={() => onConfirmRemail(selected)}
                  disabled={selected.length === 0}
                >
                  Include Selected in CSV (Remail)
                </Button>
                <Button
                  variant="secondary"
                  className="ms-2"
                  onClick={() => onConfirmRemail([])}
                >
                  Continue Without DNM
                </Button>
              </div>
            </>
          )}
          {/* If no DNM leads, always show Continue button */}
          {dnmLeads.length === 0 && (
            <div className="mt-3">
              <Button
                variant="primary"
                onClick={() => onConfirmRemail([])}
              >
                Continue to Download
              </Button>
            </div>
          )}
        </Modal.Body>
      </Modal>
    );
  };

  // DNM Registry check function
  const checkDnmRegistry = async () => {
    if (!job || !job.criteria || !Array.isArray(job.criteria.RadarID)) {
      setDnmError('No radar IDs found in this batch job');
      return;
    }

    try {
      setCheckingDnm(true);
      setDnmError(null);
      setDnmRecords([]);

      const radarIds = job.criteria.RadarID;

      // Check DNM registry
      const response = await fetch('/api/dnm/check-with-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ radarIds })
      });

      if (!response.ok) {
        throw new Error('Failed to check DNM registry');
      }

      const result = await response.json();
      
      if (result.success) {
        setDnmRecords(result.dnmRecords || []);
        setShowDnmRegistryModal(true);
      } else {
        setDnmError(result.error || 'Failed to check DNM registry');
      }

      setCheckingDnm(false);
    } catch (err) {
      setDnmError('Failed to check DNM registry. Please try again.');
      console.error(err);
      setCheckingDnm(false);
    }
  };

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
        {/* DEBUG: Show job status and campaign_id for troubleshooting */}
        {job && (
          <div style={{ color: 'red', fontWeight: 'bold' }}>
            Status: {job.status} | Campaign ID: {String(job.campaign_id)}
          </div>
        )}
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

          {/* Download CSV Button - only enabled if job is completed and has RadarIDs */}
          {job && job.status === 'COMPLETED' && job.criteria && Array.isArray(job.criteria.RadarID) && job.criteria.RadarID.length > 0 && (
            <>
              <Button
                variant="warning"
                onClick={checkDnmRegistry}
                disabled={checkingDnm}
                className="me-2"
              >
                {checkingDnm ? 'Checking DNM...' : 'Check DNM Registry'}
              </Button>
              <Button
                variant="info"
                className="me-2"
                onClick={async () => {
                  setPreviewLoading(true);
                  setPreviewError(null);
                  setShowDnmModal(false);
                  setDnmPreviewData(null);
                  try {
                    const response = await fetch(`/api/batch-jobs/${job.job_id}/leads-csv-preview`, {
                      method: 'GET',
                      headers: { 'Accept': 'application/json' }
                    });
                    if (!response.ok) {
                      setPreviewError('Failed to check DNM status.');
                      setPreviewLoading(false);
                      return;
                    }
                    const data = await response.json();
                    setPreviewLoading(false);
                    setDnmPreviewData(data);
                    setDnmPreviewData(data);
                    setShowDnmModal(true);
                  } catch (err) {
                    setPreviewError('Error checking DNM status.');
                    setPreviewLoading(false);
                  }
                }}
                title="Download all leads as CSV for this batch job"
              >
                Download CSV
                {excludedDnmRadarIds.length > 0 && (
                  <Badge bg="warning" className="ms-1">
                    -{excludedDnmRadarIds.length} DNM
                  </Badge>
                )}
              </Button>
              {/* DNM Modal */}
              <DnmCsvPreviewModal
                show={showDnmModal}
                onHide={() => setShowDnmModal(false)}
                dnmLeads={dnmPreviewData?.dnmLeads || []}
                includedLeadsCount={dnmPreviewData?.includedLeadsCount || 0}
                onConfirmRemail={ids => {
                  setShowDnmModal(false);
                  // Optionally: pass remail list to backend, or just download as normal
                      downloadCsv(job.job_id!, ids);
                }}
              />
              {/* Loading/Checking UI */}
              {previewLoading && (
                <Spinner animation="border" role="status" className="ms-2">
                  <span className="visually-hidden">Checking DNM...</span>
                </Spinner>
              )}
              {previewError && (
                <Alert variant="danger" className="mt-2">{previewError}</Alert>
              )}
              {dnmError && (
                <Alert variant="danger" className="mt-2">{dnmError}</Alert>
              )}
            </>
          )}

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

      {/* DNM Registry Check Modal */}
      <Modal show={showDnmRegistryModal} onHide={() => setShowDnmRegistryModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>DNM Registry Check Results - Batch Job #{job?.job_id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {dnmRecords.length === 0 ? (
            <Alert variant="success">
              <h5>✅ No DNM Records Found</h5>
              <p>None of the properties in this batch job are currently in the Do Not Mail registry.</p>
            </Alert>
          ) : (
            <>
              <Alert variant="warning">
                <h5>⚠️ {dnmRecords.length} Properties Found in DNM Registry</h5>
                <p>The following properties from this batch job are currently on the Do Not Mail list and should not be mailed to:</p>
              </Alert>
              
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <Table striped bordered hover size="sm">
                  <thead className="table-dark">
                    <tr>
                      <th>Radar ID</th>
                      <th>Name</th>
                      <th>State</th>
                      <th>Added to DNM</th>
                      <th>Originally Created</th>
                      <th>Last Mailed</th>
                      <th>Reason</th>
                      <th>Category</th>
                      <th>Blocked By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dnmRecords.map((record, index) => (
                      <tr key={index}>
                        <td>
                          <code>{record.radar_id}</code>
                        </td>
                        <td>
                          {record.first_name} {record.last_name}
                        </td>
                        <td>
                          <Badge bg="secondary">{record.state}</Badge>
                        </td>
                        <td>{record.blocked_at}</td>
                        <td>{record.created_at}</td>
                        <td>
                          <Badge bg={record.last_mailed === 'Never' ? 'secondary' : 'info'}>
                            {record.last_mailed}
                          </Badge>
                        </td>
                        <td>{record.reason}</td>
                        <td>
                          <Badge bg="warning">{record.reason_category}</Badge>
                        </td>
                        <td>{record.blocked_by}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => {
                              // Add to excluded radar IDs to filter from CSV download
                              setExcludedDnmRadarIds(prev => {
                                if (!prev.includes(record.radar_id)) {
                                  return [...prev, record.radar_id];
                                }
                                return prev;
                              });
                            }}
                            disabled={excludedDnmRadarIds.includes(record.radar_id)}
                          >
                            {excludedDnmRadarIds.includes(record.radar_id) ? 'Excluded' : 'Exclude'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              <Alert variant="info" className="mt-3">
                <strong>Note:</strong> You can exclude individual DNM records or all DNM records from the CSV download. 
                Excluded records will be filtered out when you click "Download CSV".
                {excludedDnmRadarIds.length > 0 && (
                  <div className="mt-2">
                    <Badge bg="warning">{excludedDnmRadarIds.length} record(s) will be excluded from CSV download</Badge>
                  </div>
                )}
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDnmRegistryModal(false)}>
            Close
          </Button>
          {dnmRecords.length > 0 && (
            <>
              <Button
                variant="warning"
                onClick={() => {
                  // Exclude all DNM records
                  const dnmRadarIds = dnmRecords.map(record => record.radar_id);
                  setExcludedDnmRadarIds(prev => {
                    const newExcluded = [...prev];
                    dnmRadarIds.forEach(id => {
                      if (!newExcluded.includes(id)) {
                        newExcluded.push(id);
                      }
                    });
                    return newExcluded;
                  });
                }}
              >
                Exclude All DNM Records
              </Button>
              {excludedDnmRadarIds.length > 0 && (
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    // Clear all exclusions
                    setExcludedDnmRadarIds([]);
                  }}
                >
                  Clear Exclusions
                </Button>
              )}
            </>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BatchJobDetails;
