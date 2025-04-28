import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Pagination, Modal, Form, Alert } from 'react-bootstrap';
import { PropertyListProps } from '../types/components';
import { PropertyRadarProperty } from '../types/api';
import { DnmForm } from '../types/api';
import { getProviderApi } from '../services/providerApiFactory';
import { useProvider } from '../context/ProviderContext';

interface User {
  id: number;
  username: string;
}

interface DnmStatus {
  loading: boolean;
  error: string | null;
  success: boolean;
  message?: string;
}

function PropertyList({ properties, selectedFields }: PropertyListProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showDnmModal, setShowDnmModal] = useState<boolean>(false);
  const [dnmForm, setDnmForm] = useState<DnmForm>({
    loanId: '',
    propertyId: '',
    radarId: '',
    reason: '',
    reasonCategory: 'Manual',
    notes: ''
  });
  const [currentProperty, setCurrentProperty] = useState<PropertyRadarProperty | null>(null);
  const [dnmStatus, setDnmStatus] = useState<DnmStatus>({ loading: false, error: null, success: false });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedProperty, setExpandedProperty] = useState<number | null>(null);
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
  const togglePropertyDetails = (index: number): void => {
    if (expandedProperty === index) {
      setExpandedProperty(null);
    } else {
      setExpandedProperty(index);
    }
  };
  
  const { selectedProvider } = useProvider();
  const api = getProviderApi(selectedProvider);

  // Fetch current user on component mount
  useEffect(() => {
    const fetchCurrentUser = async (): Promise<void> => {
      try {
        const data = await api.getCurrentUser?.();
        if (data && data.user) {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, [api]);
  
  // Open DNM modal
  const openDnmModal = (property: PropertyRadarProperty): void => {
    setCurrentProperty(property);
    setDnmForm({
      loanId: property.LoanID || '',
      propertyId: '',
      radarId: property.RadarID || '',
      reason: '',
      reasonCategory: 'Manual',
      notes: ''
    });
    setDnmStatus({ loading: false, error: null, success: false });
    setShowDnmModal(true);
  };
  
  // Handle DNM form submission
  const handleDnmSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!currentUser) {
      setDnmStatus({
        loading: false,
        error: 'You must be logged in to add to DNM registry',
        success: false
      });
      return;
    }
    
    setDnmStatus({ loading: true, error: null, success: false });
    
    try {
      const data = await api.addToDnm?.(dnmForm);

      if (data && data.success) {
        setDnmStatus({
          loading: false,
          error: null,
          success: true,
          message: data.message
        });

        setTimeout(() => {
          setShowDnmModal(false);
          setDnmStatus({ loading: false, error: null, success: false });
        }, 2000);
      } else {
        setDnmStatus({
          loading: false,
          error: data?.error || 'Failed to add to DNM registry',
          success: false
        });
      }
    } catch (error) {
      setDnmStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to add to DNM registry',
        success: false
      });
    }
  };
  
  // Function to format property value for display
  const formatValue = (value: any): string => {
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
        ['EquityPercent', 'CLTV', 'FirstRate', 'LastTransferDownPaymentPercent'].includes(field)
      ) && value < 100) {
        return `${value}%`;
      }
      return value.toString();
    }
    return value.toString();
  };

  return (
    <>
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
                        <div className="d-flex gap-1">
                          <Button 
                            variant="outline-info" 
                            size="sm"
                            onClick={() => togglePropertyDetails(indexOfFirstItem + index)}
                            className="me-1"
                          >
                            {expandedProperty === indexOfFirstItem + index ? 'Hide Details' : 'View Details'}
                          </Button>
                          
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => openDnmModal(property)}
                          >
                            Add to DNM
                          </Button>
                        </div>
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
      
      {/* DNM Modal */}
      <Modal show={showDnmModal} onHide={() => setShowDnmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add to Do Not Mail Registry</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!currentUser ? (
            <Alert variant="warning">
              You must be logged in to add to the DNM registry.
            </Alert>
          ) : (
            <Form onSubmit={handleDnmSubmit}>
              {currentProperty && (
                <div className="mb-3">
                  <p><strong>Property:</strong> {currentProperty.Address}, {currentProperty.City}, {currentProperty.State}</p>
                  <p><strong>Owner:</strong> {currentProperty.Owner || `${currentProperty.OwnerFirstName || ''} ${currentProperty.OwnerLastName || ''}`}</p>
                  {currentProperty.RadarID && <p><strong>Radar ID:</strong> {currentProperty.RadarID}</p>}
                </div>
              )}
              
              {dnmStatus.error && (
                <Alert variant="danger">{dnmStatus.error}</Alert>
              )}
              
              {dnmStatus.success && (
                <Alert variant="success">{dnmStatus.message || 'Successfully added to DNM registry'}</Alert>
              )}
              
              <Form.Group className="mb-3">
                <Form.Label>Reason Category</Form.Label>
                <Form.Select
                  value={dnmForm.reasonCategory}
                  onChange={(e) => setDnmForm({...dnmForm, reasonCategory: e.target.value})}
                  required
                >
                  <option value="Manual">Manual</option>
                  <option value="Client Request">Client Request</option>
                  <option value="Returned Mail">Returned Mail</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Do Not Contact List">Do Not Contact List</option>
                  <option value="Other">Other</option>
                </Form.Select>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Reason</Form.Label>
                <Form.Control 
                  type="text"
                  placeholder="Specific reason for DNM"
                  value={dnmForm.reason}
                  onChange={(e) => setDnmForm({...dnmForm, reason: e.target.value})}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3}
                  placeholder="Additional details"
                  value={dnmForm.notes}
                  onChange={(e) => setDnmForm({...dnmForm, notes: e.target.value})}
                />
              </Form.Group>
              
              <div className="d-grid gap-2">
                <Button 
                  variant="danger" 
                  type="submit"
                  disabled={dnmStatus.loading || dnmStatus.success || !currentUser}
                >
                  {dnmStatus.loading ? 'Adding...' : 'Add to DNM Registry'}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

export default PropertyList;
