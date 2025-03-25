# Property Data Management System Technical Documentation

> **Note on Viewing This Document**: This documentation contains Mermaid diagrams that require rendering. For best viewing experience:
> 
> 1. Open in VS Code with the [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension
> 2. View on GitHub which natively supports Mermaid
> 3. Use a Markdown viewer that supports Mermaid diagrams (like Typora)
> 4. Or paste the Mermaid code blocks into the [Mermaid Live Editor](https://mermaid.live/)

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Database Architecture](#2-database-architecture)
3. [Data Collection Pipeline](#3-data-collection-pipeline)
4. [Web Application](#4-web-application)
5. [Mail Generation System](#5-mail-generation-system)
6. [Integration Points](#6-integration-points)
7. [Security Features](#7-security-features)
8. [Error Handling & Logging](#8-error-handling--logging)
9. [Maintenance & Troubleshooting](#9-maintenance--troubleshooting)

---

## 1. System Overview

### 1.1 System Purpose
This integrated system fetches, processes, stores, and displays property data from PropertyRadar's API. It consists of:
- A data collection pipeline (Python scripts)
- PostgreSQL database storage
- Web application interface (Flask)
- Mail generation system (Python scripts and Adobe InDesign)

### 1.2 High-Level Architecture

```mermaid
graph TD
    subgraph "External Systems"
        A1[PropertyRadar API]
    end

    subgraph "Data Collection Pipeline"
        B1[ridv1.py] --> B2[deets2.py]
        B2 --> B3[sendit.py]
    end

    subgraph "Database Layer"
        C1[propradar]
        C2[propradar2024]
        C3[api_property_details]
        C4[api_property_details2024]
        C5[Elevated-Logins]
        C6[mailready]
    end

    subgraph "Web Application"
        D1[app.py]
        D2[Templates]
    end
    
    subgraph "Mail Generation System"
        E1[mailload.py]
        E2[batch.py]
        E3[mergetem.py]
        E4[Adobe InDesign Scripts]
    end

    A1 --> B1
    B3 --> C1
    B3 --> C2
    C1 -->|Trigger| C3
    C2 -->|Manual Sync| C4
    D1 --> C3
    D1 --> C4
    D1 --> C5
    D1 --> D2
    
    C3 --> E1
    E1 --> C6
    C6 --> E2
    E2 --> E3
    E3 --> E4
```

### 1.3 System Components
1. **Data Collection Pipeline**: Three Python scripts that fetch, process, and store property data
2. **Database Layer**: PostgreSQL database with multiple tables for current and historical data
3. **Web Application**: Flask application providing user authentication and property data views
4. **Mail Generation System**: Scripts and applications for generating direct mail campaigns

---

## 2. Database Architecture

### 2.1 Database Schema

```mermaid
erDiagram
    propradar {
        varchar radarid PK
        varchar state
        varchar county
        varchar city
        varchar address
        varchar owner
        varchar owner2
        timestamp created_date
        timestamp last_updated
    }
    
    api_property_details {
        varchar input_id PK
        varchar loan_id UK
        varchar data_propertyinfo_address_state
        varchar data_ownerinfo_owner1fullname
        varchar data_currentmortgages_loantypecode
        timestamp insert_date
    }
    
    propradar ||--o{ api_property_details : "trigger_sync"
    
    propradar2024 {
        varchar radarid PK
        varchar state
        varchar county
        timestamp created_date
    }
    
    api_property_details2024 {
        varchar input_id PK
        varchar loan_id UK
        varchar data_propertyinfo_address_state
    }
    
    Elevated-Logins {
        varchar "User Name" PK
        varchar "Password"
    }
    
    mailready {
        varchar loan_id FK
        varchar first_name
        varchar last_name
        varchar address
        varchar city_state_zip
        varchar presort_tray
        varchar barcode
        varchar lender
        varchar loan_type
        varchar balance
        varchar close_month
        varchar skip_month
        varchar next_pay_month
        date mail_date
        varchar phone_number
        varchar city
    }
    
    api_property_details ||--o{ mailready : "loan_id"
```

### 2.2 Table Definitions

#### 2.2.1 propradar
- **Purpose**: Primary data storage for property records
- **Key Fields**:
  - radarid (PK): Unique identifier from PropertyRadar
  - state: Property state code
  - county: Property county
  - address: Physical address
  - owner/owner2: Property owners
  - firstloantype: Type code for first mortgage
  - created_date: Record creation timestamp
  - last_updated: Record update timestamp

#### 2.2.2 api_property_details
- **Purpose**: Formatted property data for application consumption
- **Key Fields**:
  - input_id (PK): Matches radarid from propradar
  - loan_id (UK): Generated ID for application reference
  - data_propertyinfo_*: Property attributes
  - data_ownerinfo_*: Owner information
  - data_currentmortgages_*: Mortgage details
  - insert_date: Record creation timestamp

#### 2.2.3 propradar2024 & api_property_details2024
- **Purpose**: Historical/archival data storage from 2024
- **Structure**: Mirrors the main tables

#### 2.2.4 Elevated-Logins
- **Purpose**: User authentication for web application
- **Key Fields**:
  - "User Name" (PK): Login username
  - "Password": Bcrypt hashed password

#### 2.2.5 mailready
- **Purpose**: Prepared data for mail generation
- **Key Fields**:
  - loan_id (FK): References api_property_details.loan_id
  - first_name/last_name: Recipient name
  - address/city_state_zip: Mailing address
  - presort_tray/barcode: Mail processing information
  - lender/loan_type/balance: Loan information from api_property_details
  - close_month/skip_month/next_pay_month: Calculated payment months
  - mail_date: Scheduled mail date
  - phone_number: Contact phone
  - city: City name

### 2.3 Triggers and Functions

#### 2.3.1 api_property_details_before_insert
- **Type**: BEFORE INSERT
- **Action**: Executes set_loan_id() function
- **Purpose**: Generates loan_id for new records

#### 2.3.2 set_loan_id()
```sql
CREATE OR REPLACE FUNCTION public.set_loan_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.loan_id := generate_loan_id(NEW.data_propertyinfo_address_state, NEW.data_currentmortgages_loantypecode);
    RETURN NEW;
END;
$function$
```

#### 2.3.3 generate_loan_id()
```sql
CREATE OR REPLACE FUNCTION public.generate_loan_id(state_abbreviation text, loantypecode text)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    first_letter_loantype TEXT := SUBSTRING(loantypecode FROM 1 FOR 1);
    current_year TEXT := TO_CHAR(CURRENT_DATE, 'YY');
    current_week TEXT := TO_CHAR(CURRENT_DATE, 'IW');
    sequence_number TEXT := LPAD(nextval('loan_id_sequence')::TEXT, 5, '0');
BEGIN
    RETURN first_letter_loantype || state_abbreviation || current_year || current_week || '-' || sequence_number;
END;
$function$
```

#### 2.3.4 Propradar-to-API Triggers
- **insert_api_property_details**: Syncs data from propradar to api_property_details
- **sync_to_api_property_details**: Redundant sync mechanism for data integrity
- **trigger_insert_mailedradarid**: Tracks processed radarIDs
- **log_propradar_updates**: Records changes to property data

### 2.4 Database Sequences
- **loan_id_sequence**:
  - Current value: ~81840
  - Max value: 99999
  - Used by generate_loan_id()

---

## 3. Data Collection Pipeline

### 3.1 ridv1.py - Data Identification

#### 3.1.1 Purpose
Identifies and filters property records from PropertyRadar API that need to be processed.

#### 3.1.2 Process Flow

```mermaid
flowchart TD
    A[Start] --> B[Initialize API Connection]
    B --> C[Get List of Property Collections]
    C --> D[User Selects Lists & Record Count]
    D --> E[Configure Logging]
    E --> F[Connect to Database]
    
    subgraph "For Each List"
        G[Fetch RadarIDs in Pages]
        H[Check Each RadarID Against Database]
        I[Separate Unique vs. Duplicate IDs]
    end
    
    F --> G
    G --> H
    H --> I
    I --> J{More Lists/Pages?}
    J -->|Yes| G
    J -->|No| K[Save Unique IDs to JSON]
    K --> L[Save Duplicate IDs to JSON]
    L --> M[Execute deets2.py]
    M --> N[End]
```

#### 3.1.3 Key Components

**API Connection**
```python
base_url = "https://api.propertyradar.com/v1/lists"
api_key = os.environ.get('prapik')
headers = {"Authorization": f"Bearer {api_key}"}
```

**Database Check**
```python
def check_radarids_in_db(radar_ids, connection):
    # Checks radar_ids against propradar table
    # Returns set of matching IDs
```

**Output Files**
- `C:\Users\SeanBoggs\Scripts\propertyradar\radarids\{list_ids}_{date}_rid.json`
- `C:\Users\SeanBoggs\Scripts\propertyradar\radarids\{list_ids}_{date}_duplicates.json`

**Logging**
- `C:\Users\SeanBoggs\Scripts\propertyradar\logs\{list_ids}_{date}.log`

### 3.2 deets2.py - Data Collection

#### 3.2.1 Purpose
Fetches detailed property information for the unique RadarIDs identified by ridv1.py.

#### 3.2.2 Process Flow

```mermaid
flowchart TD
    A[Start] --> B[Load RadarIDs from JSON]
    B --> C[Configure API Connection]
    C --> D[Define Property Data Fields]
    
    subgraph "Process in Batches"
        E[Split RadarIDs into Batches of 300]
        F[Fetch Property Details for Each RadarID]
        G[Save Batch as JSON File]
    end
    
    D --> E
    E --> F
    F --> G
    G --> H{More Batches?}
    H -->|Yes| E
    H -->|No| I[Execute sendit.py]
    I --> J[End]
```

#### 3.2.3 Key Components

**Property Fields**
```python
fields = "RadarID,OwnershipType,Owner,Owner2,...,ListingStatus"
```

**API Request**
```python
def fetch_property_data(radar_id, page=1):
    property_url = f'https://api.propertyradar.com/v1/properties/{radar_id}'
    query = {
        "Fields": fields,
        "Purchase": 1,
    }
    response = requests.get(property_url, headers=headers, params=query)
    # Error handling and response processing
    return response.json()
```

**Batch Processing**
- Processes in batches of 300 records
- Saves each batch to separate JSON files
- Includes timestamps for traceability

**Output Files**
- `C:\Users\SeanBoggs\Scripts\propertyradar\results\{original_file}_{batch_number}_{date}_{timestamp}.json`

**Logging**
- `C:\Users\SeanBoggs\Scripts\propertyradar\logs\{list_id}_{date}_deets2runlog.txt`

### 3.3 sendit.py - Data Import

#### 3.3.1 Purpose
Processes and imports property data into the database system.

#### 3.3.2 Process Flow

```mermaid
flowchart TD
    A[Start] --> B[Merge JSON Files]
    B --> C[Connect to Database]
    C --> D[Create UPSERT Query]
    
    subgraph "Data Processing"
        E[Extract Data Fields]
        F[Format for Database]
        G[Deduplicate Records]
    end
    
    D --> E
    E --> F
    F --> G
    G --> H[Insert in Batches of 1000]
    H --> I[Log Results]
    I --> J[Close Connections]
    J --> K[End]
```

#### 3.3.3 Key Components

**Data Consolidation**
```python
def merge_json_files(directory, output_file):
    # Combines all batch JSON files into a single file
```

**UPSERT Query Construction**
```python
insert_query = sql.SQL("""
    INSERT INTO propradar (
        {insert_columns}
    ) VALUES %s
    ON CONFLICT (radarid) DO UPDATE SET 
    {update_parts}
""").format(
    insert_columns=insert_columns,
    update_parts=sql.SQL(", ").join(update_parts)
)
```

**Batch Processing**
```python
# Process in batches of 1000 records
for i in range(0, len(deduped_rows), batch_size):
    batch = deduped_rows[i:i+batch_size]
    execute_values(cur, insert_query, batch)
```

**Output Files**
- `C:\Users\SeanBoggs\Scripts\propertyradar\batches\merged_data.json`

**Logging**
- `C:\Users\SeanBoggs\Scripts\propertyradar\logs\{date}-successful-import-{timestamp}.log`

---

## 4. Web Application

### 4.1 Flask Application Architecture

#### 4.1.1 Structure

```mermaid
flowchart TD
    A[app.py] --> B[Templates]
    A --> C[Static Files]
    
    subgraph "Core Routes"
        D[/ - index]
        E[/login - login]
        F[/validate-login - validate_login]
        G[/validate-id - validate_id]
        H[/property/:loan_id - details]
    end
    
    subgraph "Helper Functions"
        I[get_db_connection]
        J[check_id_in_database]
        K[property_details]
        L[format_currency]
    end
    
    A --> D
    A --> E
    A --> F
    A --> G
    A --> H
    A --> I
    A --> J
    A --> K
    A --> L
```

#### 4.1.2 Route Definitions

1. **/** (index)
   - Redirects to login if no session
   - Shows search interface if authenticated

2. **/login** (login)
   - Displays login form

3. **/validate-login** (validate_login)
   - Authenticates users against Elevated-Logins
   - Creates session on success

4. **/validate-id** (validate_id)
   - AJAX endpoint for validating loan_id
   - Checks both current and 2024 tables

5. **/property/:loan_id** (details)
   - Displays property details for a loan_id
   - Tries both current and 2024 tables

### 4.2 Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Flask
    participant Database
    
    User->>Flask: Access /
    Flask->>User: Redirect to /login
    User->>Flask: Submit credentials
    Flask->>Database: Query Elevated-Logins
    Database-->>Flask: Return user record
    
    alt Valid Credentials
        Flask->>Flask: bcrypt.check_password_hash()
        Flask->>Flask: Create session
        Flask->>User: Redirect to search interface
    else Invalid Credentials
        Flask->>User: Flash error & redirect to login
    end
```

### 4.3 Property Search Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Flask
    participant Database
    
    User->>Frontend: Enter loan_id
    Frontend->>Flask: AJAX call to /validate-id
    Flask->>Database: check_id_in_database()
    Database-->>Flask: ID exists?
    Flask-->>Frontend: JSON response
    
    alt Valid ID
        Frontend->>Flask: Navigate to /property/:loan_id
        Flask->>Database: Query api_property_details
        
        alt Record Found
            Database-->>Flask: Return property data
        else Not Found
            Flask->>Database: Query api_property_details2024
            Database-->>Flask: Return property data
        end
        
        Flask->>User: Render details.html
    else Invalid ID
        Frontend->>User: Display error
    end
```

### 4.4 Key Functions

#### 4.4.1 Database Connection
```python
def get_db_connection():
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        port=os.getenv('DB_PORT')
    )
    return conn
```

#### 4.4.2 ID Validation
```python
def check_id_in_database(loan_id):
    # Checks both current and 2024 tables
    # Returns True if ID exists in either
```

#### 4.4.3 Property Details
```python
def property_details(loan_id):
    # First tries api_property_details
    # Falls back to api_property_details2024
    # Formats property data for template
```

---

## 5. Mail Generation System

### 5.1 System Overview
The mail generation system is responsible for preparing and producing direct mail campaigns based on property data. It consists of:

1. **Data Preparation**: Loads and processes CSV data into the mailready table
2. **Batch Processing**: Splits data into manageable batches for mail production
3. **Document Generation**: Creates personalized PDF documents using Adobe InDesign

### 5.2 Mail Generation Process Flow

```mermaid
flowchart TD
    A[CSV Input] --> B[mailload.py]
    B --> C[Database: mailready table]
    C --> D[batch.py]
    D --> E[CSV Batches by Tray]
    E --> F[mergetem.py]
    F --> G[InDesign Script Generation]
    G --> H[merge1.jsx]
    H --> I[PDF Documents]
    
    subgraph "Data Preparation"
        B
        C
    end
    
    subgraph "Batch Processing"
        D
        E
    end
    
    subgraph "Document Generation"
        F
        G
        H
        I
    end
```

### 5.3 mailload.py - Data Preparation

#### 5.3.1 Purpose
Processes CSV data, fetches additional information from the database, and loads the combined data into the mailready table.

#### 5.3.2 Key Functions

**Month Calculation**
```python
def calculate_months():
    today = datetime.now()
    close_month = (today + timedelta(days=21)).strftime("%B")
    skip_month = (today + timedelta(days=21 + 32)).strftime("%B")
    next_pay_month = (today + timedelta(days=21 + 32 + 32)).strftime("%B")
    return close_month, skip_month, next_pay_month
```

**Mail Date Calculation**
```python
def calculate_mail_date():
    today = datetime.now()
    days_until_friday = (4 - today.weekday()) % 7
    mail_date = today + timedelta(days=days_until_friday)
    return mail_date.strftime("%Y-%m-%d")
```

#### 5.3.3 Data Processing

1. Reads a CSV file containing loan IDs and recipient information
2. Fetches additional data from api_property_details (lender, loan type, balance)
3. Calculates dynamic values (close month, skip month, next pay month, mail date)
4. Performs batch insert into the mailready table

```python
# Efficient database query for additional data
cur.execute("""
    SELECT loan_id, data_currentmortgages_lendername, data_currentmortgages_loantypecode, data_openmortgagebalance
    FROM api_property_details
    WHERE loan_id = ANY(%s)
""", (loan_ids,))
additional_data = {row[0]: row[1:] for row in cur.fetchall()}
```

**Database Connection**
- Uses environment variables for database credentials
- Connects to Api-Property-Details database

**Batch Insert**
```python
execute_values(cur, insert_query, data_to_insert)
```

**Logging**
- Logs activity to mailload.log

### 5.4 batch.py - Batch Processing

#### 5.4.1 Purpose
Splits a CSV file into multiple smaller files based on the presort_tray column, enabling efficient mail production in batches.

#### 5.4.2 Key Functions

**CSV Splitting**
```python
def split_csv_by_column(csv_path, output_folder, column_name):
    # Load the CSV file
    df = pd.read_csv(csv_path)
    
    # Group by the specified column
    grouped_df = df.groupby(column_name)
    
    # Save each group to a separate CSV file
    for group_value, group in grouped_df:
        output_file = os.path.join(output_folder, f"batch_{group_value}.csv")
        group.to_csv(output_file, index=False)
```

#### 5.4.3 Process Flow

1. Loads a CSV file (`C:\Users\SeanBoggs\Scripts\batch\3-19.csv`)
2. Creates a dated output folder (`C:\Users\SeanBoggs\Scripts\batch\batches\MM-DD Batch`)
3. Groups records by presort_tray value
4. Saves each group as a separate CSV file (`batch_TXXXXX.csv`)

### 5.5 mergetem.py - InDesign Script Preparation

#### 5.5.1 Purpose
Dynamically generates an Adobe InDesign script that will process all batch CSV files for mail merging.

#### 5.5.2 Process Flow

1. Scans a directory for CSV batch files
2. Loads an InDesign script template
3. Updates the template with the list of CSV files
4. Saves the updated script for execution

#### 5.5.3 Key Components

**Script Locations**
- Template: `C:\Users\SeanBoggs\AppData\Roaming\Adobe\InDesign\Version 20.0\en_US\Scripts\Scripts Panel\merge.jsx`
- Output: `C:\Users\SeanBoggs\AppData\Roaming\Adobe\InDesign\Version 20.0\en_US\Scripts\Scripts Panel\merge1.jsx`

**Template Modification**
```python
# Convert the list of CSV files to a JavaScript array representation
csv_files_js_array = json.dumps(csv_files).replace('"', "'")

# Replace placeholder in the JSX template with the actual CSV files array
jsx_content_updated = jsx_content.replace('var csvFiles = []; // Placeholder', f'var csvFiles = {csv_files_js_array};')
```

### 5.6 Adobe InDesign Scripts

#### 5.6.1 merge.jsx (Template)
InDesign script template with a placeholder for CSV files that will be updated by mergetem.py.

```javascript
// This array will be dynamically updated by the Python script
var csvFiles = []; // Placeholder

var inddFilePath = "C:/Users/SeanBoggs/Scripts/batch/8.5 x 11 VA letter not aztest.indd";
var pdfOutputDir = "C:/Users/SeanBoggs/Scripts/batch/batches/03-19 Batch/";
var myPDFExportPreset = app.pdfExportPresets.item("[High Quality Print]");

// Script logic to process each CSV file
// ...
```

#### 5.6.2 merge1.jsx (Generated Script)
The dynamically generated InDesign script with the CSV files array populated.

```javascript
var csvFiles = ['batch_T02110.csv', 'batch_T02111.csv', ...];

// Template and output paths
var inddFilePath = "C:/Users/SeanBoggs/Scripts/batch/8.5 x 11 VA letter not aztest.indd";
var pdfOutputDir = "C:/Users/SeanBoggs/Scripts/batch/batches/03-19 Batch/";
// ...
```

#### 5.6.3 Process Flow

1. Opens an InDesign template document
2. For each CSV batch file:
   - Sets the file as a data source for mail merge
   - Executes the merge operation
   - Exports the result as a PDF
   - Closes the merged document
3. Displays a completion message

---

## 6. Integration Points

### 6.1 Data Flow Integration

```mermaid
flowchart TB
    subgraph "Data Collection"
        A1[ridv1.py] -->|Identify| A2[deets2.py]
        A2 -->|Process| A3[sendit.py]
        A3 -->|Import| A4[Database]
    end
    
    subgraph "Data Access"
        B1[app.py] -->|Query| B2[Database]
        B2 -->|Render| B3[Web Interface]
    end
    
    subgraph "Mail Generation"
        C1[mailload.py] -->|Process| C2[Database]
        C2 -->|Export| C3[batch.py]
        C3 -->|Split| C4[mergetem.py]
        C4 -->|Generate| C5[Adobe InDesign]
    end
    
    A4 -->|Stored Data| B2
    A4 -->|Property Data| C1
```

### 6.2 Database to Application Mapping

| Pipeline Output | Database Table | Application Access |
|-----------------|----------------|-------------------|
| Property Data JSON | propradar | Through triggers |
| | api_property_details | Direct query in app.py |
| Historical Data | propradar2024 | Through manual sync |
| | api_property_details2024 | Fallback query in app.py |
| Mail Preparation | mailready | Processed by batch.py |

### 6.3 Key Integration Points

#### 6.3.1 Database Connection Configuration
All components use the same database connection parameters, stored as environment variables.

#### 6.3.2 loan_id as Universal Identifier
- Generated by database triggers in api_property_details 
- Used as the primary identifier in the web application
- Links property data to mail generation system

#### 6.3.3 Data Format Standardization
Field names and formats are consistent across all system components:
- Database: data_propertyinfo_address_label
- Web Application: {{data_propertyinfo_address_label}}
- Mail System: Uses consistent field mapping to CSV columns

---

## 7. Security Features

### 7.1 Authentication System

#### 7.1.1 Password Hashing
```python
bcrypt = Bcrypt(app)
# Password verification
bcrypt.check_password_hash(hashed_password, password)
```

#### 7.1.2 Session Management
```python
app.secret_key = os.getenv('FLASK_SECRET_KEY')
# Session storage
session['user'] = username
```

#### 7.1.3 Route Protection
```python
@app.route('/')
def index():
    if 'user' not in session:
        return redirect(url_for('login'))
```

### 7.2 Database Security

#### 7.2.1 Parameterized Queries
```python
cur.execute("SELECT EXISTS(SELECT 1 FROM api_property_details WHERE loan_id = %s)", (loan_id,))
```

#### 7.2.2 Environment Variable Configuration
```python
conn = psycopg2.connect(
    host=os.getenv('DB_HOST'),
    database=os.getenv('DB_NAME'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD')
)
```

---

## 8. Error Handling & Logging

### 8.1 Pipeline Logging

#### 8.1.1 ridv1.py
```python
logging.info(f"Found {len(matched_radar_ids)} matching RadarIDs in the database.")
logging.error(f"Error querying the database: {e}")
```

#### 8.1.2 deets2.py
```python
logging.info(f"API response for RadarID {radar_id}: {json.dumps(property_data, indent=4)}")
logging.error(f"Error occurred while running sendit.py: {str(e)}")
```

#### 8.1.3 sendit.py
```python
logging.info(f"Total records processed: {inserted_count}")
logging.info("Processed RadarIDs:")
```

### 8.2 Application Logging

#### 8.2.1 Request Logging
```python
@app.after_request
def log_response(response):
    logging.debug(f"Response Status: {response.status}")
    logging.debug(f"Response Data: {response.get_data(as_text=True)}")
    return response
```

#### 8.2.2 Error Handling
```python
try:
    # Database operations
except Exception as e:
    logging.error(f"Database error when checking ID {loan_id}: {e}")
    return False
finally:
    cur.close()
    conn.close()
```

### 8.3 Mail System Logging

#### 8.3.1 mailload.py
```python
logging.basicConfig(filename='mailload.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logging.info(f"Starting to process {len(rows)} records.")
logging.info("All records processed and committed to the database.")
```

---

## 9. Maintenance & Troubleshooting

### 9.1 Common Issues and Solutions

#### 9.1.1 Pipeline Issues
- **API Rate Limiting**: The deets2.py script may encounter rate limiting if fetching large batches
  - Solution: Adjust batch sizes or implement retry mechanism with backoff
  
- **Database Connection Failures**: Connection timeouts during long-running operations
  - Solution: Implement connection pooling or retry logic

#### 9.1.2 Application Issues
- **Missing Property Data**: Loan ID exists but no data displayed
  - Check both current and 2024 tables manually
  - Verify data in propradar table and trigger functionality

- **Authentication Failures**: Users unable to log in
  - Verify user exists in Elevated-Logins table
  - Check bcrypt password hash formatting

#### 9.1.3 Mail Generation Issues
- **CSV Processing Errors**: Errors in mailload.py
  - Verify CSV format matches expected structure
  - Check database connectivity and permissions
  
- **InDesign Script Failures**: Adobe InDesign script execution problems
  - Ensure file paths in merge.jsx template are correct
  - Verify InDesign has appropriate permissions for file access

### 9.2 System Monitoring

- **Log Monitoring**:
  - Review daily import logs in C:\Users\SeanBoggs\Scripts\propertyradar\logs
  - Check application logs for errors or unusual patterns
  - Monitor mailload.log for mail generation issues

- **Database Monitoring**:
  - Monitor loan_id_sequence value (approaching max of 99999)
  - Check for trigger failures or data integrity issues
  - Monitor mailready table growth

### 9.3 System Updates

- **API Changes**: If PropertyRadar API changes, update corresponding fields in:
  - deets2.py (fields variable)
  - sendit.py (json_keys and db_columns)
  
- **Database Schema Updates**:
  - Update both propradar and api_property_details tables
  - Modify triggers and functions as needed
  - Update application queries to match new schema

- **Mail Template Updates**:
  - Update the InDesign template (8.5 x 11 VA letter not aztest.indd)
  - Ensure CSV field mappings align with any changes

This comprehensive documentation covers all aspects of the integrated Property Data Management System, from data collection through database storage to web display and mail generation. Each component is thoroughly explained with relevant code snippets and diagrams for clarity.
