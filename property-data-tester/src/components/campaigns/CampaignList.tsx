import React, { useState, useEffect } from 'react';
import { Table, Button, Badge } from 'react-bootstrap';
import { fetchCampaigns, Campaign } from '../../services/api';

interface CampaignListProps {
  onSelectCampaign: (campaignId: number) => void;
}

/**
 * Component for displaying a list of campaigns
 */
export const CampaignList: React.FC<CampaignListProps> = ({ onSelectCampaign }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load campaigns
  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchCampaigns();
      
      if (response.success) {
        setCampaigns(response.campaigns || []);
      } else {
        setError(response.error || 'Failed to fetch campaigns');
      }
    } catch (err) {
      setError('Error fetching campaigns: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  // Load campaigns on component mount
  useEffect(() => {
    loadCampaigns();
  }, []);
  
  // Get status badge color
  const getStatusBadgeVariant = (status: string): string => {
    switch (status) {
      case 'DRAFT':
        return 'secondary';
      case 'READY':
        return 'primary';
      case 'MAILED':
        return 'success';
      case 'COMPLETED':
        return 'info';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'light';
    }
  };
  
  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  return (
    <div className="campaign-list">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Campaigns</h3>
        <Button variant="outline-primary" onClick={() => loadCampaigns()}>
          Refresh
        </Button>
      </div>
      
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}
      
      {loading && (
        <div className="text-center p-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading campaigns...</p>
        </div>
      )}
      
      {!loading && !error && campaigns.length === 0 && (
        <div className="alert alert-info">
          No campaigns found. Create a new campaign by searching for properties.
        </div>
      )}
      
      {!loading && !error && campaigns.length > 0 && (
        <Table striped hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.campaign_id}>
                <td>{campaign.campaign_id}</td>
                <td>{campaign.campaign_name}</td>
                <td>{campaign.description}</td>
                <td>{formatDate(campaign.campaign_date)}</td>
                <td>
                  <Badge bg={getStatusBadgeVariant(campaign.status)}>
                    {campaign.status}
                  </Badge>
                </td>
                <td>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => onSelectCampaign(campaign.campaign_id!)}
                  >
                    View
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