import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { createCampaign, Campaign } from '../../services/api';

interface CampaignCreationModalProps {
  show: boolean;
  onHide: () => void;
  criteria: Record<string, any>;
  onSuccess: (campaignId: number) => void;
  username?: string;
}

/**
 * Modal component for creating a new campaign
 */
export const CampaignCreationModal: React.FC<CampaignCreationModalProps> = ({
  show,
  onHide,
  criteria,
  onSuccess,
  username = 'current_user'
}) => {
  const [campaignName, setCampaignName] = useState<string>('');
  const [campaignDate, setCampaignDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Generate description from criteria
  const generateDescription = (): string => {
    const parts: string[] = [];
    
    // Extract state information
    if (criteria.State && Array.isArray(criteria.State)) {
      parts.push(`${criteria.State.join(', ')} state(s)`);
    }
    
    // Extract loan type information
    if (criteria.FirstLoanType && Array.isArray(criteria.FirstLoanType)) {
      parts.push(`${criteria.FirstLoanType.join(', ')} loan type(s)`);
    }
    
    // Extract equity information
    if (criteria.AvailableEquity && Array.isArray(criteria.AvailableEquity)) {
      const range = criteria.AvailableEquity;
      if (range.length === 2) {
        if (range[0] === null && range[1] !== null) {
          parts.push(`equity up to $${range[1].toLocaleString()}`);
        } else if (range[0] !== null && range[1] === null) {
          parts.push(`equity over $${range[0].toLocaleString()}`);
        } else if (range[0] !== null && range[1] !== null) {
          parts.push(`equity between $${range[0].toLocaleString()} and $${range[1].toLocaleString()}`);
        }
      }
      
    }
    
    // Add more criteria as needed
    
    // Combine all parts
    if (parts.length > 0) {
      return parts.join(', ');
    }
    
    return 'Custom criteria';
  };
  
  // Extract target states from criteria
  const extractTargetStates = (): string[] => {
    if (criteria.State && Array.isArray(criteria.State)) {
      return criteria.State;
    }
    return [];
  };
  
  // Extract target loan types from criteria
  const extractTargetLoanTypes = (): string[] => {
    if (criteria.FirstLoanType && Array.isArray(criteria.FirstLoanType)) {
      return criteria.FirstLoanType;
    }
    return [];
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignName.trim()) {
      setError('Campaign name is required');
      return;
    }
    
    if (!campaignDate) {
      setError('Campaign date is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const campaignData: Campaign = {
        campaign_name: campaignName,
        description: generateDescription(),
        campaign_date: campaignDate,
        status: 'DRAFT',
        target_loan_types: extractTargetLoanTypes(),
        target_states: extractTargetStates(),
        created_by: username
      };
      
      const response = await createCampaign(campaignData);
      
      if (response.success && response.campaign && response.campaign.campaign_id) {
        onSuccess(response.campaign.campaign_id);
        onHide();
      } else {
        setError(response.error || 'Failed to create campaign');
      }
    } catch (err) {
      setError('Error creating campaign: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  // Set default campaign date to today
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setCampaignDate(formattedDate);
  }, []);
  
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Campaign</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <div className="alert alert-danger">{error}</div>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Campaign Name</Form.Label>
            <Form.Control
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Enter campaign name"
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Campaign Date</Form.Label>
            <Form.Control
              type="date"
              value={campaignDate}
              onChange={(e) => setCampaignDate(e.target.value)}
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Description (Auto-generated)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={generateDescription()}
              readOnly
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Target States</Form.Label>
            <Form.Control
              type="text"
              value={extractTargetStates().join(', ')}
              readOnly
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Target Loan Types</Form.Label>
            <Form.Control
              type="text"
              value={extractTargetLoanTypes().join(', ')}
              readOnly
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={loading || !campaignName.trim() || !campaignDate}
        >
          {loading ? 'Creating...' : 'Create Campaign'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};