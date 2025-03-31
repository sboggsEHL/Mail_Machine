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