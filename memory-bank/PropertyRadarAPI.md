# PropertyRadar API Integration Guide

## Overview

This document provides detailed information about how to correctly integrate with the PropertyRadar API in our application. It covers the required request format, common pitfalls, and examples of successful API calls.

## API Endpoint

The base URL for the PropertyRadar API is:
```
https://api.propertyradar.com/v1
```

## Authentication

All requests to the PropertyRadar API require authentication using a Bearer token:

```
Authorization: Bearer YOUR_API_TOKEN
```

The token is stored in the environment variable `PROPERTY_RADAR_TOKEN`.

## Criteria Building UI

Our application provides a comprehensive UI for building PropertyRadar search criteria. The interface consists of:

1. **Category-based organization**: Criteria are organized into 9 logical categories (Location, Property, Owner Details, etc.)
2. **Type-specific input components**: Different UI components based on criteria type:
   - Boolean criteria: Yes/No dropdown selection
   - Multiple Values: Comma-separated text input or checkbox selection
   - Multiple Range: Min/Max numeric inputs
   - Single Value: Text input field
   - PropertyType: Checkbox selection for different property types
   - Date criteria: Date picker components
3. **Visual feedback**: Selected criteria appear as color-coded badges with an option to remove them
4. **JSON preview**: Shows the complete request payload before submission
5. **State persistence**: Maintains selected criteria during user interaction

### Component Structure

The criteria UI is built with these key components:

- **ApiParamsForm**: The main form component that handles basic parameters (limit, start, purchase)
- **CriteriaSelector**: Manages selection of criteria categories and items
- **BaseCriteriaComponent**: Base class for all criteria type components
- **BooleanCriteriaComponent**: For Yes/No criteria
- **MultipleValuesComponent**: For criteria that accept multiple values
- **MultipleRangeComponent**: For numeric range criteria
- **SingleValueComponent**: For single-value inputs
- **PropertyTypeComponent**: Specialized for property type selection
- **DateCriteriaComponent**: For date-related criteria

## Fetching Properties

### Endpoint

```
POST https://api.propertyradar.com/v1/properties
```

### URL Parameters

The following parameters should be included in the URL query string:

| Parameter | Description | Example |
|-----------|-------------|---------|
| Fields    | Comma-separated list of fields to retrieve | `Fields=RadarID,Address,City,State` |
| Limit     | Maximum number of properties to return (1-1000) | `Limit=10` |
| Start     | Starting position in results (pagination) | `Start=1` |
| Purchase  | Whether to purchase records (0=preview, 1=purchase) | `Purchase=0` |

Example URL:
```
https://api.propertyradar.com/v1/properties?Fields=RadarID,Address,City,State&Limit=10&Start=1&Purchase=0
```

### Request Body

The request body must contain ONLY a `Criteria` array with objects that have `name` and `value` properties:

```json
{
  "Criteria": [
    {
      "name": "State",
      "value": ["AZ"]
    },
    {
      "name": "PropertyType",
      "value": [
        {
          "name": "PType",
          "value": ["SFR", "CND"]
        }
      ]
    },
    {
      "name": "EquityPercent",
      "value": [
        [25, null]
      ]
    }
  ]
}
```

### IMPORTANT: Common Pitfalls

1. **DO NOT include `limit`, `start`, or `purchase` in the request body**. These parameters should only be in the URL.

2. **The `Criteria` array must contain objects with `name` and `value` properties**. The `value` property should always be an array, even for single values.

3. **For range criteria** (like EquityPercent), the value should be an array containing another array with two elements: `[min, max]`. Use `null` for unbounded ranges.

4. **For property types**, use a nested structure with a `name` of "PropertyType" and a `value` that contains another object with a `name` of "PType" and a `value` array of property type codes.

## Implementation Details

### Criteria Building Flow

1. **User selects criteria category**: User chooses from the categorized tabs (Location, Property, etc.)
2. **User selects specific criterion**: From the list of available criteria in that category
3. **User provides input**: Using the appropriate UI component for that criteria type
4. **System adds to active criteria**: Selected criteria appear as badges with their values
5. **JSON preview updates**: The request payload preview updates to show the formatted criteria
6. **User submits query**: When all desired criteria are added, the user submits the query

### In Our Application

1. **PropertyController.ts** formats the criteria from the frontend:
   ```typescript
   // Format criteria as an array of objects with name and value properties
   const formattedCriteria = Object.entries(criteria).map(([name, value]) => ({
     name,
     value: Array.isArray(value) ? value : [value]
   }));
   
   // Create criteria input with just the formatted criteria
   const criteriaInput: PropertyRadarCriteriaInput = {
     Criteria: formattedCriteria,
     limit: limit || 10,
     start: start || 0,
     purchase: req.body.purchase || 0
   };
   ```

2. **PropertyRadarCriteriaMapper.ts** ensures only the Criteria array is sent in the request body:
   ```typescript
   static transformCriteria(criteriaObj: PropertyRadarCriteriaInput): PropertyRadarRequest {
     // Check if the criteria is already in the API format
     if (criteriaObj.Criteria) {
       // Return just the Criteria array to match the expected format
       return {
         Criteria: criteriaObj.Criteria
       };
     }
     // ...
   }
   ```

3. **PropertyRadarProvider.ts** builds the URL with the correct parameters:
   ```typescript
   const apiUrl = `${this.baseUrl}/properties?Fields=${fields.join(',')}&Limit=${criteria.limit || 10}&Start=${criteria.start || 1}&Purchase=${criteria.purchase || 0}`;
   ```

4. **CriteriaService.ts** handles server-side criteria operations:
   ```typescript
   async validateCriteria(criteria: any): Promise<ValidationResult> {
     // Check for valid criteria types and values
     // Return validation errors or success status
   }
   
   async saveCommonCriteria(name: string, criteria: any): Promise<SavedCriteria> {
     // Save commonly used criteria sets for reuse
   }
   ```

## Example of a Successful API Call

```javascript
const axios = require('axios');
let data = JSON.stringify({
  "Criteria": [
    {
      "name": "State",
      "value": ["TN"]
    },
    {
      "name": "PropertyType",
      "value": [
        {
          "name": "PType",
          "value": ["SFR", "CND", "MFR"]
        }
      ]
    },
    {
      "name": "isSameMailingOrExempt",
      "value": [1]
    },
    {
      "name": "isMailVacant",
      "value": [0]
    },
    {
      "name": "EquityPercent",
      "value": [[25, null]]
    },
    {
      "name": "TotalLoanBalance",
      "value": [[100000, null]]
    },
    {
      "name": "FirstRate",
      "value": [[3, 4]]
    },
    {
      "name": "LastTransferDownPaymentPercent",
      "value": [[null, 99]]
    },
    {
      "name": "isListedForSale",
      "value": [0]
    },
    {
      "name": "inForeclosure",
      "value": [0]
    },
    {
      "name": "FirstLoanType",
      "value": ["V"]
    }
  ]
});

let config = {
  method: 'post',
  url: 'https://api.propertyradar.com/v1/properties?Fields=RadarID,PType,Address,City,State,ZipFive,County,APN,Owner,OwnerFirstName,OwnerLastName,OwnerSpouseFirstName,OwnershipType,isSameMailingOrExempt,isMailVacant,PhoneAvailability,EmailAvailability,AVM,AvailableEquity,EquityPercent,CLTV,TotalLoanBalance,NumberLoans,FirstDate,FirstAmount,FirstRate,FirstRateType,FirstTermInYears,FirstLoanType,FirstPurpose,SecondDate,SecondAmount,SecondLoanType,AnnualTaxes,EstimatedTaxRate,LastTransferRecDate,LastTransferValue,LastTransferDownPaymentPercent,LastTransferSeller,isListedForSale,ListingPrice,DaysOnMarket,inForeclosure,ForeclosureStage,DefaultAmount,inTaxDelinquency,DelinquentAmount,DelinquentYear&Limit=1&Start=1&Purchase=1',
  headers: { 
    'Content-Type': 'application/json', 
    'Accept': 'application/json', 
    'Authorization': 'Bearer YOUR_API_TOKEN'
  },
  data: data
};

axios.request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
  })
  .catch((error) => {
    console.log(error);
  });
```

## Troubleshooting

If you encounter errors when making API calls to PropertyRadar, check the following:

1. **"Unexpected payload field"**: You're including fields in the request body that should only be in the URL (like `limit`, `start`, or `purchase`).

2. **"Unexpected Criterion"**: The format of your criteria is incorrect. Make sure each criterion has a `name` and `value` property, and the `value` is always an array.

3. **"Missing required param"**: You're missing a required parameter in the URL or request body. Check that `Fields`, `Limit`, `Start`, and `Purchase` are all included in the URL.

4. **Authentication errors**: Verify that your API token is valid and properly included in the Authorization header.

5. **"Invalid yesno value"**: Boolean values must be strings ("1" or "0") not numbers. For example, use `"value": ["1"]` instead of `"value": [1]`.

6. **Date format issues**: Dates must be in MM/DD/YYYY format, not YYYY-MM-DD. For example, use `"08/01/2024"` instead of `"2024-08-01"`.

7. **Field name mapping**: Some field names in our application don't match the API field names. For example, `LastTransferRecDate` in our app maps to `FirstDate` in the API.

### Critical Format Requirements

1. **Boolean values**: Must be strings ("1" or "0"), not numbers or booleans:
   ```json
   {
     "name": "isListedForSale",
     "value": ["0"]  // Correct
   }
   ```
   NOT:
   ```json
   {
     "name": "isListedForSale",
     "value": [0]  // Incorrect
   }
   ```

2. **Date fields**: Must be in MM/DD/YYYY format:
   ```json
   {
     "name": "FirstDate",
     "value": ["from: 08/01/2024 to: 08/31/2024"]  // Correct
   }
   ```
   NOT:
   ```json
   {
     "name": "FirstDate",
     "value": ["from: 2024-08-01 to: 2024-08-31"]  // Incorrect
   }
   ```

3. **Field name mapping**:
   - `LastTransferRecDate` in our app → `FirstDate` in the API

### UI-Related Issues

1. **Criteria selections disappearing**: This can happen if there are state management issues or if React is re-rendering components unexpectedly. Ensure that the selectedCriterion state is properly maintained.

2. **Incorrect criteria format**: Verify the transformation from UI format to API format is correct. The UI typically uses a flat object structure that needs to be transformed to the API's array format.

3. **Input validation issues**: Check that the UI is validating inputs properly before attempting to transform and submit them.

### Database Issues

If you encounter database-related errors when saving properties:

1. **"loan_id_sequence is not a sequence"**: The correct sequence name is `loan_id_sequence_sequence_id_seq`.

2. **"relation batch_job_logs does not exist"**: You need to create the batch_job_logs table:
   ```sql
   CREATE TABLE IF NOT EXISTS batch_job_logs (
       log_id SERIAL PRIMARY KEY,
       job_id INTEGER NOT NULL,
       message TEXT NOT NULL,
       level VARCHAR(20) DEFAULT 'INFO',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (job_id) REFERENCES batch_jobs(job_id)
   );
   
   CREATE INDEX IF NOT EXISTS idx_batch_job_logs_job_id ON batch_job_logs(job_id);
   ```
