# Technical Context

## Technologies Used
- **PostgreSQL**: Primary database system for storing all property and mailing data
- **Node.js**: Server-side JavaScript runtime for the application backend
- **TypeScript**: Strongly-typed programming language used throughout the project
- **Express**: Web framework for building the API endpoints
- **React**: Frontend library for building user interfaces
- **JWT (JSON Web Token)**: Used for stateless authentication
- **PL/pgSQL**: PostgreSQL's procedural language for stored procedures and functions
- **PropertyRadar API**: Primary source for property data and refinance opportunity identification
- **Worker Processes**: Separate Node.js processes for handling background tasks
- **Cron Jobs**: For scheduling maintenance tasks like materialized view refreshes and data archival

## Development Setup
- **Database**: PostgreSQL database named "mailhaus"
- **Backend**: Node.js/Express API server
- **Frontend**: React application
- **Authentication**: JWT-based authentication with token refresh
- **Background Processing**: Worker processes for handling batch jobs
- **File Paths**:
  - CSV Base Path: `C:\Users\SeanBoggs\Scripts\dbmailprep`
  - Log Base Path: `C:\Users\SeanBoggs\Scripts\propertyradar\logs`
  - Property Payloads: `logs/property_payloads/[YYYY-MM]/`
- **Database User**: Requires a user with permissions to create tables, functions, triggers, and views
- **Scheduled Tasks**: System requires scheduled tasks for maintenance operations

## Technical Constraints
- **Normalized Database Structure**: Using a normalized structure to support multiple lead providers and multiple owners per property
- **Loan ID Format**: Must follow the specified format `[LoanType][State][YY][Week]-[Sequence]` for compatibility with existing processes
- **Backward Compatibility**: Must maintain the `mailready` table structure for compatibility with existing mailing processes
- **Performance Considerations**: 
  - History tables will grow over time and require archival
  - Materialized views need regular refreshing
  - Indexes are critical for lookup performance
  - Batch job processing must be optimized for large datasets
- **Data Validation**: Property data from lead providers must be validated and standardized before use
- **Asynchronous Processing**: Long-running operations must be handled asynchronously to maintain API responsiveness

## Dependencies
- **Node.js 14+**: Required for all server-side functionality
- **PostgreSQL 12+**: Required for all database functionality
- **PropertyRadar API**: For property data sourcing
- **React 17+**: For frontend functionality
- **TypeScript 4+**: For type safety throughout the codebase
- **Task Scheduler/Cron**: For scheduled maintenance tasks
- **Database Backup System**: Not explicitly defined in the implementation but required for production use
- **CSV Processing Tools**: For importing/exporting mail campaign data
- **Bcrypt**: For secure password hashing
- **JWT Libraries**: For authentication token management
- **Worker Thread Support**: For background job processing
