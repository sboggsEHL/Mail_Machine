import React from 'react';
import { Card, Alert, ListGroup, Badge } from 'react-bootstrap';

function InsertResults({ results }) {
  if (!results || !results.success) {
    return (
      <Alert variant="danger">
        Failed to insert properties into the database.
        {results?.error && <div className="mt-2">{results.error}</div>}
      </Alert>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header className="bg-success text-white">
        <Card.Title className="mb-0">
          Successfully Inserted Properties
          <Badge bg="light" text="dark" className="ms-2">
            {results.count}
          </Badge>
        </Card.Title>
      </Card.Header>
      <Card.Body>
        <Alert variant="success">
          <i className="bi bi-check-circle-fill me-2"></i>
          Successfully inserted {results.count} properties into the database.
        </Alert>
        
        <h5>Inserted Properties:</h5>
        <ListGroup className="mt-3">
          {results.properties.map((property, index) => (
            <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Property ID: {property.propertyId}</strong> 
                <br />
                <span className="text-muted">
                  {property.address}, {property.city}, {property.state}
                </span>
              </div>
              <Badge bg="info">
                Radar ID: {property.radarId}
              </Badge>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
}

export default InsertResults;
