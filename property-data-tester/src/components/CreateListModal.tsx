import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { validateListName } from '../utils/listUtils';

interface CreateListModalProps {
  show: boolean;
  onHide: () => void;
  suggestedName: string;
  totalRecords: number;
  onCreateList: (listName: string) => Promise<void>;
}

const CreateListModal: React.FC<CreateListModalProps> = ({
  show,
  onHide,
  suggestedName,
  totalRecords,
  onCreateList
}) => {
  const [listName, setListName] = useState(suggestedName);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset state when modal is opened
  React.useEffect(() => {
    if (show) {
      setListName(suggestedName);
      setError(null);
      setIsCreating(false);
    }
  }, [show, suggestedName]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!listName.trim()) {
      setError('List name is required');
      return;
    }
    
    // Validate and format the list name
    const validatedName = validateListName(listName);
    
    setIsCreating(true);
    setError(null);
    
    try {
      await onCreateList(validatedName);
      onHide();
    } catch (err) {
      setError('Failed to create list. Please try again.');
      console.error('Error creating list:', err);
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create PropertyRadar List</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Your search matched <strong>{totalRecords}</strong> properties.
          Would you like to create a static list with these properties?
        </p>
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>List Name</Form.Label>
            <Form.Control
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter list name"
              maxLength={50}
              required
            />
            <Form.Text className="text-muted">
              Maximum 50 characters. You can modify the suggested name or use it as is.
            </Form.Text>
          </Form.Group>
          
          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
            </Alert>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isCreating}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isCreating || !listName.trim()}
        >
          {isCreating ? 'Creating...' : 'Create List'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateListModal;