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
        const result = [];
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
        // Add any other specific criteria that might be provided
        for (const [key, value] of Object.entries(criteriaObj)) {
            // Skip the keys we've already processed
            if ([
                'state', 'propertyTypes', 'loanTypes', 'isSameMailingOrExempt',
                'isMailVacant', 'inForeclosure', 'isListedForSale', 'equityPercent',
                'totalLoanBalance', 'firstRate'
            ].includes(key)) {
                continue;
            }
            // If it's a specific criterion not covered by our standard mappings
            if (value !== undefined && value !== null) {
                result.push({
                    name: key,
                    value: Array.isArray(value) ? value : [value]
                });
            }
        }
        return {
            Criteria: result
        };
    }
}
exports.PropertyRadarCriteriaMapper = PropertyRadarCriteriaMapper;
