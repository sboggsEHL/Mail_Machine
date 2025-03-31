import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button } from 'react-bootstrap';
import { fetchCampaignById, fetchCampaignStats, Campaign, CampaignStats } from '../../services/api';

interface CampaignDetailProps {
  campaignId: number;
  onBack: () => void;
}

/**
 * Component for displaying campaign details
 */
export const CampaignDetail: React.FC<CampaignDetailProps> = ({ campaignId, onBack }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load campaign data
  const loadCampaignData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch campaign details
      const campaignResponse = await fetchCampaignById(campaignId);
      
      if (!campaignResponse.success) {
        setError(campaignResponse.error || `Failed to fetch campaign ${campaignId}`);
        return;
      }
      
      setCampaign(campaignResponse.campaign);
      
      // Fetch campaign stats
      const statsResponse = await fetchCampaignStats(campaignId);
      
      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }
    } catch (err) {
      setError('Error loading campaign data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  // Load campaign data on component mount
  useEffect(() => {
    loadCampaignData();
  }, [campaignId]);
  
  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
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
  
  return (
    <div className="campaign-detail">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Campaign Details</h3>
        <Button variant="outline-secondary" onClick={onBack}>
          Back to Campaigns
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
          <p className="mt-2">Loading campaign data...</p>
        </div>
      )}
      
      {!loading && !error && campaign && (
        <div className="campaign-content">
          <Card className="mb-4">
            <Card.Header>
              <h4 className="mb-0">Campaign Information</h4>
            </Card.Header>
            <Card.Body>
              <div className="row">
                <div className="col-md-6">
                  <p><strong>ID:</strong> {campaign.campaign_id}</p>
                  <p><strong>Name:</strong> {campaign.campaign_name}</p>
                  <p><strong>Description:</strong> {campaign.description}</p>
                  <p><strong>Date:</strong> {formatDate(campaign.campaign_date)}</p>
                </div>
                <div className="col-md-6">
                  <p>
                    <strong>Status:</strong>{' '}
                    <Badge bg={getStatusBadgeVariant(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </p>
                  <p><strong>Target States:</strong> {campaign.target_states.join(', ')}</p>
                  <p><strong>Target Loan Types:</strong> {campaign.target_loan_types.join(', ')}</p>
                  <p><strong>Created By:</strong> {campaign.created_by}</p>
                </div>
              </div>
            </Card.Body>
          </Card>
          
          {stats && (
            <Card className="mb-4">
              <Card.Header>
                <h4 className="mb-0">Campaign Statistics</h4>
              </Card.Header>
              <Card.Body>
                <div className="row">
                  <div className="col-md-4">
                    <div className="text-center">
                      <h5>Total Recipients</h5>
                      <div className="display-4">{stats.total_recipients}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <h5>Mailed</h5>
                      <div className="display-4">{stats.mailed_count}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <h5>Responses</h5>
                      <div className="display-4">{stats.response_count}</div>
                      {stats.response_rate !== undefined && (
                        <div className="text-muted">
                          {stats.response_rate.toFixed(2)}% response rate
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};