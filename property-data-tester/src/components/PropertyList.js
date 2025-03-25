import React, { useState } from 'react';
import { Card, Table, Button, Pagination } from 'react-bootstrap';

function PropertyList({ properties, selectedFields }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedProperty, setExpandedProperty] = useState(null);
  const itemsPerPage = 5;
  
  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProperties = properties.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(properties.length / itemsPerPage);
  
  // Generate pagination items
  const paginationItems = [];
  for (let number = 1; number <= totalPages; number++) {
    paginationItems.push(
      <Pagination.Item 
        key={number} 
        active={number === currentPage}
        onClick={() => setCurrentPage(number)}
      >
        {number}
      </Pagination.Item>
    );
  }
  
  // Toggle property details
  const togglePropertyDetails = (index) => {
    if (expandedProperty === index) {
      setExpandedProperty(null);
    } else {
      setExpandedProperty(index);
    }
  };
  
  // Function to format property value for display
  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      // Format currency values
      if (
        selectedFields.some(field => 
          ['AVM', 'AvailableEquity', 'TotalLoanBalance', 'FirstAmount', 
          'SecondAmount', 'LastTransferValue', 'ListingPrice', 
          'DefaultAmount', 'DelinquentAmount'].includes(field)
        ) && 
        value > 100
      ) {
        return `$${value.toLocaleString()}`;
      }
      // Format percentage values
      if (selectedFields.some(field => 
        ['EquityPercent', 'CLTV', 'FirstRate', 'LastTransferDownPaymentPercent']
        .includes(field)) && 
        value < 100
      ) {
        return `${value}%`;
      }
      return value.toString();
    }
    return value.toString();
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title className="mb-0">Property Data</Card.Title>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>#</th>
                {selectedFields.slice(0, 5).map(field => (
                  <th key={field}>{field}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentProperties.map((property, index) => (
                <React.Fragment key={`property-${indexOfFirstItem + index}`}>
                  <tr>
                    <td>{indexOfFirstItem + index + 1}</td>
                    {selectedFields.slice(0, 5).map(field => (
                      <td key={`${field}-${indexOfFirstItem + index}`}>
                        {formatValue(property[field])}
                      </td>
                    ))}
                    <td>
                      <Button 
                        variant="outline-info" 
                        size="sm"
                        onClick={() => togglePropertyDetails(indexOfFirstItem + index)}
                      >
                        {expandedProperty === indexOfFirstItem + index ? 'Hide Details' : 'View Details'}
                      </Button>
                    </td>
                  </tr>
                  {expandedProperty === indexOfFirstItem + index && (
                    <tr>
                      <td colSpan={7}>
                        <div className="p-3">
                          <h5>Property Details</h5>
                          <Table size="sm" bordered>
                            <tbody>
                              {selectedFields.map(field => (
                                <tr key={`detail-${field}-${indexOfFirstItem + index}`}>
                                  <td className="fw-bold" style={{ width: '200px' }}>{field}</td>
                                  <td>{formatValue(property[field])}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="d-flex justify-content-center mt-3 mb-3">
            <Pagination>
              <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
              <Pagination.Prev onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} />
              {paginationItems}
              <Pagination.Next onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} />
              <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
            </Pagination>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

export default PropertyList;
