# Technical Context

## Technologies Used
- **PostgreSQL**: Primary database system for storing all property and mailing data
- **SQL**: Used extensively for database queries, functions, triggers, and views
- **PropertyRadar API**: Source for property data and refinance opportunity identification
- **PL/pgSQL**: PostgreSQL's procedural language for stored procedures and functions
- **Cron Jobs**: For scheduling maintenance tasks like materialized view refreshes and data archival

## Development Setup
- **Database**: PostgreSQL database named "Api-Property-Details"
- **File Paths**:
  - CSV Base Path: `C:\Users\SeanBoggs\Scripts\dbmailprep`
  - Log Base Path: `C:\Users\SeanBoggs\Scripts\propertyradar\logs`
- **Database User**: Requires a user with permissions to create tables, functions, triggers, and views
- **Scheduled Tasks**: System requires scheduled tasks for maintenance operations

## Technical Constraints
- **Loan ID Format**: Must follow the specified format `[LoanType][State][YY][Week]-[Sequence]` for compatibility with existing processes
- **Backward Compatibility**: Must maintain the `mailready` table structure for compatibility with existing mailing processes
- **Performance Considerations**: 
  - History tables will grow over time and require archival
  - Materialized views need regular refreshing
  - Indexes are critical for lookup performance
- **Data Validation**: Property data from PropertyRadar must be validated and standardized before use

## Dependencies
- **PostgreSQL 12+**: Required for all database functionality
- **PropertyRadar API**: For property data sourcing
- **Task Scheduler/Cron**: For scheduled maintenance tasks
- **Database Backup System**: Not explicitly defined in the implementation but required for production use
- **CSV Processing Tools**: For importing/exporting mail campaign data
