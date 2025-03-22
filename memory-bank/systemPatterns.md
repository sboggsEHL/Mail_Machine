# System Patterns

## Architecture
The Property Mail System follows a relational database-centric architecture with automated workflows triggered by data changes.

```mermaid
flowchart TD
    A[Property Data Import] --> B[PropRadar Table]
    B --> C{Triggers}
    C --> D[Generate Loan ID]
    C --> E[Sync to API Details]
    C --> F[Track in Mailed List]
    D --> G[Direct Mail Campaign]
    G --> H[Recipient Response]
    H --> I[Loan Officer Lookup]
```

The database structure follows this normalized relationship model:

```mermaid
graph TD
    A[Properties] --> B[Loans]
    A --> C[Property History]
    B --> D[Loan History]
    A --> E[DNM Registry]
    B --> E
    A --> F[Mail Recipients]
    B --> F
    G[Mail Campaigns] --> F
    F --> H[Mailready]
    I[System Config] -.-> All[All Tables]
    J[Processing Logs] -.-> All
    A --> K[Property Owners]
    L[Lead Providers] --> A
```

## Key Technical Decisions
- **PostgreSQL Database**: Using PostgreSQL for its robust transaction support, triggers, and functions.
- **Normalized Database Structure**: Implementing a normalized structure to support multiple lead providers and multiple owners per property.
- **Unique Loan ID Generation**: Implementing a specialized format `[LoanType][State][YY][Week]-[Sequence]` with collision handling.
- **Trigger-Based Automation**: Using database triggers to automate workflows when data changes.
- **History Tracking**: Maintaining complete history tables for audit and compliance purposes.
- **Materialized Views**: Using materialized views for performance-optimized reporting.
- **Archival Strategy**: Implementing automated archival processes to maintain performance while preserving historical data.

## Design Patterns
- **Repository Pattern**: Centralizing data access through structured tables and views.
- **Observer Pattern**: Using database triggers to observe changes and execute workflows.
- **Factory Pattern**: Implementing loan ID generation as a factory that creates standardized identifiers.
- **Strategy Pattern**: Using configurable system parameters to adjust business logic without code changes.
- **Decorator Pattern**: Enhancing base data with additional information through views and joins.
- **Adapter Pattern**: Using a consistent field naming convention to adapt data from different lead providers.

## Component Relationships
1. **Properties and Loans**: One-to-many relationship where a property can have multiple loans.
2. **Properties and Owners**: One-to-many relationship where a property can have multiple owners.
3. **Lead Providers and Properties**: One-to-many relationship where a lead provider can supply multiple properties.
4. **Properties/Loans and History**: One-to-many relationship tracking all changes to core data.
5. **Properties/Loans and DNM Registry**: Many-to-many relationship managing mailing restrictions.
6. **Mail Campaigns and Recipients**: One-to-many relationship organizing mailings into campaigns.
7. **Recipients and Mailready**: One-to-one relationship maintaining backward compatibility.
8. **System Config**: Global configuration affecting all components.
9. **Processing Logs**: System-wide logging capturing events across all components.

The system uses database views, particularly the `complete_property_view`, to present unified data across these relationships for loan officer interfaces.
