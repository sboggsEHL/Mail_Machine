"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyRadarCriteriaMapper = void 0;
/**
 * Maps user-friendly criteria to PropertyRadar API format
 */
class PropertyRadarCriteriaMapper {
    /**
     * Transform user-friendly criteria to PropertyRadar API format
     * @param criteria User-friendly criteria object
     * @returns Properly formatted criteria for PropertyRadar API
     */
    static transformCriteria(criteriaObj) {
        // Check if the criteria is already in the API format
        if (criteriaObj.Criteria) {
            // Return just the Criteria array to match the expected format
            return {
                Criteria: criteriaObj.Criteria
            };
        }
        const result = [];
        // Note: purchase, limit, and start parameters should be in the URL only, not in the criteria array
        // Add state if present
        if (criteriaObj.state) {
            result.push({
                name: "State",
                value: [criteriaObj.state]
            });
        }
        // Add property types if present
        if (criteriaObj.propertyTypes && criteriaObj.propertyTypes.length > 0) {
            result.push({
                name: "PropertyType",
                value: [
                    {
                        name: "PType",
                        value: criteriaObj.propertyTypes
                    }
                ]
            });
        }
        // Add loan types if present
        if (criteriaObj.loanTypes && criteriaObj.loanTypes.length > 0) {
            result.push({
                name: "FirstLoanType",
                value: criteriaObj.loanTypes
            });
        }
        // Add same mailing flag if present
        if (criteriaObj.isSameMailingOrExempt !== undefined) {
            result.push({
                name: "isSameMailingOrExempt",
                value: [criteriaObj.isSameMailingOrExempt ? 1 : 0]
            });
        }
        // Add mail vacant flag if present
        if (criteriaObj.isMailVacant !== undefined) {
            result.push({
                name: "isMailVacant",
                value: [criteriaObj.isMailVacant ? 1 : 0]
            });
        }
        // Add foreclosure flag if present
        if (criteriaObj.inForeclosure !== undefined) {
            result.push({
                name: "inForeclosure",
                value: [criteriaObj.inForeclosure ? 1 : 0]
            });
        }
        // Add listing flag if present
        if (criteriaObj.isListedForSale !== undefined) {
            result.push({
                name: "isListedForSale",
                value: [criteriaObj.isListedForSale ? 1 : 0]
            });
        }
        // Add equity percent range if present
        if (criteriaObj.equityPercent) {
            result.push({
                name: "EquityPercent",
                value: [criteriaObj.equityPercent]
            });
        }
        // Add loan balance range if present
        if (criteriaObj.totalLoanBalance) {
            result.push({
                name: "TotalLoanBalance",
                value: [criteriaObj.totalLoanBalance]
            });
        }
        // Add interest rate range if present
        if (criteriaObj.firstRate) {
            result.push({
                name: "FirstRate",
                value: [criteriaObj.firstRate]
            });
        }
        // Process any dynamically added criteria from the JSON files
        for (const [key, value] of Object.entries(criteriaObj)) {
            // Skip the keys we've already processed
            if ([
                'state', 'propertyTypes', 'loanTypes', 'isSameMailingOrExempt',
                'isMailVacant', 'inForeclosure', 'isListedForSale', 'equityPercent',
                'totalLoanBalance', 'firstRate', 'purchase', 'limit', 'start'
            ].includes(key)) {
                continue;
            }
            // If it's a specific criterion not covered by our standard mappings
            if (value !== undefined && value !== null) {
                // Get the criteria type from metadata if available
                const criteriaType = this.getCriteriaType(key);
                // Handle different types of criteria based on the criteria type
                this.addCriterionByType(result, key, value, criteriaType);
            }
        }
        return {
            Criteria: result
        };
    }
    /**
     * Get the criteria type for a given criteria name
     * @param criteriaName The name of the criteria
     * @returns The type of the criteria, or undefined if not found
     */
    static getCriteriaType(criteriaName) {
        // This is a simplified mapping - in a real implementation, this would be loaded from the criteria JSON files
        const criteriaTypeMap = {
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
        return criteriaTypeMap[criteriaName];
    }
    /**
     * Add a criterion to the result array based on its type
     * @param result The result array to add the criterion to
     * @param key The name of the criterion
     * @param value The value of the criterion
     * @param criteriaType The type of the criterion
     */
    static addCriterionByType(result, key, value, criteriaType) {
        // If we don't have a specific criteria type, infer it from the value
        if (!criteriaType) {
            if (typeof value === 'boolean') {
                criteriaType = "Boolean";
            }
            else if (Array.isArray(value) && value.length === 2 &&
                (typeof value[0] === 'number' || value[0] === null) &&
                (typeof value[1] === 'number' || value[1] === null)) {
                criteriaType = "Multiple Range";
            }
            else if (Array.isArray(value)) {
                criteriaType = "Multiple Values";
            }
            else {
                criteriaType = "Single Value";
            }
        }
        // Handle the criterion based on its type
        switch (criteriaType) {
            case "Boolean":
                // Boolean values should be converted to 1/0
                result.push({
                    name: key,
                    value: [typeof value === 'boolean' ? (value ? 1 : 0) : value]
                });
                break;
            case "Multiple Range":
            case "Multiple Range Including Unknowns":
                // For range criteria, ensure the value is in the correct format: [[min, max], [min, max], ...]
                if (Array.isArray(value) && Array.isArray(value[0])) {
                    // Value is already in the correct format
                    result.push({
                        name: key,
                        value: value
                    });
                }
                else if (Array.isArray(value) && value.length === 2 &&
                    (typeof value[0] === 'number' || value[0] === null) &&
                    (typeof value[1] === 'number' || value[1] === null)) {
                    // Value is a single range array, wrap it in another array
                    result.push({
                        name: key,
                        value: [value]
                    });
                }
                else {
                    // Try to parse the value as a range
                    try {
                        const parsedValue = JSON.parse(value);
                        if (Array.isArray(parsedValue)) {
                            result.push({
                                name: key,
                                value: Array.isArray(parsedValue[0]) ? parsedValue : [parsedValue]
                            });
                        }
                    }
                    catch (e) {
                        // If parsing fails, use the value as is
                        result.push({
                            name: key,
                            value: [value]
                        });
                    }
                }
                break;
            case "Relative Date":
            case "Relative Date Including Unknowns":
                // For date criteria, ensure the value is an array of date strings
                if (Array.isArray(value)) {
                    // Check if it's an array of two dates, which should be formatted as a range
                    if (value.length === 2 &&
                        typeof value[0] === 'string' &&
                        typeof value[1] === 'string' &&
                        (value[0].match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) || value[0] === '') &&
                        (value[1].match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) || value[1] === '')) {
                        // Format as a date range
                        const fromDate = value[0] || '';
                        const toDate = value[1] || '';
                        const formattedValue = `from: ${fromDate} to: ${toDate}`.trim();
                        result.push({
                            name: key,
                            value: [formattedValue]
                        });
                    }
                    else {
                        result.push({
                            name: key,
                            value: value
                        });
                    }
                }
                else if (typeof value === 'string' && value.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                    // Single date in MM/DD/YYYY format
                    result.push({
                        name: key,
                        value: [value]
                    });
                }
                else {
                    result.push({
                        name: key,
                        value: [value]
                    });
                }
                break;
            case "Multiple Values":
            case "Multiple Values Beginning With":
                // For multiple values, ensure the value is an array
                if (Array.isArray(value)) {
                    result.push({
                        name: key,
                        value: value
                    });
                }
                else {
                    result.push({
                        name: key,
                        value: [value]
                    });
                }
                break;
            case "Single Value":
                // For single values, wrap in an array
                result.push({
                    name: key,
                    value: [value]
                });
                break;
            case "PropertyType":
                // Special handling for PropertyType
                if (Array.isArray(value)) {
                    result.push({
                        name: key,
                        value: [
                            {
                                name: "PType",
                                value: value
                            }
                        ]
                    });
                }
                else if (typeof value === 'object' && value !== null) {
                    // If it's already in the correct format
                    result.push({
                        name: key,
                        value: [value]
                    });
                }
                else {
                    // Single value
                    result.push({
                        name: key,
                        value: [
                            {
                                name: "PType",
                                value: [value]
                            }
                        ]
                    });
                }
                break;
            case "Map Drawing":
                // For map drawing criteria, pass the value as is
                result.push({
                    name: key,
                    value: value
                });
                break;
            default:
                // Default handling for unknown criteria types
                if (Array.isArray(value)) {
                    result.push({
                        name: key,
                        value: value
                    });
                }
                else {
                    result.push({
                        name: key,
                        value: [value]
                    });
                }
                break;
        }
    }
}
exports.PropertyRadarCriteriaMapper = PropertyRadarCriteriaMapper;
