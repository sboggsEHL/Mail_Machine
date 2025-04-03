import axios, { AxiosError, AxiosResponse } from 'axios';
import { LeadProvider, PropertyTransformResult } from '../interfaces';
import { PropertyRadarCriteriaMapper } from './PropertyRadarCriteriaMapper';
import { 
  PropertyRadarApiResponse, 
  PropertyRadarCriteriaInput, 
  PropertyRadarProperty 
} from './types';
import { Property, PropertyOwner, Loan } from '../../../../shared/types/database';

/**
 * PropertyRadar implementation of the LeadProvider interface
 */
export class PropertyRadarProvider implements LeadProvider {
  private apiToken: string;
  private baseUrl: string = 'https://api.propertyradar.com/v1';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Get the unique code for this provider
   */
  getCode(): string {
    return 'PR';
  }

  /**
   * Get the human-readable name for this provider
   */
  getName(): string {
    return 'PropertyRadar';
  }

  /**
   * Check if this provider is configured and ready to use
   */
  isConfigured(): boolean {
    return Boolean(this.apiToken);
  }

  /**
   * Fetch properties from PropertyRadar API
   * @param criteria Search criteria in user-friendly format
   * @param fields Fields to retrieve
   */
  async fetchProperties(criteria: PropertyRadarCriteriaInput, fields: string[]): Promise<PropertyRadarProperty[]> {
    if (!this.isConfigured()) {
      throw new Error('PropertyRadar API is not configured. Please provide a valid API token.');
    }

    try {
      // Build the API URL with query parameters
      const apiUrl = `${this.baseUrl}/properties?Fields=${fields.join(',')}&Limit=${criteria.limit || 10}&Start=${criteria.start || 1}&Purchase=${criteria.purchase || 0}`;

      // Transform criteria to PropertyRadar format
      const requestBody = PropertyRadarCriteriaMapper.transformCriteria(criteria);
      
      console.log('Making request to PropertyRadar API:', apiUrl);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      // Make the API request
      const response = await axios.post<PropertyRadarApiResponse>(
        apiUrl, 
        requestBody, 
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.data || !response.data.results) {
        throw new Error('Unexpected API response structure');
      }
      
      return response.data.results;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Fetch a single property by RadarID
   * @param radarId The PropertyRadar ID
   * @param fields Fields to retrieve
   */
  async fetchPropertyById(radarId: string, fields: string[]): Promise<PropertyRadarProperty> {
    if (!this.isConfigured()) {
      throw new Error('PropertyRadar API is not configured. Please provide a valid API token.');
    }

    try {
      // Build the API URL with query parameters
      const apiUrl = `${this.baseUrl}/properties/${radarId}?Fields=${fields.join(',')}&Purchase=1`;
      
      console.log('Making request to PropertyRadar API:', apiUrl);
      
      // Make the API request
      const response = await axios.get<any>(
        apiUrl,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.data) {
        throw new Error('Unexpected API response structure');
      }
      
      // Check if the response has a results array (which is what we're seeing in the payload)
      if (response.data.results && Array.isArray(response.data.results) && response.data.results.length > 0) {
        return response.data.results[0];
      }
      
      // If not, return the data directly
      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Transform raw property data from PropertyRadar format to our system format
   * @param rawProperty Raw property data from PropertyRadar API
   */
  transformProperty(rawProperty: PropertyRadarProperty): PropertyTransformResult {
    // Helper function to safely convert values to numbers
    const safeNumber = (value: any): number | undefined => {
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
    const property: Partial<Property> = {
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
    const owners: Partial<PropertyOwner>[] = [];
    
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

    // Create loans array
    const loans: Partial<Loan>[] = [];
    
    // Create a single loan record that includes both first and second loan details
    // Only create a loan if we have first loan data with a lender name
    if ((rawProperty.FirstDate || rawProperty.FirstAmount || rawProperty.FirstLoanType) && 
        rawProperty.FirstLenderOriginal) {
      const loanData: Partial<Loan> = {
        // Primary loan fields (from first loan)
        loan_type: rawProperty.FirstLoanType,
        loan_amount: safeNumber(rawProperty.FirstAmount),
        interest_rate: safeNumber(rawProperty.FirstRate),
        rate_type: rawProperty.FirstRateType,
        term_years: safeNumber(rawProperty.FirstTermInYears),
        loan_purpose: rawProperty.FirstPurpose,
        lender_name: rawProperty.FirstLenderOriginal,
        loan_position: 1,
        origination_date: rawProperty.FirstDate ? new Date(rawProperty.FirstDate) : undefined,
        
        // First loan details
        first_date: rawProperty.FirstDate ? new Date(rawProperty.FirstDate) : undefined,
        first_amount: safeNumber(rawProperty.FirstAmount),
        first_rate: safeNumber(rawProperty.FirstRate),
        first_rate_type: rawProperty.FirstRateType,
        first_term_in_years: safeNumber(rawProperty.FirstTermInYears),
        first_loan_type: rawProperty.FirstLoanType,
        first_purpose: rawProperty.FirstPurpose,
        
        // Second loan details (if they exist)
        second_date: rawProperty.SecondDate ? new Date(rawProperty.SecondDate) : undefined,
        second_amount: safeNumber(rawProperty.SecondAmount),
        second_loan_type: rawProperty.SecondLoanType,
        
        is_active: true
      };
      
      loans.push(loanData);
    } else {
      console.log(`Skipping loan for property ${rawProperty.RadarID} - missing first loan lender name`);
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
  private handleApiError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('PropertyRadar API error status:', axiosError.response.status);
        console.error('PropertyRadar API error data:', axiosError.response.data);
        
        throw new Error(`PropertyRadar API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      } else if (axiosError.request) {
        // The request was made but no response was received
        console.error('PropertyRadar API no response received:', axiosError.request);
        throw new Error('PropertyRadar API no response received');
      } else {
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
