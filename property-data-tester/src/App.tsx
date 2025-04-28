import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Alert, Navbar, Nav } from 'react-bootstrap'; // Removed unused NavDropdown
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
// Removed unused import for createBatchJob
import { DATA_PROVIDERS, DataProvider } from './constants/providers';
import { useProvider } from './context/ProviderContext';
import { getProviderApi } from './services/providerApiFactory';
import authService from './services/auth.service';
import { listService } from './services/list.service';
import CreateListModal from './components/CreateListModal';
import { generateListName } from './utils/listUtils';
// Removed incorrect import of PropertyRadarCriteriaMapper from server code

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

  // State for List Creation
  const [showCreateListModal, setShowCreateListModal] = useState<boolean>(false);
  const [listCreationTotalRecords, setListCreationTotalRecords] = useState<number>(0);
  const [listCreationSuggestedName, setListCreationSuggestedName] = useState<string>('');
  const [isCalculatingPreview, setIsCalculatingPreview] = useState<boolean>(false);
  const [listCreationError, setListCreationError] = useState<string | null>(null);
  const [insertResults, setInsertResults] = useState<InsertResultsData | null>(null);
  // Removed unused batchProcessing state
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

  // Removed unused handleCreateBatchJob function


  // --- List Creation Handlers ---
  const handleCreateListClick = async () => {
    console.log('Entering handleCreateListClick. Provider:', selectedProvider);

    // Check 1: Correct Provider
    if (selectedProvider !== 'PropertyRadar') { // Use correct ID
      console.log('Exiting: Provider is not PropertyRadar');
      return;
    }
    console.log('Provider check passed.');

    // Check 2: Criteria Exist
    console.log('Checking criteria:', apiParams.criteria);
    if (!apiParams.criteria || Object.keys(apiParams.criteria).length === 0) {
      console.log('Exiting: Criteria are empty');
      setListCreationError('Please select at least one search criterion.');
      alert('Please select at least one search criterion.');
      return;
    }
    console.log('Criteria check passed.');

    console.log('Criteria check passed. Setting loading state and initiating preview call...'); // Log before API call
    setIsCalculatingPreview(true);
    setListCreationError(null);

    try {
      // Call the preview function (ensure it exists in listService or similar)
      const previewData = await listService.previewPropertyCount(apiParams.criteria);

      if (previewData.success && previewData.count !== undefined) {
        setListCreationTotalRecords(previewData.count);
        const suggestedName = generateListName(apiParams, previewData.count);
        setListCreationSuggestedName(suggestedName);
        console.log(`Preview successful, count: ${previewData.count}. Showing modal.`); // Add log
        setShowCreateListModal(true);
      } else {
        throw new Error(previewData.error || 'Failed to calculate matching records.');
      }
    } catch (error) {
      console.error('Error calculating records:', error);
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred during preview.';
      console.error('Error during preview API call:', error); // Log the full error
      setListCreationError(errorMsg);
      alert(`Error getting preview count: ${errorMsg}`); // Show alert to user
    } finally {
      setIsCalculatingPreview(false);
    }
  };

  const handleCreateList = async (finalListName: string) => {
    // This function is passed to the modal's onCreateList prop
    try {
      // Pass the criteria object directly; transformation happens on the backend
      const response = await listService.createList(
        apiParams.criteria,
        finalListName,
        'static',
        0
      );

      if (response.success) {
        alert(`List "${finalListName}" created successfully!`);
        // Optionally: Navigate to lists page or refresh list data
      } else {
        throw new Error(response.error || 'Failed to create list');
      }
    } catch (error) {
      console.error('Error creating list:', error);
      // Re-throw error so the modal can display it
      throw error;
    }
  };


// Removed duplicate handler function declarations that were incorrectly nested

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
                {/* --- Replace 'Force Background Processing' Button --- */}
                <div className="d-flex gap-2 mt-3">
                  {selectedProvider === 'PropertyRadar' && ( // Conditionally render for PropertyRadar
                    <Button
                      variant="success" // Or another appropriate variant
                      size="lg"
                      onClick={() => { console.log(`Create List button clicked! Provider: ${selectedProvider}`); handleCreateListClick(); }}
                      disabled={isCalculatingPreview || Object.keys(apiParams.criteria || {}).length === 0}
                      title="Create a PropertyRadar list from the current criteria"
                    >
                      {isCalculatingPreview ? 'Calculating...' : 'Create List'}
                    </Button>
                  )}
                  {/* Removed the old 'Force Background Processing' button */}
                </div>

                {/* Display Preview/Creation Errors */}
                {listCreationError && (
                  <Alert variant="danger" className="mt-3">
                    {listCreationError}
                  </Alert>
                )}
                
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
      {/* --- Render Modal (outside specific page views) --- */}
      <CreateListModal
        show={showCreateListModal}
        onHide={() => setShowCreateListModal(false)}
        suggestedName={listCreationSuggestedName}
        totalRecords={listCreationTotalRecords}
        onCreateList={handleCreateList}
      />
    </>
  );
}

export default App;
