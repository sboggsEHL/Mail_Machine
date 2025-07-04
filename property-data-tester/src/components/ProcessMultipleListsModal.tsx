import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, ListGroup, Badge, ProgressBar, Table } from 'react-bootstrap';
import { listService } from '../services/list.service';
import { CampaignCreationModal } from './campaigns/CampaignCreationModal';
import api, { fetchCampaigns, Campaign } from '../services/api';

interface ProcessMultipleListsModalProps {
  show: boolean;
  onHide: () => void;
  selectedLists: number[];
  listData: any[];
}

const ProcessMultipleListsModal: React.FC<ProcessMultipleListsModalProps> = ({
  show,
  onHide,
  selectedLists,
  listData
}) => {
  // State for duplicate checking
  const [checking, setChecking] = useState<boolean>(false);
  const [checkingProgress, setCheckingProgress] = useState<number>(0);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [excludedRadarIds, setExcludedRadarIds] = useState<string[]>([]);
  const [excludeAll, setExcludeAll] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  // State for campaign selection
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState<boolean>(false);
  const [campaignOption, setCampaignOption] = useState<string>('existing');
  
  // State for processing
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // State for DNM checking
  const [checkingDnm, setCheckingDnm] = useState<boolean>(false);
  const [dnmRecords, setDnmRecords] = useState<any[]>([]);
  const [showDnmModal, setShowDnmModal] = useState<boolean>(false);
  const [dnmError, setDnmError] = useState<string | null>(null);
// Handler to download duplicates CSV
const handleDownloadDuplicatesCsv = async () => {
  if (!selectedLists.length) return;
  try {
    // Fetch CSVs for all selected lists
    const csvs: string[] = [];
    for (const listId of selectedLists) {
      const response = await fetch(`/api/lists/${listId}/duplicates/csv`, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to download duplicates CSV for list ${listId}`);
      }
      const text = await response.text();
      csvs.push(text);
    }

    // Combine CSVs: merge headers, deduplicate rows
    let combinedRows: string[] = [];
    let header: string | null = null;
    const seenRows = new Set<string>();

    for (const csv of csvs) {
      const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
      if (!lines.length) continue;
      if (!header) {
        header = lines[0];
        combinedRows.push(header);
      }
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row && !seenRows.has(row)) {
          combinedRows.push(row);
          seenRows.add(row);
        }
      }
    }

    if (!header) {
      setError('No data found to download.');
      return;
    }

    const combinedCsv = combinedRows.join('\r\n');
    const blob = new Blob([combinedCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combined_duplicates.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    setError('Failed to download combined duplicates CSV');
  }
};
  const [leadCount, setLeadCount] = useState<number>(0);
  
  // Load campaigns on component mount
  useEffect(() => {
    if (show) {
      loadCampaigns();
    }
  }, [show]);
  
  // Load campaigns from API
  const loadCampaigns = async () => {
    try {
      const response = await fetchCampaigns();
      if (response.success) {
        setCampaigns(response.campaigns || []);
        if (response.campaigns && response.campaigns.length > 0 && response.campaigns[0].campaign_id) {
          setSelectedCampaignId(response.campaigns[0].campaign_id);
        }
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };
  
  // Check for duplicates across all selected lists
  const checkDuplicates = async () => {
    if (selectedLists.length === 0) return;
    
    try {
      setChecking(true);
      setDuplicates([]);
      setAllProperties([]);
      setTotalItems(0);
      setCheckingProgress(0);
      
      // Get all properties from all selected lists
      let allItems: any[] = [];
      let processedLists = 0;
      
      for (const listId of selectedLists) {
        try {
          // Use getAllListItems to get all items from the list, not just the first 1000
          const listItemsResponse = await listService.getAllListItems(listId);
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
              last_campaign_date: null,
              list_id: listId,
              list_name: listData.find((l: any) => l.ListID === listId)?.ListName || 'Unknown'
            }));
            
            allItems = [...allItems, ...properties];
            console.log(`Retrieved ${properties.length} items from list ${listId}`);
          }
        } catch (err) {
          console.error(`Error fetching items for list ${listId}:`, err);
        }
        
        processedLists++;
        setCheckingProgress(Math.floor((processedLists / selectedLists.length) * 50)); // First 50% is getting items
      }
      
      setAllProperties(allItems);
      setTotalItems(allItems.length);
      
      // Check for duplicates
      if (allItems.length > 0) {
        const allRadarIds = allItems.map(item => item.radar_id);
        
        // We'll check duplicates in batches to avoid overwhelming the server
        const batchSize = 1000;
        const batches = Math.ceil(allRadarIds.length / batchSize);
        let allDuplicates: any[] = [];
        
        for (let i = 0; i < batches; i++) {
          const batchRadarIds = allRadarIds.slice(i * batchSize, (i + 1) * batchSize);
          
          try {
            // We need to check duplicates for these radar IDs
            // Since the API doesn't support passing radar IDs directly, we'll use a different approach
            // We'll call the server endpoint directly
            const response = await api.post(`/lists/${selectedLists[0]}/check-duplicates-batch`, {
              radarIds: batchRadarIds
            });
            
            const result = response.data;
            if (result.success) {
              allDuplicates = [...allDuplicates, ...(result.duplicates || [])];
            }
          } catch (err) {
            console.error(`Error checking duplicates for batch ${i}:`, err);
          }
          
          // Update progress (remaining 50% is checking duplicates)
          setCheckingProgress(50 + Math.floor(((i + 1) / batches) * 50));
        }
        
        setDuplicates(allDuplicates);
        
        // Update allProperties with duplicate information
        if (allDuplicates.length > 0) {
          setAllProperties(prevProperties => {
            const updatedProperties = [...prevProperties];
            for (const duplicate of allDuplicates) {
              const index = updatedProperties.findIndex(p => p.radar_id === duplicate.radar_id);
              if (index !== -1) {
                updatedProperties[index] = {
                  ...updatedProperties[index],
                  ...duplicate
                };
              }
            }
            return updatedProperties;
          });
        }
        
        // Set excluded RadarIDs based on excludeAll setting
        if (excludeAll) {
          setExcludedRadarIds(allDuplicates.map(d => d.radar_id));
        } else {
          setExcludedRadarIds([]);
        }
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to check duplicates. Please try again.');
      console.error(err);
    } finally {
      setChecking(false);
      setCheckingProgress(100);
    }
  };

  // DNM check function for multiple lists
  const checkDnmRegistry = async () => {
    if (selectedLists.length === 0) return;

    try {
      setCheckingDnm(true);
      setDnmError(null);
      setDnmRecords([]);

      // Get all radar IDs from all selected lists
      let allRadarIds: string[] = [];
      
      for (const listId of selectedLists) {
        try {
          const listItemsResponse = await listService.getAllListItems(listId);
          if (listItemsResponse.success) {
            const radarIds = listItemsResponse.items.map((item: any) => item.RadarID);
            allRadarIds = [...allRadarIds, ...radarIds];
          }
        } catch (err) {
          console.error(`Error fetching items for list ${listId}:`, err);
        }
      }

      // Remove duplicates from radar IDs
      const uniqueRadarIds = Array.from(new Set(allRadarIds));

      if (uniqueRadarIds.length === 0) {
        setDnmError('No radar IDs found in selected lists');
        setCheckingDnm(false);
        return;
      }

      // Check DNM registry
      const response = await fetch('/api/dnm/check-with-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ radarIds: uniqueRadarIds })
      });

      if (!response.ok) {
        throw new Error('Failed to check DNM registry');
      }

      const result = await response.json();
      
      if (result.success) {
        setDnmRecords(result.dnmRecords || []);
        setShowDnmModal(true);
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
  
  // Filter functions for quick filtering
  const applyFilter = (filterType: string) => {
    // Reset active filter if clicking the same one
    if (activeFilter === filterType) {
      setActiveFilter(null);
      // Reset to original exclude settings
      if (excludeAll) {
        setExcludedRadarIds(duplicates.map(d => d.radar_id));
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
        filteredRadarIds = duplicates
          .filter(property => property.last_campaign_date !== null)
          .map(property => property.radar_id);
        break;
        
      case 'exclude-30-days':
        // Exclude properties mailed in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        filteredRadarIds = duplicates
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
        
        filteredRadarIds = duplicates
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
        
        filteredRadarIds = duplicates
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
  
  // Toggle exclude all duplicates
  const toggleExcludeAll = () => {
    const newExcludeAll = !excludeAll;
    setExcludeAll(newExcludeAll);
    
    if (newExcludeAll) {
      // Exclude all duplicates
      setExcludedRadarIds(duplicates.map(d => d.radar_id));
    } else {
      // Include all duplicates
      setExcludedRadarIds([]);
    }
  };
  
  // Process the selected lists
  const processLists = async () => {
    if (selectedLists.length === 0) return;
    
    try {
      setProcessing(true);
      
      // Determine which campaign to use
      let campaignId: number | undefined = undefined;
      let newCampaign = null;
      
      if (campaignOption === 'existing' && selectedCampaignId) {
        campaignId = selectedCampaignId;
      } else if (campaignOption === 'new') {
        // Extract criteria from list names
        const criteria = extractCriteriaFromLists();
        
        // Create a descriptive name based on states and loan types
        const stateStr = criteria.State && criteria.State.length > 0
          ? criteria.State.join(', ')
          : 'All States';
        
        const loanTypeStr = criteria.FirstLoanType && criteria.FirstLoanType.length > 0
          ? criteria.FirstLoanType.join(', ')
          : 'All Loan Types';
        
        // New campaign will be created on the server
        newCampaign = {
          campaign_name: `${stateStr} ${loanTypeStr} - ${new Date().toLocaleDateString()}`,
          description: `Lists: ${selectedLists.map(id => {
            const list = listData.find((l: any) => l.ListID === id);
            return list ? list.ListName : id;
          }).join(', ')}`,
          campaign_date: new Date().toISOString().split('T')[0],
          status: 'DRAFT',
          target_loan_types: criteria.FirstLoanType || [],
          target_states: criteria.State || [],
          created_by: localStorage.getItem('userId') || 'system'
        };
      }
      
      // Process the lists
      const result = await listService.processMultipleLists(
        selectedLists,
        excludedRadarIds,
        campaignId,
        newCampaign,
        leadCount > 0 ? leadCount : undefined
      );
      
      if (result.success) {
        setSuccess(`Successfully created batch job #${result.jobId} with ${result.processedCount} properties (${result.excludedCount} excluded)`);
        setError(null);
        
        // Redirect to batch job details after a delay
        setTimeout(() => {
          window.location.href = `#batch-jobs`;
          onHide();
        }, 3000);
      } else {
        setError(result.error || 'Failed to process lists');
        console.error('Error processing lists:', result.details);
      }
    } catch (err) {
      setError('Failed to process lists. Please try again.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };
  // Handle campaign creation success
  const handleCampaignCreated = (campaignId: number) => {
    setSelectedCampaignId(campaignId);
    setCampaignOption('existing');
    setShowCreateCampaign(false);
    loadCampaigns(); // Refresh the campaigns list
  };
  
  // Extract criteria from list names
  const extractCriteriaFromLists = (): Record<string, any> => {
    // Extract state codes from list names
    const stateRegex = /^([A-Z]{2})\s/;
    const states = selectedLists
      .map(listId => {
        const list = listData.find((l: any) => l.ListID === listId);
        if (!list) return null;
        
        const match = list.ListName.match(stateRegex);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];
    
    // Extract loan types from list names
    // const loanTypeRegex = /VA\s+No\s+Rate/i; // Removed unused regex
    const loanTypes = ['VA']; // Based on user feedback, these are all VA loans
    
    return {
      State: states,
      FirstLoanType: loanTypes,
      // Add any other criteria you want to extract
    };
  };
  
  
  return (
    <>
      <Modal show={show} onHide={onHide} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Process Multiple Lists</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          {dnmError && <Alert variant="danger">{dnmError}</Alert>}
          
          <h5>Selected Lists ({selectedLists.length})</h5>
          <ListGroup className="mb-4">
            {selectedLists.map(listId => {
              const list = listData.find((l: any) => l.ListID === listId);
              return (
                <ListGroup.Item key={listId}>
                  <strong>{list?.ListName}</strong> - {list?.ListType} - {list?.TotalCount || list?.Count || list?.ItemCount || 0} items
                </ListGroup.Item>
              );
            })}
          </ListGroup>
          
          {!checking && duplicates.length === 0 && allProperties.length === 0 && (
            <div className="mb-4">
              <Button
                variant="primary"
                onClick={checkDuplicates}
                disabled={checking}
                className="me-2"
              >
                {checking ? 'Checking...' : 'Check Duplicates'}
              </Button>
              <Button
                variant="warning"
                onClick={checkDnmRegistry}
                disabled={checkingDnm}
              >
                {checkingDnm ? 'Checking DNM...' : 'Check DNM Registry'}
              </Button>
            </div>
          )}
          
          {checking && (
            <div className="mb-4 text-center">
              <Spinner animation="border" />
              <p className="mt-2">Checking for duplicates...</p>
              <ProgressBar
                now={checkingProgress}
                label={`${checkingProgress}%`}
              />
            </div>
          )}
          
          {!checking && allProperties.length > 0 && (
            <>
              <div className="mb-4">
                <h5>
                  {duplicates.length > 0 ? 'Duplicate Analysis' : 'Property List'}
                </h5>
                {duplicates.length === 0 && totalItems > 0 && (
                  <Alert variant="success" className="mt-2 mb-0">
                    <h6 className="mb-0">No duplicates found! All {totalItems} properties in these lists are new.</h6>
                  </Alert>
                )}
                
                {duplicates.length > 0 && (
                  <>
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
                    <div className="mb-3">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={handleDownloadDuplicatesCsv}
                        className="me-2"
                      >
                        Download Duplicates CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={checkDnmRegistry}
                        disabled={checkingDnm}
                      >
                        {checkingDnm ? 'Checking DNM...' : 'Check DNM Registry'}
                      </Button>
                    </div>
                    
                    <div className="mt-2 d-flex align-items-center">
                      <Form.Check
                        type="switch"
                        id="exclude-all-switch"
                        label="Exclude All Duplicates"
                        checked={excludeAll}
                        onChange={toggleExcludeAll}
                      />
                    </div>
                  </>
                )}
                
                <div className="mb-3 mt-3">
                  <strong>Total Properties:</strong> {totalItems} |
                  <strong> Duplicates Found:</strong> {duplicates.length} |
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
                    now={(totalItems - duplicates.length) / totalItems * 100}
                    key={1}
                  />
                  <ProgressBar
                    variant="warning"
                    now={(duplicates.length - excludedRadarIds.length) / totalItems * 100}
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
              </div>
              
              <div className="mb-4">
                <h5>Processing Options</h5>
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
                        <strong>Note:</strong> This limits the number of records that will be processed from these lists.
                        Use this to control batch size for testing or to split large lists into smaller batches.
                        Leave at 0 to process all available records.
                      </small>
                    </Alert>
                  </Form.Group>
                </Form>
              </div>
              
              <div className="mb-4">
                <h5>Campaign Selection</h5>
                <Form>
                  <Form.Group className="mb-3">
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
                        value={selectedCampaignId || ''}
                        onChange={(e) => setSelectedCampaignId(parseInt(e.target.value))}
                        disabled={campaigns.length === 0}
                      >
                        {campaigns.length === 0 ? (
                          <option>No campaigns available</option>
                        ) : (
                          campaigns.map(campaign => (
                            <option key={campaign.campaign_id} value={campaign.campaign_id}>
                              {campaign.campaign_name} ({campaign.campaign_date})
                            </option>
                          ))
                        )}
                      </Form.Select>
                    )}
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Check
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
                  </Form.Group>
                </Form>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          {!checking && allProperties.length > 0 && (
            <Button
              variant="success"
              onClick={processLists}
              disabled={processing || totalItems - excludedRadarIds.length === 0}
            >
              {processing ? 'Processing...' : `Process ${totalItems - excludedRadarIds.length} Properties`}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
      
      {/* Campaign Creation Modal */}
      <CampaignCreationModal
        show={showCreateCampaign}
        onHide={() => setShowCreateCampaign(false)}
        criteria={extractCriteriaFromLists()}
        onSuccess={handleCampaignCreated}
        listName={selectedLists.length === 1 
          ? listData.find((l: any) => l.ListID === selectedLists[0])?.ListName 
          : `Multiple Lists (${selectedLists.length})`}
      />

      {/* DNM Check Modal */}
      <Modal show={showDnmModal} onHide={() => setShowDnmModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>DNM Registry Check Results - Multiple Lists</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {dnmRecords.length === 0 ? (
            <Alert variant="success">
              <h5>✅ No DNM Records Found</h5>
              <p>None of the properties in the selected lists are currently in the Do Not Mail registry.</p>
            </Alert>
          ) : (
            <>
              <Alert variant="warning">
                <h5>⚠️ {dnmRecords.length} Properties Found in DNM Registry</h5>
                <p>The following properties from your selected lists are currently on the Do Not Mail list and should not be mailed to:</p>
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
                              // Add to excluded radar IDs to filter from processing
                              setExcludedRadarIds(prev => {
                                if (!prev.includes(record.radar_id)) {
                                  return [...prev, record.radar_id];
                                }
                                return prev;
                              });
                            }}
                            disabled={excludedRadarIds.includes(record.radar_id)}
                          >
                            {excludedRadarIds.includes(record.radar_id) ? 'Excluded' : 'Exclude'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              <Alert variant="info" className="mt-3">
                <strong>Note:</strong> You can exclude individual properties from processing by clicking the "Exclude" button. 
                These properties will not be included when you process the lists.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDnmModal(false)}>
            Close
          </Button>
          {dnmRecords.length > 0 && (
            <Button
              variant="warning"
              onClick={() => {
                // Exclude all DNM records
                const dnmRadarIds = dnmRecords.map(record => record.radar_id);
                setExcludedRadarIds(prev => {
                  const newExcluded = [...prev];
                  dnmRadarIds.forEach(id => {
                    if (!newExcluded.includes(id)) {
                      newExcluded.push(id);
                    }
                  });
                  return newExcluded;
                });
                setShowDnmModal(false);
              }}
            >
              Exclude All DNM Records
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ProcessMultipleListsModal;
