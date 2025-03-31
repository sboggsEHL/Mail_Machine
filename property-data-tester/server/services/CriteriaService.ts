import { PropertyRadarCriteriaMapper } from './lead-providers/propertyradar/PropertyRadarCriteriaMapper';

/**
 * Interface for criteria definition
 */
export interface CriteriaDefinition {
  name: string;
  criteriaType: string;
  description: string;
  category?: string;
}

/**
 * Service for handling criteria operations
 */
export class CriteriaService {
  /**
   * Get all criteria with their types
   * @returns Array of criteria definitions
   */
  getAllCriteria(): CriteriaDefinition[] {
    // Get all criteria names and types from PropertyRadarCriteriaMapper
    const criteriaTypeMap = this.getCriteriaTypeMap();
    
    return Object.entries(criteriaTypeMap).map(([name, type]) => ({
      name,
      criteriaType: type,
      description: this.getCriteriaDescription(name),
      category: this.getCriteriaCategory(name)
    }));
  }
  
  /**
   * Get criteria by category
   * @param category The category to filter by
   * @returns Array of criteria definitions in the specified category
   */
  getCriteriaByCategory(category: string): CriteriaDefinition[] {
    return this.getAllCriteria().filter(c => c.category === category);
  }
  
  /**
   * Get criteria type map from PropertyRadarCriteriaMapper
   * @returns Record mapping criteria names to their types
   */
  getCriteriaTypeMap(): Record<string, string> {
    // This is a simplified approach - in a real implementation, we would use reflection
    // or another method to access the private static method in PropertyRadarCriteriaMapper
    
    // For now, we'll recreate the map based on the implementation in PropertyRadarCriteriaMapper
    const criteriaTypeMap: Record<string, string> = {
      // Transfer criteria
      "TransferType": "Multiple Values",
      "TransferDate": "Relative Date",
      "TransferMonth": "Multiple Values",
      "TransferDocumentType": "Multiple Values",
      "TransferDocumentNumber": "Multiple Values",
      "TransferAmount": "Multiple Range",
      "WasListed": "Boolean",
      "MostRecentChangeOfOwnership": "Boolean",
      "MultipleParcels": "Boolean",
      "NumberOfParcels": "Multiple Range",
      "BuyerName": "Multiple Values",
      "SellerName": "Multiple Values",
      "TitleCompany": "Multiple Values",
      "TransferPublishedDate": "Relative Date",
      "CashBuyer": "Boolean",
      "REOResale": "Boolean",
      "Flip": "Boolean",
      "PurchaseMonthsSincePrior": "Multiple Range",
      "LastTransferRecDate": "Relative Date",
      
      // Location criteria
      "State": "Multiple Values",
      "County": "Multiple Values",
      "City": "Multiple Values",
      "ZipFive": "Multiple Values",
      "Address": "Multiple Values",
      "StreetName": "Multiple Values",
      "AddressNumber": "Multiple Range",
      "APN": "Multiple Values Beginning With",
      "Subdivision": "Multiple Values",
      "RadarID": "Multiple Values",
      "FIPS": "Multiple Values",
      "OddEven": "Single Value",
      "AddressComplete": "Boolean",
      "StreetPrefix": "Multiple Values",
      "StreetSuffix": "Multiple Values",
      "CarrierRoute": "Multiple Values",
      "TaxRateArea": "Multiple Values",
      "CensusTract": "Multiple Range",
      "SiteCongressionalDistrict": "Multiple Values",
      "DrawPolygon": "Map Drawing",
      "DrawRectangle": "Map Drawing",
      "DrawCircle": "Map Drawing",
      
      // Property criteria
      "PropertyType": "PropertyType",
      "OwnerOccupied": "Boolean",
      "OwnershipType": "Multiple Values",
      "Beds": "Multiple Range Including Unknowns",
      "Baths": "Multiple Range Including Unknowns",
      "YearBuilt": "Multiple Range Including Unknowns",
      "Age": "Multiple Range Including Unknowns",
      "SquareFeet": "Multiple Range Including Unknowns",
      "LotSqFt": "Multiple Range Including Unknowns",
      "LotAcres": "Multiple Range Including Unknowns",
      "Units": "Multiple Range Including Unknowns",
      "Pool": "Boolean",
      "Vacant": "Boolean",
      "SameMailingAddress": "Boolean",
      "SameCounty": "Boolean",
      "SameState": "Boolean",
      "ZoningCode": "Multiple Values",
      "View": "Multiple Values",
      "Rooms": "Multiple Range",
      "Stories": "Multiple Range Including Unknowns",
      "Fireplace": "Boolean",
      "AirConditioning": "Boolean",
      
      // Value and Equity criteria
      "EstimatedValue": "Multiple Range Including Unknowns",
      "EstValuePerSqFt": "Multiple Range Including Unknowns",
      "EstimatedEquityDollars": "Multiple Range Including Unknowns",
      "EstimatedEquityPercent": "Multiple Range Including Unknowns",
      "AvailableEquity": "Multiple Range Including Unknowns",
      "CombinedLoanToValue": "Multiple Range Including Unknowns",
      "EstimatedOpenLoansBalance": "Multiple Range Including Unknowns",
      "EstimatedNumberOfOpenLoans": "Multiple Values",
      "FreeAndClear": "Boolean",
      "Underwater": "Boolean",
      
      // Foreclosure criteria
      "InForeclosure": "Boolean",
      "ForeclosureStage": "Multiple Values",
      "NoticeDocumentType": "Multiple Values",
      "NoticeRecordingDate": "Relative Date",
      "NoticePublishedDate": "Relative Date",
      "OriginalSaleDate": "Relative Date",
      "ForeclosureSaleDate": "Relative Date Including Unknowns",
      "SaleTime": "Multiple Values",
      "SalePlace": "Multiple Values",
      "PublishedBid": "Multiple Range",
      "PublishedBidToEstValue": "Multiple Range",
      "DefaultAmount": "Multiple Range",
      "DefaultDate": "Relative Date",
      "ForeclosingLoanPosition": "Multiple Values",
      "LisPendensType": "Multiple Values",
      "NoticePageNumber": "Multiple Values",
      "NoticeDocumentNumber": "Multiple Values",
      "NoticeBookNumber": "Multiple Values",
      "Trustee": "Multiple Values",
      "TrusteePhone": "Multiple Values",
      "TSNumber": "Multiple Values",
      "Attorney": "Multiple Values",
      
      // Listing criteria
      "ListedForSale": "Boolean",
      "ListingStatus": "Multiple Values",
      "ListingType": "Multiple Values",
      "ListingDate": "Relative Date",
      "ListingExpirationDate": "Relative Date",
      "ListingPrice": "Multiple Range",
      "ListPricePerSqFt": "Multiple Range",
      "DaysOnMarket": "Multiple Range",
      "ListingAgent": "Multiple Values",
      "ListingAgencyName": "Multiple Values",
      "ListingChangeDate": "Relative Date",
      "MLSNumber": "Multiple Values",
      "PriceReduction": "Boolean",
      "PriceReductionAmount": "Multiple Range",
      "PriceReductionPercent": "Multiple Range",
      "OriginalListPrice": "Multiple Range",
      "ListingToEstimatedValueRatio": "Multiple Range",
      
      // Loans and Liens criteria
      "LoanPurpose": "Multiple Values",
      "LoanType": "Multiple Values",
      "LoanDate": "Relative Date",
      "LoanConcurrent": "Boolean",
      "LoanAmount": "Multiple Range",
      "LoanCashOut": "Multiple Range",
      "LoanToValue": "Multiple Range",
      "LoanTerm": "Multiple Range",
      "LoanOriginalLender": "Multiple Values",
      "LoanARMNegativeAmortization": "Boolean",
      "LienRecordingDate": "Relative Date",
      "LienType": "Multiple Values",
      "LienPosition": "Multiple Values",
      "LienStatus": "Multiple Values",
      "LienAmount": "Multiple Range",
      "LienInterestRate": "Multiple Range",
      "HasInvoluntaryLien": "Boolean",
      
      // Owner Details criteria
      "NumberOfPropertiesOwned": "Multiple Range",
      "Deceased": "Boolean",
      "OwnerPhoneNumber": "Multiple Values",
      "HasOwnerPhone": "Boolean",
      "HasOwnerMobilePhone": "Boolean",
      "OwnerEmailAddress": "Multiple Values",
      "HasOwnerEmail": "Boolean",
      "OwnerAge": "Multiple Range",
      "OwnerGender": "Multiple Values",
      "MaritalStatus": "Multiple Values",
      "ChildrenAtHome": "Boolean",
      "InBankruptcy": "Boolean",
      "BankruptcyStatus": "Multiple Values",
      "BankruptcyRecordingDate": "Relative Date",
      "BankruptcyChapter": "Multiple Values",
      "BankruptcyDistrict": "Multiple Values",
      "HasDivorce": "Boolean",
      "DivorceRecordingDate": "Relative Date",
      "DivorceDecreeDate": "Relative Date",
      "MailVacant": "Boolean",
      "MailingAddress": "Multiple Values",
      "MailingCity": "Multiple Values",
      "MailingZipCode": "Multiple Values",
      "MailingState": "Multiple Values",
      "MailingAddressComplete": "Boolean",
      "MailCongressionalDistrict": "Multiple Values",
      
      // Property Tax criteria
      "AssessedValue": "Multiple Range Including Unknowns",
      "YearAssessed": "Multiple Values",
      "TaxesPerYear": "Multiple Range Including Unknowns",
      "EstimatedTaxRate": "Multiple Range Including Unknowns",
      "HomeownerTaxExemption": "Boolean",
      "PropertyTaxDelinquent": "Boolean",
      "YearsPropertyTaxDelinquent": "Multiple Range",
      "PropertyTaxDelinquentAmount": "Multiple Range",
      "PropertyTaxDelinquentSince": "Multiple Values",
      "NumberOfMissedTaxPayments": "Multiple Range",
      "AssessedToEstimatedValueRatio": "Multiple Range Including Unknowns",
      
      // Add more mappings as needed for other criteria types
      "SqFt": "Multiple Range Including Unknowns"
    };
    
    return criteriaTypeMap;
  }
  
  /**
   * Helper method to get criteria description
   * @param name The criteria name
   * @returns Description for the criteria
   */
  private getCriteriaDescription(name: string): string {
    // Provide descriptions for common criteria
    const descriptions: Record<string, string> = {
      'ZipFive': 'ZIP Code in which the property is located',
      'Pool': 'Whether or not the property has a swimming pool',
      'AvailableEquity': 'The dollar value of equity in the property',
      'TransferDate': 'The date the property was transferred',
      'LastTransferRecDate': 'The date the last property transfer was recorded',
      'PropertyType': 'Type of property (SFR, Condo, etc.)',
      'Beds': 'Number of bedrooms in the property',
      'Baths': 'Number of bathrooms in the property',
      'SquareFeet': 'Square footage of the property',
      'YearBuilt': 'Year the property was built',
      'EstimatedValue': 'Estimated current market value of the property',
      'ForeclosureSaleDate': 'Date of foreclosure sale',
      'ListingPrice': 'Price at which the property is listed for sale',
      'OwnerOccupied': 'Whether the property is occupied by the owner',
      'InForeclosure': 'Whether the property is in foreclosure',
      'ListedForSale': 'Whether the property is currently listed for sale',
      'State': 'State in which the property is located',
      'County': 'County in which the property is located',
      'City': 'City in which the property is located',
      'Address': 'Street address of the property',
      'LotAcres': 'Size of the lot in acres',
      'LotSqFt': 'Size of the lot in square feet',
      'APN': 'Assessor Parcel Number',
      'OwnershipType': 'Type of ownership (Individual, Trust, LLC, etc.)',
      'TotalLoanBalance': 'Total balance of all loans on the property',
      'LoanType': 'Type of loan (Conventional, FHA, VA, etc.)',
      'LoanDate': 'Date the loan was originated',
      'LoanAmount': 'Original amount of the loan',
      'OwnerAge': 'Age of the property owner',
      'OwnerGender': 'Gender of the property owner',
      'MaritalStatus': 'Marital status of the property owner',
      'AssessedValue': 'Value assessed by the county for tax purposes',
      'TaxesPerYear': 'Annual property tax amount',
    };
    
    return descriptions[name] || `Criteria for ${name}`;
  }
  
  /**
   * Helper method to determine criteria category
   * @param name The criteria name
   * @returns Category for the criteria
   */
  private getCriteriaCategory(name: string): string {
    // Map criteria names to categories
    if (/^(State|County|City|ZipFive|Address|StreetName|APN|Subdivision|RadarID|FIPS|OddEven)/.test(name)) {
      return 'location';
    }
    if (/^(PropertyType|OwnerOccupied|Beds|Baths|YearBuilt|Age|SquareFeet|LotSqFt|LotAcres|Units|Pool|Vacant)/.test(name)) {
      return 'property';
    }
    if (/^(EstimatedValue|EstValuePerSqFt|EstimatedEquityDollars|EstimatedEquityPercent|AvailableEquity|CombinedLoanToValue)/.test(name)) {
      return 'value';
    }
    if (/^(Transfer|Buyer|Seller|MostRecentChangeOfOwnership|LastTransfer)/.test(name)) {
      return 'transfer';
    }
    if (/^(InForeclosure|ForeclosureStage|Notice|OriginalSaleDate|ForeclosureSaleDate|SaleTime|SalePlace|PublishedBid|DefaultAmount|DefaultDate)/.test(name)) {
      return 'foreclosure';
    }
    if (/^(ListedForSale|ListingStatus|ListingType|ListingDate|ListingExpirationDate|ListingPrice|ListPricePerSqFt|DaysOnMarket|ListingAgent)/.test(name)) {
      return 'listing';
    }
    if (/^(Loan|Lien)/.test(name)) {
      return 'loans';
    }
    if (/^(Owner|NumberOfPropertiesOwned|Deceased|Mailing|Mail|InBankruptcy|Bankruptcy|HasDivorce|Divorce|MaritalStatus|ChildrenAtHome)/.test(name)) {
      return 'owner';
    }
    if (/^(AssessedValue|YearAssessed|TaxesPerYear|EstimatedTaxRate|HomeownerTaxExemption|PropertyTaxDelinquent)/.test(name)) {
      return 'tax';
    }
    
    return 'other';
  }
}