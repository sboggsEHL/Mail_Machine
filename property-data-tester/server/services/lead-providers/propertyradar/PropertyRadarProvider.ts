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
  async fetchProperties(criteria: PropertyRadarCriteriaInput, fields: string[]): Promise<{ results: PropertyRadarProperty[], rawPayload: any }> {
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
      
      return { results: response.data.results, rawPayload: response.data };
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
  async fetchPropertyById(radarId: string, fields: string[]): Promise<{ results: PropertyRadarProperty[], rawPayload: any }> {
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
      
      // Return the same structure as fetchProperties for consistency
      // For a single property, we put it in an array to match the structure
      return {
        results: [response.data],
        rawPayload: response.data
      };
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
    
    // Check if we have results array (from batch API response)
    let propertyData = rawProperty;
    if (rawProperty.results && Array.isArray(rawProperty.results) && rawProperty.results.length > 0) {
      propertyData = rawProperty.results[0];
    }
    
    // Create property object - ensure we're using propertyData consistently
    const property: Partial<Property> = {
      radar_id: propertyData.RadarID ? String(propertyData.RadarID) : propertyData.radar_id, // Use existing radar_id if RadarID is missing
      property_address: propertyData.Address,
      property_city: propertyData.City,
      property_state: propertyData.State,
      property_zip: propertyData.ZipFive,
      property_type: propertyData.PType,
      county: propertyData.County,
      apn: propertyData.APN,
      ownership_type: propertyData.OwnershipType,
      is_same_mailing_or_exempt: propertyData.isSameMailingOrExempt,
      is_mail_vacant: propertyData.isMailVacant,
      avm: safeNumber(propertyData.AVM),
      available_equity: safeNumber(propertyData.AvailableEquity),
      equity_percent: safeNumber(propertyData.EquityPercent),
      cltv: safeNumber(propertyData.CLTV),
      total_loan_balance: safeNumber(propertyData.TotalLoanBalance),
      number_loans: safeNumber(propertyData.NumberLoans),
      annual_taxes: safeNumber(propertyData.AnnualTaxes),
      estimated_tax_rate: safeNumber(propertyData.EstimatedTaxRate),
      last_transfer_rec_date: propertyData.LastTransferRecDate ? new Date(propertyData.LastTransferRecDate) : undefined,
      last_transfer_value: safeNumber(propertyData.LastTransferValue),
      last_transfer_down_payment_percent: safeNumber(propertyData.LastTransferDownPaymentPercent),
      last_transfer_seller: propertyData.LastTransferSeller,
      is_listed_for_sale: propertyData.isListedForSale,
      listing_price: safeNumber(propertyData.ListingPrice),
      days_on_market: safeNumber(propertyData.DaysOnMarket),
      in_foreclosure: propertyData.inForeclosure,
      foreclosure_stage: propertyData.ForeclosureStage,
      default_amount: safeNumber(propertyData.DefaultAmount),
      in_tax_delinquency: propertyData.inTaxDelinquency,
      delinquent_amount: safeNumber(propertyData.DelinquentAmount),
      delinquent_year: safeNumber(propertyData.DelinquentYear),
      is_active: true
    };

    // Create owners array if owner data exists
    const owners: Partial<PropertyOwner>[] = [];
    
    // Add primary owner if data exists
    if (propertyData.Owner || propertyData.OwnerFirstName || propertyData.OwnerLastName) {
      const phoneAvailable = propertyData.PhoneAvailability === 'owned';
      const emailAvailable = propertyData.EmailAvailability === 'owned';
      
      // Special handling for trusts and other entities with only a full name
      // If first and last names are null but full name exists, use full name as first name
      const firstName = (!propertyData.OwnerFirstName && !propertyData.OwnerLastName && propertyData.Owner)
        ? propertyData.Owner
        : propertyData.OwnerFirstName;
      
      owners.push({
        first_name: firstName,
        last_name: propertyData.OwnerLastName,
        full_name: propertyData.Owner,
        owner_type: 'PRIMARY',
        is_primary_contact: true,
        phone_availability: phoneAvailable,
        email_availability: emailAvailable,
        is_active: true
      });
    }

    // Add spouse if data exists
    if (propertyData.OwnerSpouseFirstName) {
      owners.push({
        first_name: propertyData.OwnerSpouseFirstName,
        last_name: propertyData.OwnerLastName,
        full_name: `${propertyData.OwnerSpouseFirstName} ${propertyData.OwnerLastName}`.trim(),
        owner_type: 'SPOUSE',
        is_primary_contact: false,
        is_active: true
      });
    }

    // Create loans array
    const loans: Partial<Loan>[] = [];
    
    // Create a single loan record that includes both first and second loan details
    // Only create a loan if we have first loan data with a lender name
    if ((propertyData.FirstDate || propertyData.FirstAmount || propertyData.FirstLoanType) && 
        propertyData.FirstLenderOriginal) {
      const loanData: Partial<Loan> = {
        // Primary loan fields (from first loan)
        loan_type: propertyData.FirstLoanType,
        loan_amount: safeNumber(propertyData.FirstAmount),
        interest_rate: safeNumber(propertyData.FirstRate),
        rate_type: propertyData.FirstRateType,
        term_years: safeNumber(propertyData.FirstTermInYears),
        loan_purpose: propertyData.FirstPurpose,
        lender_name: propertyData.FirstLenderOriginal,
        loan_position: 1,
        origination_date: propertyData.FirstDate ? new Date(propertyData.FirstDate) : undefined,
        
        // First loan details
        first_date: propertyData.FirstDate ? new Date(propertyData.FirstDate) : undefined,
        first_amount: safeNumber(propertyData.FirstAmount),
        first_rate: safeNumber(propertyData.FirstRate),
        first_rate_type: propertyData.FirstRateType,
        first_term_in_years: safeNumber(propertyData.FirstTermInYears),
        first_loan_type: propertyData.FirstLoanType,
        first_purpose: propertyData.FirstPurpose,
        
        // Second loan details (if they exist)
        second_date: propertyData.SecondDate ? new Date(propertyData.SecondDate) : undefined,
        second_amount: safeNumber(propertyData.SecondAmount),
        second_loan_type: propertyData.SecondLoanType,
        
        is_active: true
      };
      
      loans.push(loanData);
    }
    // Silently skip loans with missing lender name - no warning needed

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

  /**
   * Preview properties based on criteria without purchasing
   * @param criteria Search criteria
   * @returns Preview result with count
   */
  async previewProperties(criteria: any): Promise<{ count: number }> {
    if (!this.isConfigured()) {
      throw new Error('PropertyRadar API is not configured. Please provide a valid API token.');
    }

    try {
      // Transform criteria to PropertyRadar format
      const requestBody = PropertyRadarCriteriaMapper.transformCriteria(criteria);
      
      console.log('Making preview request to PropertyRadar API');
      
      // Make the API request with Purchase=0 to avoid purchasing the properties
      const response = await axios.post(
        `${this.baseUrl}/properties`,
        requestBody,
        {
          params: {
            Fields: 'RadarID',
            Limit: 1,
            Purchase: 0
          },
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      // Return the total count of matching properties
      return {
        count: response.data.resultCount || 0
      };
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }
}
