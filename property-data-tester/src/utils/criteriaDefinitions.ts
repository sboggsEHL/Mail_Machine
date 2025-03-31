import { AllCriteriaDefinitions } from '../../shared/types/criteria';

/**
 * Criteria definitions for PropertyRadar search
 * These match the JSON files in /docs/PropertyRadar but are directly imported
 * to avoid API calls and potential parsing issues
 */
export const criteriaDefinitions: AllCriteriaDefinitions = {
  'location': [
    {
      name: "State",
      description: "State in which the property is located",
      criteriaType: "Multiple Values",
      example: {
        value: ["CA", "NV", "AZ"]
      }
    },
    {
      name: "County",
      description: "County in which the property is located",
      criteriaType: "Multiple Values",
      example: {
        value: ["06037", "06073"]
      }
    },
    {
      name: "City",
      description: "City in which the property is located",
      criteriaType: "Multiple Values",
      example: {
        value: ["San Diego", "Los Angeles"]
      }
    },
    {
      name: "ZipFive",
      description: "ZIP Code in which the property is located",
      criteriaType: "Multiple Values",
      example: {
        value: ["96161", "94505", "90210"]
      }
    }
  ],
  
  'property': [
    {
      name: "PropertyType",
      description: "Type of property (SFR, Condo, etc.)",
      criteriaType: "PropertyType",
      example: {
        value: ["SFR", "CND"]
      }
    },
    {
      name: "Beds",
      description: "Number of bedrooms",
      criteriaType: "Multiple Range Including Unknowns",
      example: {
        value: [2, 4]
      }
    },
    {
      name: "Baths",
      description: "Number of bathrooms",
      criteriaType: "Multiple Range Including Unknowns",
      example: {
        value: [2, 3]
      }
    },
    {
      name: "SquareFeet",
      description: "Square footage of the property",
      criteriaType: "Multiple Range Including Unknowns",
      example: {
        value: [1000, 2500]
      }
    },
    {
      name: "YearBuilt",
      description: "Year the property was built",
      criteriaType: "Multiple Range Including Unknowns",
      example: {
        value: [1990, 2020]
      }
    }
  ],
  
  'ownerdetails': [
    {
      name: "isSameMailingOrExempt",
      description: "Owner's mailing address is the same as property address",
      criteriaType: "Boolean",
      example: {
        value: true
      }
    },
    {
      name: "isMailVacant",
      description: "Mail is marked as vacant",
      criteriaType: "Boolean",
      example: {
        value: false
      }
    },
    {
      name: "OwnerFirstName",
      description: "First name of the property owner",
      criteriaType: "Multiple Values Beginning With",
      example: {
        value: ["John", "Mary"]
      }
    },
    {
      name: "OwnerLastName",
      description: "Last name of the property owner",
      criteriaType: "Multiple Values Beginning With",
      example: {
        value: ["Smith", "Johnson"]
      }
    }
  ],
  
  'value&equity': [
    {
      name: "equityPercent",
      description: "Percentage of equity in the property",
      criteriaType: "Multiple Range",
      example: {
        value: [20, 80]
      }
    },
    {
      name: "AVM",
      description: "Automated Valuation Model (estimated property value)",
      criteriaType: "Multiple Range",
      example: {
        value: [300000, 800000]
      }
    },
    {
      name: "AvailableEquity",
      description: "Available equity in dollars",
      criteriaType: "Multiple Range",
      example: {
        value: [100000, 500000]
      }
    },
    {
      name: "CLTV",
      description: "Combined Loan-to-Value ratio",
      criteriaType: "Multiple Range",
      example: {
        value: [50, 80]
      }
    }
  ],
  
  'propertytax': [
    {
      name: "AnnualTaxes",
      description: "Annual property tax amount",
      criteriaType: "Multiple Range",
      example: {
        value: [1000, 10000]
      }
    },
    {
      name: "EstimatedTaxRate",
      description: "Estimated property tax rate",
      criteriaType: "Multiple Range",
      example: {
        value: [0.5, 2.0]
      }
    },
    {
      name: "inTaxDelinquency",
      description: "Property taxes are delinquent",
      criteriaType: "Boolean",
      example: {
        value: true
      }
    },
    {
      name: "DelinquentAmount",
      description: "Amount of delinquent taxes",
      criteriaType: "Multiple Range",
      example: {
        value: [1000, 5000]
      }
    }
  ],
  
  'listing': [
    {
      name: "isListedForSale",
      description: "Property is currently listed for sale",
      criteriaType: "Boolean",
      example: {
        value: true
      }
    },
    {
      name: "ListingPrice",
      description: "Current listing price",
      criteriaType: "Multiple Range",
      example: {
        value: [300000, 800000]
      }
    },
    {
      name: "DaysOnMarket",
      description: "Number of days the property has been on the market",
      criteriaType: "Multiple Range",
      example: {
        value: [0, 90]
      }
    }
  ],
  
  'loans&liens': [
    {
      name: "totalLoanBalance",
      description: "Total balance of all loans",
      criteriaType: "Multiple Range",
      example: {
        value: [100000, 500000]
      }
    },
    {
      name: "NumberLoans",
      description: "Number of loans on the property",
      criteriaType: "Multiple Range",
      example: {
        value: [1, 3]
      }
    },
    {
      name: "firstRate",
      description: "Interest rate on the first mortgage",
      criteriaType: "Multiple Range",
      example: {
        value: [2.5, 5.5]
      }
    },
    {
      name: "FirstLoanType",
      description: "Type of first loan (Conventional, FHA, VA, etc.)",
      criteriaType: "Multiple Values",
      example: {
        value: ["C", "F", "V"]
      }
    },
    {
      name: "loanTypes",
      description: "Types of loans to include",
      criteriaType: "Multiple Values",
      example: {
        value: ["C", "F", "V", "P"]
      }
    }
  ],
  
  'foreclosure': [
    {
      name: "inForeclosure",
      description: "Property is in foreclosure",
      criteriaType: "Boolean",
      example: {
        value: true
      }
    },
    {
      name: "ForeclosureStage",
      description: "Current stage of foreclosure",
      criteriaType: "Multiple Values",
      example: {
        value: ["PreForeclosure", "Auction"]
      }
    },
    {
      name: "DefaultAmount",
      description: "Amount in default",
      criteriaType: "Multiple Range",
      example: {
        value: [10000, 100000]
      }
    }
  ],
  
  'transfer': [
    {
      name: "LastTransferRecDate",
      description: "Date of last transfer/sale of the property",
      criteriaType: "Multiple Range",
      example: {
        value: ["2020-01-01", "2023-01-01"]
      }
    },
    {
      name: "LastTransferValue",
      description: "Value/price of the last transfer",
      criteriaType: "Multiple Range",
      example: {
        value: [200000, 800000]
      }
    },
    {
      name: "LastTransferDownPaymentPercent",
      description: "Down payment percentage of last transfer",
      criteriaType: "Multiple Range",
      example: {
        value: [10, 30]
      }
    },
    {
      name: "LastTransferSeller",
      description: "Seller name in the last transfer",
      criteriaType: "Multiple Values Beginning With",
      example: {
        value: ["Smith", "Jones"]
      }
    }
  ]
};
