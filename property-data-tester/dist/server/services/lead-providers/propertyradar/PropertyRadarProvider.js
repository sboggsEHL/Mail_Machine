"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyRadarProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const PropertyRadarCriteriaMapper_1 = require("./PropertyRadarCriteriaMapper");
/**
 * PropertyRadar implementation of the LeadProvider interface
 */
class PropertyRadarProvider {
    constructor(apiToken) {
        this.baseUrl = 'https://api.propertyradar.com/v1';
        this.apiToken = apiToken;
    }
    /**
     * Get the unique code for this provider
     */
    getCode() {
        return 'PR';
    }
    /**
     * Get the human-readable name for this provider
     */
    getName() {
        return 'PropertyRadar';
    }
    /**
     * Check if this provider is configured and ready to use
     */
    isConfigured() {
        return Boolean(this.apiToken);
    }
    /**
     * Fetch properties from PropertyRadar API
     * @param criteria Search criteria in user-friendly format
     * @param fields Fields to retrieve
     */
    fetchProperties(criteria, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured()) {
                throw new Error('PropertyRadar API is not configured. Please provide a valid API token.');
            }
            try {
                // Build the API URL with query parameters
                const apiUrl = `${this.baseUrl}/properties?Fields=${fields.join(',')}&Limit=${criteria.limit || 10}&Start=${criteria.start || 1}&Purchase=${criteria.purchase || 0}`;
                // Transform criteria to PropertyRadar format
                const requestBody = PropertyRadarCriteriaMapper_1.PropertyRadarCriteriaMapper.transformCriteria(criteria);
                console.log('Making request to PropertyRadar API:', apiUrl);
                console.log('Request body:', JSON.stringify(requestBody, null, 2));
                // Make the API request
                const response = yield axios_1.default.post(apiUrl, requestBody, {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                if (!response.data || !response.data.results) {
                    throw new Error('Unexpected API response structure');
                }
                return response.data.results;
            }
            catch (error) {
                this.handleApiError(error);
                throw error;
            }
        });
    }
    /**
     * Fetch a single property by RadarID
     * @param radarId The PropertyRadar ID
     * @param fields Fields to retrieve
     */
    fetchPropertyById(radarId, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured()) {
                throw new Error('PropertyRadar API is not configured. Please provide a valid API token.');
            }
            try {
                // Build the API URL with query parameters
                const apiUrl = `${this.baseUrl}/properties/${radarId}?Fields=${fields.join(',')}&Purchase=1`;
                console.log('Making request to PropertyRadar API:', apiUrl);
                // Make the API request
                const response = yield axios_1.default.get(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                if (!response.data) {
                    throw new Error('Unexpected API response structure');
                }
                // Check if the response has a results array (which is what we're seeing in the payload)
                if (response.data.results && Array.isArray(response.data.results) && response.data.results.length > 0) {
                    return response.data.results[0];
                }
                // If not, return the data directly
                return response.data;
            }
            catch (error) {
                this.handleApiError(error);
                throw error;
            }
        });
    }
    /**
     * Transform raw property data from PropertyRadar format to our system format
     * @param rawProperty Raw property data from PropertyRadar API
     */
    transformProperty(rawProperty) {
        // Helper function to safely convert values to numbers
        const safeNumber = (value) => {
            // Return undefined for null, undefined, or string values like "Other" or "Unknown"
            if (value === null || value === undefined || value === "Other" || value === "Unknown") {
                return undefined;
            }
            // Try to convert to number
            const num = Number(value);
            // Return the number if valid, otherwise undefined
            return !isNaN(num) ? num : undefined;
        };
        // Create property object
        const property = {
            radar_id: rawProperty.RadarID,
            property_address: rawProperty.Address,
            property_city: rawProperty.City,
            property_state: rawProperty.State,
            property_zip: rawProperty.ZipFive,
            property_type: rawProperty.PType,
            county: rawProperty.County,
            apn: rawProperty.APN,
            ownership_type: rawProperty.OwnershipType,
            is_same_mailing_or_exempt: rawProperty.isSameMailingOrExempt,
            is_mail_vacant: rawProperty.isMailVacant,
            avm: safeNumber(rawProperty.AVM),
            available_equity: safeNumber(rawProperty.AvailableEquity),
            equity_percent: safeNumber(rawProperty.EquityPercent),
            cltv: safeNumber(rawProperty.CLTV),
            total_loan_balance: safeNumber(rawProperty.TotalLoanBalance),
            number_loans: safeNumber(rawProperty.NumberLoans),
            annual_taxes: safeNumber(rawProperty.AnnualTaxes),
            estimated_tax_rate: safeNumber(rawProperty.EstimatedTaxRate),
            last_transfer_rec_date: rawProperty.LastTransferRecDate ? new Date(rawProperty.LastTransferRecDate) : undefined,
            last_transfer_value: safeNumber(rawProperty.LastTransferValue),
            last_transfer_down_payment_percent: safeNumber(rawProperty.LastTransferDownPaymentPercent),
            last_transfer_seller: rawProperty.LastTransferSeller,
            is_listed_for_sale: rawProperty.isListedForSale,
            listing_price: safeNumber(rawProperty.ListingPrice),
            days_on_market: safeNumber(rawProperty.DaysOnMarket),
            in_foreclosure: rawProperty.inForeclosure,
            foreclosure_stage: rawProperty.ForeclosureStage,
            default_amount: safeNumber(rawProperty.DefaultAmount),
            in_tax_delinquency: rawProperty.inTaxDelinquency,
            delinquent_amount: safeNumber(rawProperty.DelinquentAmount),
            delinquent_year: safeNumber(rawProperty.DelinquentYear),
            is_active: true
        };
        // Create owners array if owner data exists
        const owners = [];
        // Add primary owner if data exists
        if (rawProperty.Owner || rawProperty.OwnerFirstName || rawProperty.OwnerLastName) {
            const phoneAvailable = rawProperty.PhoneAvailability === 'owned';
            const emailAvailable = rawProperty.EmailAvailability === 'owned';
            owners.push({
                first_name: rawProperty.OwnerFirstName,
                last_name: rawProperty.OwnerLastName,
                full_name: rawProperty.Owner,
                owner_type: 'PRIMARY',
                is_primary_contact: true,
                phone_availability: phoneAvailable,
                email_availability: emailAvailable,
                is_active: true
            });
        }
        // Add spouse if data exists
        if (rawProperty.OwnerSpouseFirstName) {
            owners.push({
                first_name: rawProperty.OwnerSpouseFirstName,
                last_name: rawProperty.OwnerLastName,
                full_name: `${rawProperty.OwnerSpouseFirstName} ${rawProperty.OwnerLastName}`.trim(),
                owner_type: 'SPOUSE',
                is_primary_contact: false,
                is_active: true
            });
        }
        // Create loans array if loan data exists
        const loans = [];
        // Add first loan if data exists
        if (rawProperty.FirstDate || rawProperty.FirstAmount || rawProperty.FirstLoanType) {
            loans.push({
                loan_type: rawProperty.FirstLoanType,
                loan_amount: safeNumber(rawProperty.FirstAmount),
                interest_rate: safeNumber(rawProperty.FirstRate),
                rate_type: rawProperty.FirstRateType,
                term_years: safeNumber(rawProperty.FirstTermInYears),
                loan_purpose: rawProperty.FirstPurpose,
                loan_position: 1,
                origination_date: rawProperty.FirstDate ? new Date(rawProperty.FirstDate) : undefined,
                first_date: rawProperty.FirstDate ? new Date(rawProperty.FirstDate) : undefined,
                first_amount: safeNumber(rawProperty.FirstAmount),
                first_rate: safeNumber(rawProperty.FirstRate),
                first_rate_type: rawProperty.FirstRateType,
                first_term_in_years: safeNumber(rawProperty.FirstTermInYears),
                first_loan_type: rawProperty.FirstLoanType,
                first_purpose: rawProperty.FirstPurpose,
                is_active: true
            });
        }
        // Add second loan if data exists
        if (rawProperty.SecondDate || rawProperty.SecondAmount || rawProperty.SecondLoanType) {
            loans.push({
                loan_type: rawProperty.SecondLoanType,
                loan_amount: safeNumber(rawProperty.SecondAmount),
                loan_position: 2,
                origination_date: rawProperty.SecondDate ? new Date(rawProperty.SecondDate) : undefined,
                second_date: rawProperty.SecondDate ? new Date(rawProperty.SecondDate) : undefined,
                second_amount: safeNumber(rawProperty.SecondAmount),
                second_loan_type: rawProperty.SecondLoanType,
                is_active: true
            });
        }
        return {
            property,
            owners: owners.length > 0 ? owners : undefined,
            loans: loans.length > 0 ? loans : undefined,
        };
    }
    /**
     * Handle API errors in a consistent way
     * @param error Error from axios
     */
    handleApiError(error) {
        if (axios_1.default.isAxiosError(error)) {
            const axiosError = error;
            if (axiosError.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('PropertyRadar API error status:', axiosError.response.status);
                console.error('PropertyRadar API error data:', axiosError.response.data);
                throw new Error(`PropertyRadar API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
            }
            else if (axiosError.request) {
                // The request was made but no response was received
                console.error('PropertyRadar API no response received:', axiosError.request);
                throw new Error('PropertyRadar API no response received');
            }
            else {
                // Something happened in setting up the request that triggered an Error
                console.error('PropertyRadar API error:', axiosError.message);
                throw new Error(`PropertyRadar API request setup error: ${axiosError.message}`);
            }
        }
        // For non-axios errors
        console.error('PropertyRadar unknown error:', error);
        throw new Error(`PropertyRadar unknown error: ${String(error)}`);
    }
}
exports.PropertyRadarProvider = PropertyRadarProvider;
