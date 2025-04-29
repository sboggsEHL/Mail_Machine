import React, { useState, useEffect } from 'react';
import { Table, Pagination, Button, Spinner, Alert, Form, InputGroup, Row, Col, Dropdown } from 'react-bootstrap';
import { fetchRecipients, getRecipientsDownloadUrl, Recipient, Pagination as PaginationType } from '../../services/api';
import { Search } from 'react-bootstrap-icons';

interface RecipientsProps {
  campaignId: number;
}

/**
 * Component for displaying campaign recipients with pagination
 */
export const Recipients: React.FC<RecipientsProps> = ({ campaignId }) => {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchType, setSearchType] = useState<string>('all');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Load recipients data
  const loadRecipients = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchRecipients(
        campaignId, 
        page, 
        pagination.limit, 
        debouncedSearchTerm, 
        searchType
      );

      if (!response.success) {
        setError(response.error || 'Failed to fetch recipients');
        return;
      }

      setRecipients(response.recipients);
      setPagination(response.pagination);
    } catch (err) {
      setError('Error loading recipients: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Load recipients on component mount, when page changes, or when search changes
  useEffect(() => {
    // Reset to page 1 when search changes
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    } else {
      loadRecipients(1);
    }
  }, [campaignId, debouncedSearchTerm, searchType]);

  // Load recipients when page changes
  useEffect(() => {
    loadRecipients(pagination.page);
  }, [campaignId, pagination.page]);

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination(prev => ({ ...prev, page }));
  };

  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Render pagination controls
  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;

    return (
      <Pagination className="justify-content-center mt-3">
        <Pagination.First 
          onClick={() => handlePageChange(1)} 
          disabled={pagination.page === 1} 
        />
        <Pagination.Prev 
          onClick={() => handlePageChange(pagination.page - 1)} 
          disabled={pagination.page === 1} 
        />
        
        {/* Show page numbers */}
        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
          // Calculate page numbers to show (centered around current page)
          let pageNum: number;
          if (pagination.totalPages <= 5) {
            // If 5 or fewer pages, show all
            pageNum = i + 1;
          } else if (pagination.page <= 3) {
            // If near start, show first 5 pages
            pageNum = i + 1;
          } else if (pagination.page >= pagination.totalPages - 2) {
            // If near end, show last 5 pages
            pageNum = pagination.totalPages - 4 + i;
          } else {
            // Otherwise, center around current page
            pageNum = pagination.page - 2 + i;
          }
          
          return (
            <Pagination.Item
              key={pageNum}
              active={pageNum === pagination.page}
              onClick={() => handlePageChange(pageNum)}
            >
              {pageNum}
            </Pagination.Item>
          );
        })}
        
        <Pagination.Next 
          onClick={() => handlePageChange(pagination.page + 1)} 
          disabled={pagination.page === pagination.totalPages} 
        />
        <Pagination.Last 
          onClick={() => handlePageChange(pagination.totalPages)} 
          disabled={pagination.page === pagination.totalPages} 
        />
      </Pagination>
    );
  };

  return (
    <div className="recipients-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Recipients</h4>
        <Button 
          variant="success" 
          href={getRecipientsDownloadUrl(campaignId)} 
          target="_blank"
          disabled={loading || recipients.length === 0}
        >
          Download All Recipients
        </Button>
      </div>

      {/* Search Bar */}
      <Row className="mb-3">
        <Col md={8} lg={6}>
          <InputGroup>
            <InputGroup.Text>
              <Search />
            </InputGroup.Text>
            <Form.Control
              placeholder="Search recipients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" id="search-type-dropdown">
                {searchType === 'all' && 'All Fields'}
                {searchType === 'loan_id' && 'Loan ID'}
                {searchType === 'name' && 'Name'}
                {searchType === 'address' && 'Address'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setSearchType('all')}>All Fields</Dropdown.Item>
                <Dropdown.Item onClick={() => setSearchType('loan_id')}>Loan ID</Dropdown.Item>
                <Dropdown.Item onClick={() => setSearchType('name')}>Name</Dropdown.Item>
                <Dropdown.Item onClick={() => setSearchType('address')}>Address</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            {searchTerm && (
              <Button 
                variant="outline-secondary" 
                onClick={() => setSearchTerm('')}
              >
                Clear
              </Button>
            )}
          </InputGroup>
          <Form.Text className="text-muted">
            {searchType === 'loan_id' && 'Search by exact loan ID'}
            {searchType === 'name' && 'Search by first or last name (fuzzy match)'}
            {searchType === 'address' && 'Search by address (street number must match exactly)'}
            {searchType === 'all' && 'Search across all fields'}
          </Form.Text>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      {loading ? (
        <div className="text-center p-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading recipients...</p>
        </div>
      ) : recipients.length === 0 ? (
        <Alert variant="info">No recipients found for this campaign.</Alert>
      ) : (
        <>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Loan ID</th>
                  <th>Name</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Zip</th>
                  <th>Status</th>
                  <th>Mailed Date</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map(recipient => (
                  <tr key={recipient.recipient_id}>
                    <td>{recipient.recipient_id}</td>
                    <td>{recipient.loan_id}</td>
                    <td>
                      {recipient.first_name || ''} {recipient.last_name || ''}
                    </td>
                    <td>{recipient.address || 'N/A'}</td>
                    <td>{recipient.city || 'N/A'}</td>
                    <td>{recipient.state || 'N/A'}</td>
                    <td>{recipient.zip_code || 'N/A'}</td>
                    <td>{recipient.status}</td>
                    <td>{formatDate(recipient.mailed_date)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          {renderPagination()}
          
          <div className="text-center text-muted mt-2">
            Showing {recipients.length} of {pagination.totalCount} recipients
          </div>
        </>
      )}
    </div>
  );
};
