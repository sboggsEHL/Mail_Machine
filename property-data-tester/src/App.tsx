import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Alert, Navbar, Nav, NavDropdown } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import FieldSelector from './components/FieldSelector';
import ApiParamsForm from './components/ApiParamsForm';
import PropertyList from './components/PropertyList';
import InsertResults from './components/InsertResults';
import Login from './components/Login';
import { TestPage } from './components/archive/TestPage';
import { CampaignManager, CampaignCreationModal } from './components/campaigns';
import BatchJobManager from './components/BatchJobManager';
import PropertyFileProcessor from './components/PropertyFileProcessor';
import ListsPage from './pages/ListsPage';
import ListProcessPage from './pages/ListProcessPage';
import { PropertyRadarProperty, PropertyRadarApiParams } from './types/api';
import { createBatchJob } from './services/batchJob.service';
import { DATA_PROVIDERS, DataProvider } from './constants/providers';
import { useProvider } from './context/ProviderContext';
import { getProviderApi } from './services/providerApiFactory';
import authService from './services/auth.service';

interface FetchStatus {
  loading: boolean;
  error: string | null;
}

interface InsertStatus {
  loading: boolean;
  error: string | null;
}

interface InsertResultsData {
  success: boolean;
  error?: string;
  count: number;
  properties: Array<{
    propertyId: number | string;
    radarId: string;
    address: string;
    city: string;
    state: string;
  }>;
}

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<string>('main');
  // Data Provider selection state
  const { selectedProvider, setSelectedProvider } = useProvider();
  const api = getProviderApi(selectedProvider);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);

  // Data state
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [apiParams, setApiParams] = useState<PropertyRadarApiParams>({
    limit: 10,
    start: 1,
    purchase: 0,
    criteria: {},
    fields: []
  });
  const [properties, setProperties] = useState<PropertyRadarProperty[]>([]);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({ loading: false, error: null });
  const [insertStatus, setInsertStatus] = useState<InsertStatus>({ loading: false, error: null });
  const [insertResults, setInsertResults] = useState<InsertResultsData | null>(null);
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);
  const [showCampaignModal, setShowCampaignModal] = useState<boolean>(false);

  // Listen for URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1); // Remove the # character
      if (hash) {
        setCurrentPage(hash);
      } else {
        // Default to 'main' if hash is empty or just '#'
        setCurrentPage('main'); 
      }
    };

    // Set initial page based on hash
    handleHashChange();

    // Add event listener for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Clean up event listener
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Check authentication status on app load and when auth state changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Initialize auth service interceptors for token refreshing
        authService.setupInterceptors();
        
        // Only proceed with user data fetch if we have valid tokens
        if (!authService.isAuthenticated()) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          return;
        }

        // Get current user data if authenticated
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          throw new Error('Failed to get user data');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Clear everything on error
        authService.clearTokens();
        setCurrentUser(null);
        setIsAuthenticated(false);
        // Redirect to login page on error
        setCurrentPage('login');
        window.location.hash = 'login';
      } finally {
        setIsLoading(false);
      }
    };

    // Run auth check immediately
    checkAuth();
  }, []);

  // Handle successful login
  const handleLoginSuccess = async () => {
    try {
      // Get current user data after login
      const user = await authService.getCurrentUser();
if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          setCurrentPage('main');
          window.location.hash = 'main';
        } else {
          throw new Error('Failed to get user data after login');
        }
    } catch (error) {
      console.error('Login success handler error:', error);
      // Clear everything on error
      authService.clearTokens();
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    // Optionally redirect or set page state after logout
    setCurrentPage('login'); // Or wherever you want the user to land
    window.location.hash = ''; // Clear hash on logout
  };

  const handleFetchProperties = async (): Promise<void> => {
    if (selectedFields.length === 0) {
      setFetchStatus({ loading: false, error: 'Please select at least one field' });
      return;
    }

    setFetchStatus({ loading: true, error: null });
    setProperties([]);

    try {
      const data = await api.fetchProperties({
        fields: selectedFields,
        limit: apiParams.limit,
        start: apiParams.start,
        purchase: apiParams.purchase,
        criteria: apiParams.criteria
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch properties');
      }

      setProperties(data.properties);
      setFetchStatus({ loading: false, error: null });
    } catch (error) {
      setFetchStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };

  const handleInsertProperties = async (): Promise<void> => {
    if (properties.length === 0) {
      setInsertStatus({ loading: false, error: 'No properties to insert' });
      return;
    }

    setInsertStatus({ loading: true, error: null });
    setInsertResults(null);

    try {
      const data = await api.insertProperties(properties);

      if (!data.success) {
        throw new Error(data.error || 'Failed to insert properties');
      }

      setInsertResults(data);
      setInsertStatus({ loading: false, error: null });
    } catch (error) {
      setInsertStatus({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    }
  };

  const handleCreateBatchJob = async (): Promise<void> => {
    if (selectedFields.length === 0) {
      setFetchStatus({ loading: false, error: 'Please select at least one field' });
      return;
    }

    try {
      setBatchProcessing(true);
      
      // Create a batch job with the current criteria
      const job = await createBatchJob({
        fields: selectedFields,
        limit: apiParams.limit,
        start: apiParams.start,
        purchase: apiParams.purchase,
        criteria: apiParams.criteria
      });
      
      if (job) {
        // Show success message and navigate to batch jobs page
        alert(`Batch job created successfully! Navigating to Batch Jobs tab to view progress.`);
        setCurrentPage('batch-jobs');
        window.location.hash = 'batch-jobs'; // Update hash
      } else {
        throw new Error('Failed to create batch job');
      }
    } catch (error) {
      setFetchStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred creating batch job'
      });
    } finally {
      setBatchProcessing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Container className="mt-5 text-center">
        <h2>Loading...</h2>
      </Container>
    );
  }

  // Force logout function for debugging
  const forceLogout = () => {
    authService.clearTokens();
    setIsAuthenticated(false);
    setCurrentUser(null);
    window.location.hash = ''; // Clear hash
    window.location.reload(); // Force reload to show login
  };

  // Login page for unauthenticated users
  if (!isAuthenticated && currentPage !== 'login') { // Redirect to login if not authenticated
      // Set current page to login to avoid rendering other components
      // This check prevents infinite loops if Login component itself causes issues
      if (currentPage !== 'login') {
          setCurrentPage('login');
          window.location.hash = 'login'; // Optionally update hash
      }
  }
  
  if (!isAuthenticated || currentPage === 'login') {
      return (
          <Container className="mt-4">
              <h1 className="mb-4 text-center">PropertyRadar API Tester</h1>
              <Login onLoginSuccess={handleLoginSuccess} />
          </Container>
      );
  }


  // Main application for authenticated users
  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container>
          <div className="d-flex align-items-center">
            <Navbar.Brand href="#main" className="me-3">Property Data Tester</Navbar.Brand>
            <div className="provider-dropdown-container">
              <Button 
                variant="light" 
                className="provider-dropdown-button me-3"
                onClick={() => setShowProviderDropdown(!showProviderDropdown)}
              >
                Data Provider: {selectedProvider} ▼
              </Button>
              {showProviderDropdown && (
                <div className="provider-dropdown-menu">
                  {DATA_PROVIDERS.map((provider: DataProvider) => (
                    <Button
                      key={provider.id}
                      variant="link"
                      className={`provider-dropdown-item w-100 text-start ${selectedProvider === provider.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        setShowProviderDropdown(false);
                      }}
                    >
                      {provider.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link
                href="#main"
                active={currentPage === 'main'}
                onClick={() => { setCurrentPage('main'); window.location.hash = 'main'; }}
              >
                Main App
              </Nav.Link>
              {/* Criteria Demo and Test Page removed from navigation */}
              <Nav.Link
                href="#campaigns"
                active={currentPage === 'campaigns'}
                onClick={() => { setCurrentPage('campaigns'); window.location.hash = 'campaigns'; }}
              >
                Campaign Manager
              </Nav.Link>
              <Nav.Link
                href="#batch-jobs"
                active={currentPage === 'batch-jobs'}
                onClick={() => { setCurrentPage('batch-jobs'); window.location.hash = 'batch-jobs'; }}
              >
                Batch Jobs
              </Nav.Link>
              <Nav.Link
                href="#lists"
                active={currentPage === 'lists'}
                onClick={() => { setCurrentPage('lists'); window.location.hash = 'lists'; }}
              >
                PropertyRadar Lists
              </Nav.Link>
              <Nav.Link
                href="#property-files"
                active={currentPage === 'property-files'}
                onClick={() => { setCurrentPage('property-files'); window.location.hash = 'property-files'; }}
              >
                Process Property Files
              </Nav.Link>
            </Nav>
            <Nav>
              {currentUser && (
                <Navbar.Text className="me-3">
                  Signed in as: <b>{currentUser.username}</b>
                </Navbar.Text>
              )}
              <Button variant="outline-light" onClick={handleLogout} className="me-2">Logout</Button>
              <Button variant="outline-danger" onClick={forceLogout}>Force Login Screen</Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      <Container>
        {currentPage === 'main' && (
          <>
            <h1 className="mb-4">{selectedProvider} API Tester</h1>
            
            <Row className="mb-4">
              <Col lg={6}>
                <FieldSelector
                  selectedFields={selectedFields}
                  onFieldSelectionChange={setSelectedFields}
                />
              </Col>
              <Col lg={6}>
                <ApiParamsForm
                  apiParams={apiParams}
                  setApiParams={setApiParams}
                  onSubmitQuery={handleFetchProperties} // Pass the handler function
                />
                {/* The submit button is now rendered within ApiParamsForm */}
                {/* The div below contains the "Force Background Processing" button */}
                <div className="d-flex gap-2 mt-3"> 
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleCreateBatchJob}
                    disabled={fetchStatus.loading || batchProcessing}
                    title="Process this request in the background even if it's small"
                  >
                    {batchProcessing ? 'Processing...' : 'Force Background Processing'}
                  </Button>
                </div>
                
                {fetchStatus.error && (
                  <Alert variant="danger" className="mt-3">
                    {fetchStatus.error}
                  </Alert>
                )}
              </Col>
            </Row>
            
            {properties.length > 0 && (
              <>
                <Row className="mb-3">
                  <Col>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h2>Retrieved Properties ({properties.length})</h2>
                      <Button
                        variant="success"
                        onClick={() => setShowCampaignModal(true)}
                      >
                        Create Campaign
                      </Button>
                    </div>
                    <div className="d-grid gap-2">
                      <Button
                        variant="success"
                        size="lg"
                        onClick={handleInsertProperties}
                        disabled={insertStatus.loading}
                      >
                        {insertStatus.loading ? 'Inserting...' : 'Insert Into Database'}
                      </Button>
                    </div>
                    
                    {insertStatus.error && (
                      <Alert variant="danger" className="mt-3">
                        {insertStatus.error}
                      </Alert>
                    )}
                  </Col>
                </Row>
                
                <Row>
                  <Col>
                    <PropertyList properties={properties} selectedFields={selectedFields} />
                  </Col>
                </Row>
              </>
            )}
            
            {insertResults && (
              <Row className="mt-4">
                <Col>
                  <InsertResults results={insertResults} />
                </Col>
              </Row>
            )}
            
            {/* Campaign Creation Modal */}
            <CampaignCreationModal
              show={showCampaignModal}
              onHide={() => setShowCampaignModal(false)}
              criteria={apiParams.criteria}
              onSuccess={(campaignId) => {
                setShowCampaignModal(false);
                alert(`Campaign created successfully with ID: ${campaignId}`);
              }}
              username={currentUser?.username}
            />
          </>
        )}
        
        {/* Archived components - still available but hidden from navigation */}
        
        {currentPage === 'test-page' && (
          <TestPage />
        )}
        
        {currentPage === 'campaigns' && (
          <CampaignManager />
        )}
        
        {currentPage === 'batch-jobs' && (
          <BatchJobManager />
        )}
        
        {currentPage === 'property-files' && (
          <PropertyFileProcessor />
        )}
        
        {currentPage === 'lists' && (
          <ListsPage />
        )}
        
        {currentPage.startsWith('lists/') && currentPage.includes('/process') && (
          <ListProcessPage listId={currentPage.split('/')[1]} />
        )}
      </Container>
    </>
  );
}

export default App;
