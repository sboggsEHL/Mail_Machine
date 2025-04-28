import { CriteriaDefinition } from '../types';

/**
 * Static criteria definitions specific to the PropertyRadar provider,
 * primarily used for building the API parameter form UI.
 * Extracted from the original criteriaDefinitions.ts.
 * Note: The main CriteriaSelector component fetches dynamic definitions from the API.
 */
export const criteria: CriteriaDefinition[] = [
  // location
  {
    name: "State",
    description: "State in which the property is located",
    criteriaType: "Multiple Values",
    category: "location",
    example: { value: ["CA", "NV", "AZ"] }
  },
  {
    name: "County",
    description: "County in which the property is located",
    criteriaType: "Multiple Values",
    category: "location",
    example: { value: ["06037", "06073"] }
  },
  {
    name: "City",
    description: "City in which the property is located",
    criteriaType: "Multiple Values",
    category: "location",
    example: { value: ["San Diego", "Los Angeles"] }
  },
  {
    name: "ZipFive",
    description: "ZIP Code in which the property is located",
    criteriaType: "Multiple Values",
    category: "location",
    example: { value: ["96161", "94505", "90210"] }
  },
  // property
  {
    name: "Address",
    description: "Property street address (include street number, name, direction, type, and unit/suite number if applicable. Do NOT include city, state, or ZIP)",
    criteriaType: "Multiple Values",
    category: "property",
    example: { value: ["120 SE Main St #500"] }
  },
  {
    name: "PropertyType",
    description: "Type of property (SFR, Condo, etc.)",
    criteriaType: "PropertyType",
    category: "property",
    example: { value: ["SFR", "CND"] }
  },
  {
    name: "Beds",
    description: "Number of bedrooms",
    criteriaType: "Multiple Range Including Unknowns",
    category: "property",
    example: { value: [2, 4] }
  },
  {
    name: "Baths",
    description: "Number of bathrooms",
    criteriaType: "Multiple Range Including Unknowns",
    category: "property",
    example: { value: [2, 3] }
  },
  {
    name: "SquareFeet",
    description: "Square footage of the property",
    criteriaType: "Multiple Range Including Unknowns",
    category: "property",
    example: { value: [1000, 2500] }
  },
  {
    name: "YearBuilt",
    description: "Year the property was built",
    criteriaType: "Multiple Range Including Unknowns",
    category: "property",
    example: { value: [1990, 2020] }
  },
  // ownerdetails
  {
    name: "isSameMailingOrExempt",
    description: "Whether the property is owner-occupied (Owner Occupied)",
    criteriaType: "Boolean",
    category: "ownerdetails",
    example: { value: true }
  },
  {
    name: "isMailVacant",
    description: "Mail is marked as vacant",
    criteriaType: "Boolean",
    category: "ownerdetails",
    example: { value: false }
  },
  {
    name: "OwnerFirstName",
    description: "First name of the property owner",
    criteriaType: "Multiple Values Beginning With",
    category: "ownerdetails",
    example: { value: ["John", "Mary"] }
  },
  {
    name: "OwnerLastName",
    description: "Last name of the property owner",
    criteriaType: "Multiple Values Beginning With",
    category: "ownerdetails",
    example: { value: ["Smith", "Johnson"] }
  },
  // value&equity
  {
    name: "EquityPercent",
    description: "Percentage of equity in the property",
    criteriaType: "Multiple Range",
    category: "value&equity",
    example: { value: [20, 80] }
  },
  {
    name: "AVM",
    description: "Automated Valuation Model (estimated property value)",
    criteriaType: "Multiple Range",
    category: "value&equity",
    example: { value: [300000, 800000] }
  },
  {
    name: "AvailableEquity",
    description: "Available equity in dollars",
    criteriaType: "Multiple Range",
    category: "value&equity",
    example: { value: [100000, 500000] }
  },
  {
    name: "CLTV",
    description: "Combined Loan-to-Value ratio",
    criteriaType: "Multiple Range",
    category: "value&equity",
    example: { value: [50, 80] }
  },
  // propertytax
  {
    name: "AnnualTaxes",
    description: "Annual property tax amount",
    criteriaType: "Multiple Range",
    category: "propertytax",
    example: { value: [1000, 10000] }
  },
  {
    name: "EstimatedTaxRate",
    description: "Estimated property tax rate",
    criteriaType: "Multiple Range",
    category: "propertytax",
    example: { value: [0.5, 2.0] }
  },
  {
    name: "inTaxDelinquency",
    description: "Property taxes are delinquent",
    criteriaType: "Boolean",
    category: "propertytax",
    example: { value: true }
  },
  {
    name: "DelinquentAmount",
    description: "Amount of delinquent taxes",
    criteriaType: "Multiple Range",
    category: "propertytax",
    example: { value: [1000, 5000] }
  },
  // listing
  {
    name: "isListedForSale",
    description: "Property is currently listed for sale",
    criteriaType: "Boolean",
    category: "listing",
    example: { value: true }
  },
  {
    name: "ListingPrice",
    description: "Current listing price",
    criteriaType: "Multiple Range",
    category: "listing",
    example: { value: [300000, 800000] }
  },
  {
    name: "DaysOnMarket",
    description: "Number of days the property has been on the market",
    criteriaType: "Multiple Range",
    category: "listing",
    example: { value: [0, 90] }
  },
  // loans&liens
  {
    name: "TotalLoanBalance",
    description: "Total balance of all loans (Estimated Open Loans Balance)",
    criteriaType: "Multiple Range",
    category: "loans&liens",
    example: { value: [100000, 500000] }
  },
  {
    name: "NumberLoans",
    description: "Number of loans on the property (Estimated Number of Open Loans)",
    criteriaType: "Multiple Range",
    category: "loans&liens",
    example: { value: [1, 3] }
  },
  {
    name: "FirstRate",
    description: "Interest rate on the first mortgage",
    criteriaType: "Multiple Range",
    category: "loans&liens",
    example: { value: [2.5, 5.5] }
  },
  {
    name: "FirstLoanType",
    description: "Type of first loan (Conventional, FHA, VA, etc.)",
    criteriaType: "Multiple Values",
    category: "loans&liens",
    example: { value: ["C", "F", "V"] }
  },
  // foreclosure
  {
    name: "inForeclosure",
    description: "Property is in foreclosure",
    criteriaType: "Boolean",
    category: "foreclosure",
    example: { value: true }
  },
  {
    name: "ForeclosureStage",
    description: "Current stage of foreclosure",
    criteriaType: "Multiple Values",
    category: "foreclosure",
    example: { value: ["PreForeclosure", "Auction"] }
  },
  {
    name: "DefaultAmount",
    description: "Amount in default",
    criteriaType: "Multiple Range",
    category: "foreclosure",
    example: { value: [10000, 100000] }
  },
  // transfer
  {
    name: "FirstDate",
    description: "Date of first loan recording (used for filtering by date range)",
    criteriaType: "Multiple Range",
    category: "transfer",
    example: { value: ["08/01/2024", "08/31/2024"] }
  },
  {
    name: "LastTransferRecDate",
    description: "Date of last transfer/sale of the property (Note: Maps to FirstDate in API)",
    criteriaType: "Multiple Range",
    category: "transfer",
    example: { value: ["08/01/2024", "08/31/2024"] }
  },
  {
    name: "LastTransferValue",
    description: "Value/price of the last transfer",
    criteriaType: "Multiple Range",
    category: "transfer",
    example: { value: [200000, 800000] }
  },
  {
    name: "LastTransferDownPaymentPercent",
    description: "Down payment percentage of last transfer",
    criteriaType: "Multiple Range",
    category: "transfer",
    example: { value: [10, 30] }
  },
  {
    name: "LastTransferSeller",
    description: "Seller name in the last transfer",
    criteriaType: "Multiple Values Beginning With",
    category: "transfer",
    example: { value: ["Smith", "Jones"] }
  },
];