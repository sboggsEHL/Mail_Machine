import React, { useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { CampaignList } from './CampaignList';
import { CampaignDetail } from './CampaignDetail';

/**
 * Campaign Manager component for managing mail campaigns
 */
export const CampaignManager: React.FC = () => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  
  // Handle campaign selection
  const handleSelectCampaign = (campaignId: number) => {
    setSelectedCampaignId(campaignId);
  };
  
  // Handle back button click
  const handleBack = () => {
    setSelectedCampaignId(null);
  };
  
  return (
    <Container className="campaign-manager mt-4">
      <Row>
        <Col>
          <h1 className="mb-4">Campaign Manager</h1>
          
          <Card>
            <Card.Body>
              {selectedCampaignId ? (
                <CampaignDetail 
                  campaignId={selectedCampaignId} 
                  onBack={handleBack} 
                />
              ) : (
                <CampaignList 
                  onSelectCampaign={handleSelectCampaign} 
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};