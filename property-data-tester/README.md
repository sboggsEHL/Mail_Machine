# PropertyRadar API Tester

A React application for testing the PropertyRadar API and inserting property data into the Mailhaus database.

## Features

- Select which PropertyRadar API fields to retrieve
- Configure API parameters (limit, start, purchase)
- Fetch properties from PropertyRadar
- View property data in a paginated table
- Insert properties into the Mailhaus database
- Track insertion results

## Installation

1. Make sure you have Node.js installed on your system.
2. Clone this repository or navigate to the project folder.
3. Install the dependencies:

```bash
npm install
```

4. Configure environment variables:

Create a `.env` file in the root directory with the following variables:

```
# Database Configuration
PG_HOST=your-postgres-host
PG_PORT=your-postgres-port
PG_DATABASE=mailhaus
PG_USER=your-postgres-user
PG_PASSWORD=your-postgres-password
PG_SSL=true

# PropertyRadar API
PROPERTY_RADAR_TOKEN=your-propertyradar-token
```

## Usage

### Running the Application

To run both the server and client concurrently:

```bash
npm run dev
```

This will start:
- React frontend on [http://localhost:3000](http://localhost:3000)
- Express server on [http://localhost:3001](http://localhost:3001)

You can also run them separately:

```bash
# Start just the React frontend
npm run client

# Start just the Express server
npm run server
```

### Using the Application

1. **Select API Fields**:
   - Expand the field categories by clicking on them
   - Check the boxes for the fields you want to retrieve
   - Use "Select All" buttons to select all fields or all fields in a category

2. **Configure API Parameters**:
   - Set the limit (number of properties to retrieve, max 1000)
   - Set the start index (starting position in results)
   - Set the purchase parameter value

3. **Fetch Properties**:
   - Click the "Fetch Properties" button to retrieve data from PropertyRadar
   - View the retrieved properties in the table

4. **Insert Properties**:
   - After retrieving properties, click the "Insert Into Database" button
   - View the insertion results

## API Endpoints

The Express server provides the following endpoints:

- `GET /api/test-db`: Test the database connection
- `POST /api/fetch-properties`: Fetch properties from PropertyRadar API
- `POST /api/insert-properties`: Insert properties into the database

## Database Schema

This application inserts data into the following tables in the Mailhaus database:

- `lead_providers`: Information about property data providers
- `properties`: Main property information
- `property_owners`: Property owner information
- `loans`: Loan information associated with properties

## Project Structure

```
property-data-tester/
├── server.js                  # Express server
├── .env                       # Environment variables
├── package.json               # Project dependencies
├── public/                    # Static files
└── src/
    ├── App.js                 # Main React component
    ├── index.js               # React entry point
    └── components/
        ├── ApiParamsForm.js   # API parameters form
        ├── FieldSelector.js   # Field selection component
        ├── InsertResults.js   # Insertion results display
        └── PropertyList.js    # Property data table
