import React from 'react';
import { ListGroup, Badge, Col } from 'react-bootstrap';
import { CriterionDefinition } from '../../../shared/types/criteria';
import { PropertyRadarApiParams } from '../../types/api';

interface CriteriaSelectorProps {
  categoryCriteria: CriterionDefinition[];
  selectedCriterion: CriterionDefinition | null;
  activeCriteria: PropertyRadarApiParams['criteria'];
  onCriterionSelect: (criterion: CriterionDefinition) => void;
}

const CriteriaSelector: React.FC<CriteriaSelectorProps> = ({
  categoryCriteria,
  selectedCriterion,
  activeCriteria,
  onCriterionSelect,
}) => {
  // console.log(`Rendering selector. Found ${categoryCriteria.length} criteria.`);
  // console.log(`Current selected criterion: ${selectedCriterion?.name || 'none'}`);

  return (
    <Col md={4}>
      <div className="mb-2">
        <small className="text-muted">Select a criterion to configure:</small>
      </div>
      <ListGroup className="mb-3 criteria-list-group" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {categoryCriteria.map((criterion) => {
          const isSelected = (activeCriteria as any)?.[criterion.name] !== undefined;
          return (
            <ListGroup.Item
              key={criterion.name}
              action
              active={selectedCriterion?.name === criterion.name}
              onClick={() => onCriterionSelect(criterion)}
              className="d-flex justify-content-between align-items-center"
              style={{
                borderLeft: isSelected ? '4px solid var(--bs-success)' : undefined,
                transition: 'all 0.2s ease',
                cursor: 'pointer' // Ensure pointer cursor for action items
              }}
              // Add title attribute for full description on hover
              title={criterion.description}
            >
              <div>
                <div>{criterion.name}</div>
                {/* Truncate description visually, full text in title */}
                <small className="text-muted text-truncate d-block" style={{ maxWidth: '250px' }}> 
                  {criterion.description}
                </small>
              </div>
              {isSelected && (
                <Badge bg="success" pill>✓</Badge>
              )}
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Col>
  );
};

export default CriteriaSelector;