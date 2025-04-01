import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Table, Button, Spinner, 
  Alert, Form, Badge, ProgressBar 
} from 'react-bootstrap';
import { listService } from '../services/list.service';

const ListProcessPage: React.FC<{ listId?: string }> = ({ listId }) => {
  const [list, setList] = useState<any>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [excludeAll, setExcludeAll] = useState<boolean>(true);
  const [excludedRadarIds, setExcludedRadarIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(1000);
  const [allDuplicates, setAllDuplicates] = useState<any[]>([]);
  
  useEffect(() => {
    if (listId) {
      fetchListDetails();
    }
  }, [listId]);
  
  const fetchListDetails = async () => {
    try {
      setLoading(true);
      // Get list details
      const response = await listService.getLists();
      console.log('Lists response:', response);
      
      if (response.success) {
        const lists = response.lists || [];
        const currentList = lists.find((l: any) => l.ListID.toString() === listId);
        
        if (!currentList) {
          setError('List not found');
          return;
        }
        
        setList(currentList);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch lists');
        console.error('Error fetching lists:', response.details);
      }
    } catch (err) {
      setError('Failed to fetch list details. Please try again.');
      console.error('Exception in fetchListDetails:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const checkDuplicates = async (page: number = 1) => {
    if (!listId) return;
    
    try {
      setChecking(true);
      
      // First, fetch all properties from the list
      if (page === 1) {
        try {
          const listItemsResponse = await listService.getListItems(parseInt(listId));
          if (listItemsResponse.success) {
            // Convert list items to property format for display
            const properties = listItemsResponse.items.map((item: any) => ({
              radar_id: item.RadarID,
              address: 'N/A', // These will be populated if they're duplicates
              city: 'N/A',
              state: 'N/A',
              zip_code: 'N/A',
              created_at: new Date(item.AddedDate),
              last_campaign_id: null,
              last_campaign_name: 'N/A',
              last_campaign_date: null
            }));
            setAllProperties(properties);
          }
        } catch (err) {
          console.error('Error fetching list items:', err);
        }
      }
      
      // Then check for duplicates
      const result = await listService.checkDuplicates(parseInt(listId), page, pageSize);
      console.log('Duplicate check result:', result);
      
      if (result.success) {
        setTotalItems(result.totalItems);
        setDuplicates(result.duplicates || []);
        
        // Update pagination info
        if (result.pagination) {
          setCurrentPage(result.pagination.page);
          setTotalPages(result.pagination.totalPages);
        }
        
        // Accumulate duplicates if this is not the first page
        if (page === 1) {
          setAllDuplicates(result.duplicates || []);
        } else {
          setAllDuplicates(prev => [...prev, ...(result.duplicates || [])]);
        }
        
        // Update allProperties with duplicate information
        if (result.duplicates && result.duplicates.length > 0) {
          setAllProperties(prevProperties => {
            const updatedProperties = [...prevProperties];
            for (const duplicate of result.duplicates) {
              const index = updatedProperties.findIndex(p => p.radar_id === duplicate.radar_id);
              if (index !== -1) {
                updatedProperties[index] = duplicate;
              }
            }
            return updatedProperties;
          });
        }
        
        setError(null);
        
        // If there are more pages, load the next page
        if (result.pagination && result.pagination.hasMore) {
          // Wait a short time before loading the next page to avoid overwhelming the server
          setTimeout(() => {
            checkDuplicates(page + 1);
          }, 500);
        } else {
          // All pages loaded, update excluded RadarIDs
          if (excludeAll) {
            setExcludedRadarIds(allDuplicates.map((d: any) => d.radar_id));
          } else {
            setExcludedRadarIds([]);
          }
        }
      } else {
        setError(result.error || 'Failed to check duplicates');
        console.error('Error checking duplicates:', result.details);
      }
      
      // Make sure to set checking to false when there are no more pages
      if (!result.pagination || !result.pagination.hasMore) {
        setChecking(false);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to check duplicates. Please try again.');
      console.error(err);
      setChecking(false);
    }
  };
  
  // Filter functions for quick filtering
  const applyFilter = (filterType: string) => {
    // Reset active filter if clicking the same one
    if (activeFilter === filterType) {
      setActiveFilter(null);
      // Reset to original exclude settings
      if (excludeAll) {
        setExcludedRadarIds(allDuplicates.map(d => d.radar_id));
      } else {
        setExcludedRadarIds([]);
      }
      return;
    }
    
    setActiveFilter(filterType);
    
    const today = new Date();
    let filteredRadarIds: string[] = [];
    
    switch (filterType) {
      case 'exclude-all-mailed':
        // Exclude all properties that have been mailed (have a campaign date)
        filteredRadarIds = allDuplicates
          .filter(property => property.last_campaign_date !== null)
          .map(property => property.radar_id);
        break;
        
      case 'exclude-30-days':
        // Exclude properties mailed in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        filteredRadarIds = allDuplicates
          .filter(property => {
            if (!property.last_campaign_date) return false;
            const campaignDate = new Date(property.last_campaign_date);
            return campaignDate >= thirtyDaysAgo;
          })
          .map(property => property.radar_id);
        break;
        
      case 'exclude-60-days':
        // Exclude properties mailed in the last 60 days
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(today.getDate() - 60);
        
        filteredRadarIds = allDuplicates
          .filter(property => {
            if (!property.last_campaign_date) return false;
            const campaignDate = new Date(property.last_campaign_date);
            return campaignDate >= sixtyDaysAgo;
          })
          .map(property => property.radar_id);
        break;
        
      case 'exclude-90-days':
        // Exclude properties mailed in the last 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(today.getDate() - 90);
        
        filteredRadarIds = allDuplicates
          .filter(property => {
            if (!property.last_campaign_date) return false;
            const campaignDate = new Date(property.last_campaign_date);
            return campaignDate >= ninetyDaysAgo;
          })
          .map(property => property.radar_id);
        break;
        
      default:
        break;
    }
    
    setExcludedRadarIds(filteredRadarIds);
  };
  
  const toggleExcludeAll = () => {
    const newExcludeAll = !excludeAll;
    setExcludeAll(newExcludeAll);
    
    if (newExcludeAll) {
      // Exclude all duplicates
      setExcludedRadarIds(allDuplicates.map(d => d.radar_id));
    } else {
      // Include all duplicates
      setExcludedRadarIds([]);
    }
  };
  
  const toggleExcludeProperty = (radarId: string) => {
    if (excludedRadarIds.includes(radarId)) {
      // Remove from excluded list
      setExcludedRadarIds(excludedRadarIds.filter(id => id !== radarId));
    } else {
      // Add to excluded list
      setExcludedRadarIds([...excludedRadarIds, radarId]);
    }
  };
  
  const processList = async () => {
    if (!listId) return;
    
    try {
      setProcessing(true);
      const result = await listService.processList(parseInt(listId), excludedRadarIds);
      console.log('Process list result:', result);
      
      if (result.success) {
        setSuccess(`Successfully created batch job #${result.jobId} with ${result.processedCount} properties (${result.excludedCount} excluded)`);
        setError(null);
        
        // Redirect to batch job details after a delay
        setTimeout(() => {
          window.location.href = `#batch-jobs`;
        }, 3000);
      } else {
        setError(result.error || 'Failed to process list');
        console.error('Error processing list:', result.details);
      }
    } catch (err) {
      setError('Failed to process list. Please try again.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };
  
  if (loading) {
    return (
      <Container fluid className="mt-4">
        <div className="text-center my-5">
          <Spinner animation="border" />
          <p className="mt-2">Loading list details...</p>
        </div>
      </Container>
    );
  }
  
  if (!list) {
    return (
      <Container fluid className="mt-4">
        <Alert variant="danger">List not found</Alert>
        <Button variant="primary" onClick={() => window.location.href = '#lists'}>
          Back to Lists
        </Button>
      </Container>
    );
  }
  
  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <h1>Process List: {list.ListName}</h1>
          <p>
            Type: {list.ListType} |
            Items: {list.TotalCount || list.Count || list.ItemCount || 0} |
            Created: {list.CreatedDate ? new Date(list.CreatedDate).toLocaleDateString() : 'N/A'}
          </p>
          <div className="d-flex flex-wrap gap-2">
            <Button variant="outline-secondary" onClick={() => window.location.href = '#lists'}>
              Back to Lists
            </Button>
            
            {!checking && allDuplicates.length === 0 && (
              <Button
                variant="primary"
                onClick={() => checkDuplicates(1)}
                disabled={checking}
              >
                {checking ? 'Checking...' : 'Check Duplicates'}
              </Button>
            )}
            
            {!checking && totalItems > 0 && (
              <Button
                variant="success"
                onClick={processList}
                disabled={processing || totalItems - excludedRadarIds.length === 0}
              >
                {processing ? 'Processing...' : `Process ${totalItems - excludedRadarIds.length} Properties`}
              </Button>
            )}
          </div>
        </Col>
      </Row>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      {checking && (
        <Card className="mb-4">
          <Card.Body className="text-center">
            <Spinner animation="border" />
            <p className="mt-2">
              Checking for duplicates...
              {totalPages > 1 && `(Page ${currentPage} of ${totalPages})`}
            </p>
            {totalPages > 1 && (
              <ProgressBar
                now={(currentPage / totalPages) * 100}
                label={`${Math.round((currentPage / totalPages) * 100)}%`}
                className="mt-3"
              />
            )}
          </Card.Body>
        </Card>
      )}
      
      {!checking && totalItems > 0 && (
        <>
          <Card className="mb-4">
            <Card.Header>
              <Row>
                <Col>
                  <h5 className="mb-0">
                    {allDuplicates.length > 0 ? 'Duplicate Analysis' : 'Property List'}
                  </h5>
                  {allDuplicates.length === 0 && totalItems > 0 && (
                    <Alert variant="success" className="mt-2 mb-0">
                      <h6 className="mb-0">No duplicates found! All {totalItems} properties in this list are new.</h6>
                    </Alert>
                  )}
                  
                  {allDuplicates.length > 0 && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant={activeFilter === 'exclude-all-mailed' ? 'primary' : 'outline-primary'}
                        className="me-2 mb-1"
                        onClick={() => applyFilter('exclude-all-mailed')}
                      >
                        Exclude All Mailed
                      </Button>
                      <Button
                        size="sm"
                        variant={activeFilter === 'exclude-30-days' ? 'primary' : 'outline-primary'}
                        className="me-2 mb-1"
                        onClick={() => applyFilter('exclude-30-days')}
                      >
                        Exclude Last 30 Days
                      </Button>
                      <Button
                        size="sm"
                        variant={activeFilter === 'exclude-60-days' ? 'primary' : 'outline-primary'}
                        className="me-2 mb-1"
                        onClick={() => applyFilter('exclude-60-days')}
                      >
                        Exclude Last 60 Days
                      </Button>
                      <Button
                        size="sm"
                        variant={activeFilter === 'exclude-90-days' ? 'primary' : 'outline-primary'}
                        className="mb-1"
                        onClick={() => applyFilter('exclude-90-days')}
                      >
                        Exclude Last 90 Days
                      </Button>
                    </div>
                  )}
                </Col>
                {allDuplicates.length > 0 && (
                  <Col xs="auto" className="d-flex align-items-center">
                    <Form.Check
                      type="switch"
                      id="exclude-all-switch"
                      label="Exclude All Duplicates"
                      checked={excludeAll}
                      onChange={toggleExcludeAll}
                    />
                  </Col>
                )}
              </Row>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <strong>Total Properties:</strong> {totalItems} |
                <strong> Duplicates Found:</strong> {allDuplicates.length} |
                <strong> Excluded:</strong> {excludedRadarIds.length} |
                <strong> To Process:</strong> {totalItems - excludedRadarIds.length}
                {activeFilter && (
                  <Badge bg="info" className="ms-2">
                    {activeFilter === 'exclude-all-mailed' && 'Excluding All Mailed'}
                    {activeFilter === 'exclude-30-days' && 'Excluding Last 30 Days'}
                    {activeFilter === 'exclude-60-days' && 'Excluding Last 60 Days'}
                    {activeFilter === 'exclude-90-days' && 'Excluding Last 90 Days'}
                  </Badge>
                )}
              </div>
              
              <ProgressBar className="mb-4">
                <ProgressBar
                  variant="success"
                  now={(totalItems - allDuplicates.length) / totalItems * 100}
                  key={1}
                />
                <ProgressBar
                  variant="warning"
                  now={(allDuplicates.length - excludedRadarIds.length) / totalItems * 100}
                  key={2}
                />
                <ProgressBar
                  variant="danger"
                  now={excludedRadarIds.length / totalItems * 100}
                  key={3}
                />
              </ProgressBar>
              
              <div className="mb-3">
                <Badge bg="success" className="me-2">New Properties</Badge>
                <Badge bg="warning" className="me-2">Duplicates (Included)</Badge>
                <Badge bg="danger">Duplicates (Excluded)</Badge>
              </div>
              
              <Table responsive hover>
                <thead>
                  <tr>
                    {allDuplicates.length > 0 && <th>Exclude</th>}
                    <th>RadarID</th>
                    <th>Address</th>
                    <th>Created Date</th>
                    <th>Last Campaign</th>
                    <th>Campaign Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(allDuplicates.length > 0 ? allDuplicates : allProperties).map(property => (
                    <tr
                      key={property.radar_id}
                      className={excludedRadarIds.includes(property.radar_id) ? 'table-danger' : ''}
                    >
                      {allDuplicates.length > 0 && (
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={excludedRadarIds.includes(property.radar_id)}
                            onChange={() => toggleExcludeProperty(property.radar_id)}
                            disabled={allDuplicates.findIndex(d => d.radar_id === property.radar_id) === -1}
                          />
                        </td>
                      )}
                      <td>{property.radar_id}</td>
                      <td>
                        {property.address}, {property.city}, {property.state} {property.zip_code}
                      </td>
                      <td>{new Date(property.created_at).toLocaleDateString()}</td>
                      <td>{property.last_campaign_name || 'N/A'}</td>
                      <td>
                        {property.last_campaign_date 
                          ? new Date(property.last_campaign_date).toLocaleDateString() 
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
          
        </>
      )}
    </Container>
  );
};

export default ListProcessPage;