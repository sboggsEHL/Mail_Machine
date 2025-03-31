# Active Context

## Current Work Focus
- Building and optimizing the PropertyRadar criteria selection interface
- Implementing various criteria types with appropriate UI components
- Implementing JWT-based authentication for the PropertyRadar API tester application
- Implementing the normalized database structure to support multiple lead providers
- Setting up the core tables, relationships, and automated workflows
- Establishing the loan ID generation system
- Creating views for loan officer interfaces

## Recent Changes
- Implemented a robust criteria builder interface for PropertyRadar searches
- Added specialized UI components for different criteria types:
  - BooleanCriteriaComponent - for Yes/No criteria
  - MultipleValuesComponent - for comma-separated text inputs
  - MultipleRangeComponent - for min/max ranges
  - MultipleValuesBeginningWithComponent - for partial matching
  - SingleValueComponent - for single-value inputs
  - PropertyTypeComponent - for property type selection
  - DateCriteriaComponent - for date-related criteria
- Fixed state management issues in the criteria selection UI
- Added JSON preview to show criteria before submission
- Implemented visual feedback for selected criteria (colored badges)
- Added server-side criteria handling through CriteriaController and routes
- Converted from session-based authentication to JWT (JSON Web Token) based auth
- Created a dedicated auth service for token management and automatic refresh
- Fixed route mapping for authentication endpoints (/api/auth/login)
- Updated the main App component to handle authenticated vs. unauthenticated state
- Stored tokens in localStorage rather than cookies for stateless authentication
- Connected the system to the existing PostgreSQL database "mailhaus" with its users table
- Updated database implementation guide to match the normalized field mapping
- Split the guide into two files for better organization
- Added lead_providers table to support multiple data sources
- Created a separate property_owners table to handle multiple owners per property
- Enhanced the loans table with additional fields like loan_position and rate_type
- Updated all related triggers, functions, and views to work with the normalized structure
- Added comprehensive field mapping table showing how PropertyRadar fields map to database fields
- Documented practical examples of how to use the database

## Next Steps
- Integrate the specialized criteria components with the main criteria builder
- Add support for more complex criteria combinations (AND/OR logic)
- Implement saving/loading of common criteria groups
- Fix credential verification in UserRepository to ensure working login functionality
- Debug bcrypt password comparison for the existing users in the database
- Complete the authentication implementation with route protection
- Implement the database schema following the updated guide
- Set up scheduled tasks for materialized view refreshes and data archival
- Create any necessary API endpoints or interfaces for loan officer access
- Develop data import processes for PropertyRadar data
- Establish testing procedures for the complete workflow
- Implement security measures and access controls

## Active Decisions
- Implementing specialized UI components for different criteria types vs. a generic approach
- Using React state management with careful handling to prevent re-rendering issues
- Providing immediate visual feedback for criteria selection (badges)
- Adding JSON preview to help users understand the structure of their criteria
- Choosing JWT over session-based authentication for better scalability and stateless operation
- Storing tokens in localStorage rather than cookies for easier client-side management
- Determining the optimal archival strategy for historical data
- Considering performance optimizations for large data volumes
- Evaluating security measures for protecting sensitive property and owner information
- Deciding on monitoring and alerting systems for database health
- Planning for disaster recovery and backup procedures
- Evaluating how to handle multiple lead providers in the future
