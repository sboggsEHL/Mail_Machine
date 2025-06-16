import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Table, Button, Spinner, 
  Alert, Form, Badge, ProgressBar, Modal
} from 'react-bootstrap';
import { listService } from '../services/list.service';
import { CampaignCreationModal } from '../components/campaigns/CampaignCreationModal';
import { fetchCampaigns, Campaign } from '../services/api'; // Removed unused default import 'api'

const ListProcessPage: React.FC<{ listId?: string }> = ({ listId }) => {
  const [list, setList] = useState<any>(null);
  // These state variables might appear unused, but their setters are used in response handlers
  const [, setDuplicates] = useState<any[]>([]); // Used via setDuplicates in checkDuplicates response
  const [, setAllProperties] = useState<any[]>([]); // Used via setAllProperties to track property updates
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [excludeAll, setExcludeAll] = useState<boolean>(true);
  const [excludedRadarIds, setExcludedRadarIds] = useState<string[]>([]);
  const [currentPage] = useState<number>(1);
  const [totalPages] = useState<number>(1);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const [allDuplicates, setAllDuplicates] = useState<any[]>([]);
  const [duplicatesPage, setDuplicatesPage] = useState<number>(1);
  const DUPLICATES_PER_PAGE = 100;
  const [showLeadCountModal, setShowLeadCountModal] = useState<boolean>(false);
  const [leadCount, setLeadCount] = useState<number>(0);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignOption, setCampaignOption] = useState<string>('existing');
  const [showCreateCampaign, setShowCreateCampaign] = useState<boolean>(false);

  // --- Add to Campaign CSV Upload State ---
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{inserted: number, updated: number, errors: string[]} | null>(null);
// Handler to download duplicates CSV
const handleDownloadDuplicatesCsv = async () => {
  if (!listId) return;
  try {
    const response = await fetch(`/api/lists/${listId}/duplicates/csv`, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv'
      }
    });
    if (!response.ok) {
      throw new Error('Failed to download duplicates CSV');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `list_${listId}_duplicates.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    // Optionally set error state
    alert('Failed to download duplicates CSV');
  }
};
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fetchListDetails = React.useCallback(async () => {
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
  }, [listId]);

  useEffect(() => {
    if (listId) {
      fetchListDetails();
      loadCampaigns();
    }
  }, [listId, fetchListDetails]);
  
  // Load campaigns from API
  const loadCampaigns = async () => {
    try {
      const response = await fetchCampaigns();
      if (response.success) {
        setCampaigns(response.campaigns || []);
        if (response.campaigns && response.campaigns.length > 0 && response.campaigns[0].campaign_id) {
          setCampaignId(response.campaigns[0].campaign_id);
        }
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };
  
  const checkDuplicates = async () => {
    if (!listId) return;

    try {
      setChecking(true);

      // Fetch all properties from the list (for display, if needed)
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

      // Single request for all duplicates (no pagination)
      const result = await listService.checkDuplicates(parseInt(listId));
      console.log('Duplicate check result:', result);

      if (result.success) {
        setTotalItems(result.totalItems);
        setDuplicates(result.duplicates || []);
        setAllDuplicates(result.duplicates || []);
        setDuplicatesPage(1);

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

        // Update excluded RadarIDs
        if (excludeAll) {
          setExcludedRadarIds((result.duplicates || []).map((d: any) => d.radar_id));
        } else {
          setExcludedRadarIds([]);
        }
      } else {
        setError(result.error || 'Failed to check duplicates');
        console.error('Error checking duplicates:', result.details);
      }

      setChecking(false);
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

    let filteredRadarIds: string[] = [];

    const now = new Date();

    switch (filterType) {
      case 'exclude-all-mailed':
      case 'exclude-all-time':
        // Exclude all duplicates
        filteredRadarIds = allDuplicates.map(property => property.radar_id);
        break;
      case 'exclude-30-days':
        filteredRadarIds = allDuplicates
          .filter(property => {
            if (!property.created_at) return false;
            const created = new Date(property.created_at);
            const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays <= 30;
          })
          .map(property => property.radar_id);
        break;
      case 'exclude-60-days':
        filteredRadarIds = allDuplicates
          .filter(property => {
            if (!property.created_at) return false;
            const created = new Date(property.created_at);
            const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays <= 60;
          })
          .map(property => property.radar_id);
        break;
      case 'exclude-90-days':
        filteredRadarIds = allDuplicates
          .filter(property => {
            if (!property.created_at) return false;
            const created = new Date(property.created_at);
            const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays <= 90;
          })
          .map(property => property.radar_id);
        break;
      case 'exclude-6-months':
        filteredRadarIds = allDuplicates
          .filter(property => {
            if (!property.created_at) return false;
            const created = new Date(property.created_at);
            const diffMonths = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
            return diffMonths <= 6;
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
  
  const openLeadCountModal = () => {
    // Default to all available properties
    setLeadCount(totalItems - excludedRadarIds.length);
    setShowLeadCountModal(true);
  };
  
  // Extract criteria from list name
  const extractCriteriaFromList = (): Record<string, any> => {
    if (!list) return {};
    
    // Extract state code from list name
    const stateRegex = /^([A-Z]{2})\s/;
    const stateMatch = list.ListName.match(stateRegex);
    const state = stateMatch ? [stateMatch[1]] : [];
    
    // Extract loan types from list name
    /* Note: Previously used regex pattern for loan type extraction
     * const loanTypeRegex = /VA\s+No\s+Rate/i;
     * Currently hardcoded to 'VA' based on business requirements,
     * but keeping pattern documented for future flexibility
     */
    const loanTypes = ['VA']; // All lists currently contain VA loans only
    
    return {
      State: state,
      FirstLoanType: loanTypes,
    };
  };
  
  // Handle campaign creation success
  const handleCampaignCreated = (campaignId: number) => {
    setCampaignId(campaignId);
    setCampaignOption('existing');
    setShowCreateCampaign(false);
    loadCampaigns(); // Refresh the campaigns list
  };
  
  const processList = async () => {
    if (!listId) return;
    
    try {
      setProcessing(true);
      // Use the leadCount parameter if specified
      const result = await listService.processList(
        parseInt(listId), 
        excludedRadarIds, 
        leadCount > 0 ? leadCount : undefined,
        campaignId || undefined
      );
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
      setShowLeadCountModal(false);
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

            {/* Add to Campaign (CSV Upload) Button */}
            {campaignId && (
              <Button
                variant="warning"
                onClick={() => {
                  setShowUploadModal(true);
                  setUploadFile(null);
                  setUploadResult(null);
                  setUploadError(null);
                }}
              >
                Add to Campaign (Upload CSV)
              </Button>
            )}

            {/* Download CSV Button - only enabled if campaign is completed */}
            {(() => {
              let downloadCsvButton = null;
              if (campaignId) {
                const selectedCampaign = campaigns.find(c => c.campaign_id === campaignId);
                const isCompleted = selectedCampaign && selectedCampaign.status === 'COMPLETED';
                downloadCsvButton = (
                  <Button
                    variant="info"
                    disabled={!isCompleted}
                    onClick={async () => {
                      if (!campaignId) return;
                      try {
                        const response = await fetch(`/api/campaigns/${campaignId}/leads-csv`, {
                          method: 'GET',
                          headers: { 'Accept': 'text/csv' }
                        });
                        if (!response.ok) {
                          alert('Failed to download CSV.');
                          return;
                        }
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `campaign_${campaignId}_leads.csv`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                      } catch (err) {
                        alert('Error downloading CSV.');
                      }
                    }}
                    title={isCompleted ? "Download all leads as CSV" : "Batch must be completed to download CSV"}
                  >
                    Download CSV
                  </Button>
                );
              }
              return downloadCsvButton;
            })()}

            {!checking && allDuplicates.length === 0 && (
              <Button
                variant="primary"
                onClick={checkDuplicates}
                disabled={checking}
              >
                {checking ? 'Checking...' : 'Check Duplicates'}
              </Button>
            )}

            {!checking && totalItems > 0 && (
              <Button
                variant="success"
                onClick={openLeadCountModal}
                disabled={processing || totalItems - excludedRadarIds.length === 0}
              >
                {processing ? 'Processing...' : `Process Properties`}
              </Button>
            )}
          </div>
        </Col>
      </Row>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      {/* Lead Count Modal */}
      <Modal show={showLeadCountModal} onHide={() => setShowLeadCountModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Process Properties</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label><strong>Number of leads to process</strong></Form.Label>
              <Form.Control 
                type="number" 
                value={leadCount} 
                onChange={(e) => setLeadCount(parseInt(e.target.value) || 0)}
                min={1}
                max={totalItems - excludedRadarIds.length}
              />
              <Form.Text className="text-muted">
                Maximum available: {totalItems - excludedRadarIds.length}
              </Form.Text>
              <Alert variant="info" className="mt-2">
                <small>
                  <strong>Note:</strong> This limits the number of records that will be processed from this list.
                  Use this to control batch size for testing or to split large lists into smaller batches.
                </small>
              </Alert>
            </Form.Group>
            
            <Form.Group className="mb-4">
              <h5>Campaign Selection</h5>
              <Form.Check
                type="radio"
                name="campaignOption"
                id="existing-campaign"
                label="Use Existing Campaign"
                checked={campaignOption === 'existing'}
                onChange={() => setCampaignOption('existing')}
              />
              
              {campaignOption === 'existing' && (
                <Form.Select
                  className="mt-2"
                  value={campaignId || ''}
                  onChange={(e) => setCampaignId(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={campaigns.length === 0}
                >
                  <option value="">Select a campaign</option>
                  {campaigns.length === 0 ? (
                    <option disabled>No campaigns available</option>
                  ) : (
                    campaigns.map(campaign => (
                      <option key={campaign.campaign_id} value={campaign.campaign_id}>
                        {campaign.campaign_name} ({campaign.campaign_date})
                      </option>
                    ))
                  )}
                </Form.Select>
              )}
              
              <Form.Check
                className="mt-3"
                type="radio"
                name="campaignOption"
                id="new-campaign"
                label="Create New Campaign"
                checked={campaignOption === 'new'}
                onChange={() => setCampaignOption('new')}
              />
              
              {campaignOption === 'new' && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowCreateCampaign(true)}
                >
                  Create Campaign
                </Button>
              )}
              
              <Form.Check
                className="mt-3"
                type="radio"
                name="campaignOption"
                id="no-campaign"
                label="No Campaign (Assign Later)"
                checked={campaignOption === 'none'}
                onChange={() => {
                  setCampaignOption('none');
                  setCampaignId(null);
                }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLeadCountModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={processList}
            disabled={leadCount <= 0 || leadCount > (totalItems - excludedRadarIds.length)}
          >
            Process {leadCount} Properties
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Campaign Creation Modal */}
      <CampaignCreationModal
        show={showCreateCampaign}
        onHide={() => setShowCreateCampaign(false)}
        criteria={extractCriteriaFromList()}
        onSuccess={handleCampaignCreated}
        listName={list?.ListName}
      />
      
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
                          variant="success"
                          className="ms-2 mb-1"
                          onClick={handleDownloadDuplicatesCsv}
                        >
                          Download Duplicates CSV
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
                      <Button
                        size="sm"
                        variant={activeFilter === 'exclude-6-months' ? 'primary' : 'outline-primary'}
                        className="me-2 mb-1"
                        onClick={() => applyFilter('exclude-6-months')}
                      >
                        Exclude Last 6 Months
                      </Button>
                      <Button
                        size="sm"
                        variant={activeFilter === 'exclude-all-time' ? 'primary' : 'outline-primary'}
                        className="me-2 mb-1"
                        onClick={() => applyFilter('exclude-all-time')}
                      >
                        Exclude All Time
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
              {allDuplicates.length > 0 ? (
                <>
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
                        {activeFilter === 'exclude-6-months' && 'Excluding Last 6 Months'}
                        {activeFilter === 'exclude-all-time' && 'Excluding All Time'}
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
                        <th>Exclude</th>
                        <th>RadarID</th>
                        <th>Address</th>
                        <th>Created Date</th>
                        <th>Last Campaign</th>
                        <th>Campaign Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allDuplicates
                        .slice((duplicatesPage - 1) * DUPLICATES_PER_PAGE, duplicatesPage * DUPLICATES_PER_PAGE)
                        .map(property => (
                          <tr
                            key={property.radar_id}
                            className={excludedRadarIds.includes(property.radar_id) ? 'table-danger' : ''}
                          >
                            <td>
                              <Form.Check
                                type="checkbox"
                                checked={excludedRadarIds.includes(property.radar_id)}
                                onChange={() => toggleExcludeProperty(property.radar_id)}
                              />
                            </td>
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
                  {/* Pagination controls for duplicates */}
                  {allDuplicates.length > DUPLICATES_PER_PAGE && (
                    <div className="d-flex justify-content-center align-items-center my-3">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="me-2"
                        disabled={duplicatesPage === 1}
                        onClick={() => setDuplicatesPage(duplicatesPage - 1)}
                      >
                        Previous
                      </Button>
                      <span>
                        Page {duplicatesPage} of {Math.ceil(allDuplicates.length / DUPLICATES_PER_PAGE)}
                      </span>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="ms-2"
                        disabled={duplicatesPage === Math.ceil(allDuplicates.length / DUPLICATES_PER_PAGE)}
                        onClick={() => setDuplicatesPage(duplicatesPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Alert variant="success">
                  <h5>No duplicates found!</h5>
                  <p>All {totalItems} properties in this list are new and ready to process.</p>
                </Alert>
              )}
            </Card.Body>
          </Card>
          
        </>
      )}
    {/* Add to Campaign Upload Modal */}
    <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Add to Campaign - Upload USPS CSV</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label>Select CSV File</Form.Label>
            <Form.Control
              type="file"
              accept=".csv"
              onChange={e => {
                const file = (e.target as HTMLInputElement).files?.[0] || null;
                setUploadFile(file);
              }}
              disabled={uploading}
            />
          </Form.Group>
        </Form>
        {uploading && (
          <div className="mt-3">
            <Spinner animation="border" size="sm" /> Uploading...
          </div>
        )}
        {uploadResult && (
          <Alert variant="success" className="mt-3">
            <div>Inserted: {uploadResult.inserted}</div>
            <div>Updated: {uploadResult.updated}</div>
            {uploadResult.errors.length > 0 && (
              <details>
                <summary>Errors ({uploadResult.errors.length})</summary>
                <ul style={{ maxHeight: 150, overflowY: 'auto' }}>
                  {uploadResult.errors.map((err, i) => (
                    <li key={i} style={{ fontSize: 12 }}>{err}</li>
                  ))}
                </ul>
              </details>
            )}
          </Alert>
        )}
        {uploadError && (
          <Alert variant="danger" className="mt-3">{uploadError}</Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowUploadModal(false)} disabled={uploading}>
          Close
        </Button>
        <Button
          variant="primary"
          disabled={!uploadFile || uploading}
          onClick={async () => {
            if (!uploadFile || !campaignId) return;
            setUploading(true);
            setUploadResult(null);
            setUploadError(null);
            try {
              const formData = new FormData();
              formData.append('file', uploadFile);
              const res = await fetch(`/api/campaigns/${campaignId}/upload-recipients`, {
                method: 'POST',
                body: formData
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Upload failed');
              }
              const data = await res.json();
              setUploadResult({
                inserted: data.inserted,
                updated: data.updated,
                errors: data.errors || []
              });
            } catch (err: any) {
              setUploadError(err.message || 'Upload failed');
            } finally {
              setUploading(false);
            }
          }}
        >
          Upload
        </Button>
      </Modal.Footer>
    </Modal>
  </Container>
  );
};

export default ListProcessPage;
