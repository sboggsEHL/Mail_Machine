import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { Table, Badge, Button, Spinner, Alert, Form, InputGroup } from 'react-bootstrap';
import { getBatchJobs, BatchJob } from '../services/batchJob.service';

interface BatchJobListProps {
  onSelectJob: (jobId: number) => void;
}

/**
 * Component for displaying a list of batch jobs
 */
const BatchJobList: React.FC<BatchJobListProps> = ({ onSelectJob }) => {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [radarIdSearch, setRadarIdSearch] = useState<string>('');
  const [filteredJobs, setFilteredJobs] = useState<BatchJob[]>([]);

  // Load jobs on component mount and when status filter changes
  // loadJobs is now memoized with useCallback to satisfy ESLint
  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const jobsData = await getBatchJobs(statusFilter);
      setJobs(jobsData);
    } catch (err) {
      setError('Error loading batch jobs. Please try again.');
      console.error('Error loading batch jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Filter jobs when radarIdSearch or jobs change
  useEffect(() => {
    if (!radarIdSearch) {
      setFilteredJobs(jobs);
      return;
    }

    const filtered = jobs.filter(job => {
      // Check if job has RadarID criteria
      if (job.criteria && job.criteria.RadarID && Array.isArray(job.criteria.RadarID)) {
        // Check if any RadarID includes the search term
        return job.criteria.RadarID.some(id =>
          id.toLowerCase().includes(radarIdSearch.toLowerCase())
        );
      }
      return false;
    });

    setFilteredJobs(filtered);
  }, [jobs, radarIdSearch]);


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
   * Calculate progress percentage
   * @param job Batch job
   * @returns Progress percentage
   */
  const calculateProgress = (job: BatchJob): number => {
    if (!job.total_records || job.total_records === 0) return 0;
    
    const processed = job.processed_records || 0;
    return Math.floor((processed / job.total_records) * 100);
  };

  return (
    <div className="batch-job-list">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Batch Jobs</h2>
        <div>
          <Button
            variant="outline-primary"
            className="me-2"
            onClick={loadJobs}
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
          
          <select
            className="form-select d-inline-block w-auto"
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value || undefined)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      <div className="mb-3">
        <InputGroup>
          <InputGroup.Text>Search RadarID</InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Enter RadarID to find associated batch job..."
            value={radarIdSearch}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setRadarIdSearch(e.target.value)}
          />
          {radarIdSearch && (
            <Button
              variant="outline-secondary"
              onClick={() => setRadarIdSearch('')}
            >
              Clear
            </Button>
          )}
        </InputGroup>
        {radarIdSearch && (
          <div className="mt-2">
            <small className="text-muted">
              {filteredJobs.length === 0
                ? 'No batch jobs found with this RadarID'
                : `Found ${filteredJobs.length} batch job(s) containing this RadarID`}
            </small>
          </div>
        )}
      </div>
      
      {error && (
        <Alert variant="danger">{error}</Alert>
      )}
      
      {loading && !error && (
        <div className="text-center p-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading batch jobs...</p>
        </div>
      )}
      
      {!loading && !error && !radarIdSearch && jobs.length === 0 && (
        <Alert variant="info">
          No batch jobs found. Create a new batch job by searching for properties with the "Process in Background" option.
        </Alert>
      )}
      
      {!loading && !error && (radarIdSearch ? filteredJobs.length > 0 : jobs.length > 0) && (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Source List</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(radarIdSearch ? filteredJobs : jobs).map((job) => (
              <tr key={job.job_id}>
                <td>{job.job_id}</td>
                <td>
                  <Badge bg={getStatusBadgeVariant(job.status)}>
                    {job.status}
                  </Badge>
                </td>
                <td>
                  <div className="progress">
                    <div 
                      className={`progress-bar bg-${getStatusBadgeVariant(job.status)}`}
                      role="progressbar"
                      style={{ width: `${calculateProgress(job)}%` }}
                      aria-valuenow={calculateProgress(job)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      {calculateProgress(job)}%
                    </div>
                  </div>
                  <small className="text-muted">
                    {job.processed_records || 0} / {job.total_records || 0} records
                  </small>
                </td>
                <td>
                  {job.criteria && job.criteria.sourceListId ? (
                    <Badge bg="info">List #{job.criteria.sourceListId}</Badge>
                  ) : (
                    <span className="text-muted">N/A</span>
                  )}
                </td>
                <td>{formatDate(job.created_at)}</td>
                <td>{formatDate(job.updated_at)}</td>
                <td>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onSelectJob(job.job_id!)}
                  >
                    View Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default BatchJobList;
