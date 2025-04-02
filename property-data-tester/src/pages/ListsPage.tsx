import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Spinner, Alert, Form } from 'react-bootstrap';
import { listService } from '../services/list.service';
import ProcessMultipleListsModal from '../components/ProcessMultipleListsModal';

const ListsPage: React.FC = () => {
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [showProcessModal, setShowProcessModal] = useState<boolean>(false);
  
  useEffect(() => {
    fetchLists();
  }, []);
  
  const fetchLists = async () => {
    try {
      setLoading(true);
      const response = await listService.getLists();
      console.log('Lists response:', response);
      
      if (response.success) {
        setLists(response.lists || []);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch lists');
        console.error('Error fetching lists:', response.details);
      }
    } catch (err) {
      setError('Failed to fetch lists. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleListSelection = (listId: number) => {
    if (selectedLists.includes(listId)) {
      setSelectedLists(selectedLists.filter(id => id !== listId));
    } else {
      setSelectedLists([...selectedLists, listId]);
    }
  };
  
  return (
    <Container fluid className="mt-4">
      {/* Process Multiple Lists Modal */}
      {showProcessModal && (
        <ProcessMultipleListsModal
          show={showProcessModal}
          onHide={() => setShowProcessModal(false)}
          selectedLists={selectedLists}
          listData={lists}
        />
      )}
      <Row>
        <Col>
          <h1>PropertyRadar Lists</h1>
          <p>View and process your PropertyRadar lists</p>
          
          {error && <Alert variant="danger">{error}</Alert>}
          
          {loading ? (
            <div className="text-center my-5">
              <Spinner animation="border" />
              <p className="mt-2">Loading lists...</p>
            </div>
          ) : (
            <Card>
              <Card.Header>
                <Row>
                  <Col>
                    <h5 className="mb-0">Your Lists</h5>
                  </Col>
                  <Col xs="auto">
                    <Button
                      variant="primary"
                      size="sm"
                      className="me-2"
                      disabled={selectedLists.length === 0}
                      onClick={() => setShowProcessModal(true)}
                    >
                      Check Duplicates ({selectedLists.length})
                    </Button>
                    <Button variant="outline-primary" size="sm" onClick={fetchLists}>
                      Refresh
                    </Button>
                  </Col>
                </Row>
              </Card.Header>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>List Name</th>
                      <th>Type</th>
                      <th>Items</th>
                      <th>Created</th>
                      <th>Modified</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lists.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center">No lists found</td>
                      </tr>
                    ) : (
                      lists.map(list => (
                        <tr key={list.ListID}>
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={selectedLists.includes(list.ListID)}
                              onChange={() => toggleListSelection(list.ListID)}
                              aria-label={`Select list ${list.ListName}`}
                            />
                          </td>
                          <td>{list.ListName}</td>
                          <td>{list.ListType}</td>
                          <td>{list.TotalCount || list.Count || list.ItemCount || 0}</td>
                          <td>{list.CreatedDate ? new Date(list.CreatedDate).toLocaleDateString() : 'N/A'}</td>
                          <td>{list.ModifiedDate ? new Date(list.ModifiedDate).toLocaleDateString() : 'N/A'}</td>
                          <td>
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => window.location.href = `#lists/${list.ListID}/process`}
                            >
                              Process
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default ListsPage;