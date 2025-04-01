import { Property, PropertyOwner, Loan } from '../../../shared/types/database';

/**
 * Lead Provider interface - Base contract for all lead provider implementations
 */
export interface LeadProvider {
  /**
   * Get the unique code for this provider
   */
  getCode(): string;
  
  /**
   * Get the human-readable name for this provider
   */
  getName(): string;
  
  /**
   * Check if this provider is configured and ready to use
   */
  isConfigured(): boolean;
  
  /**
   * Fetch properties from the provider's API
   * @param criteria Search criteria specific to the provider
   * @param fields Fields to retrieve
   */
  fetchProperties(criteria: any, fields: string[]): Promise<any[]>;
  
  /**
   * Fetch a single property by its ID
   * @param propertyId The property ID in the provider's system
   * @param fields Fields to retrieve
   */
  fetchPropertyById?(propertyId: string, fields: string[]): Promise<any>;
  
  /**
   * Transform raw property data from provider format to our system format
   * @param rawProperty Raw property data from provider API
   */
  transformProperty(rawProperty: any): PropertyTransformResult;
}

/**
 * Result of property transformation
 */
export interface PropertyTransformResult {
  property: Partial<Property>;
  owners?: Partial<PropertyOwner>[];
  loans?: Partial<Loan>[];
}

/**
 * Lead Provider Factory - Creates and manages lead provider instances
 */
export interface LeadProviderFactory {
  /**
   * Register a lead provider implementation
   * @param provider LeadProvider implementation
   */
  registerProvider(provider: LeadProvider): void;
  
  /**
   * Get a lead provider by its code
   * @param code Provider code
   */
  getProvider(code: string): LeadProvider;
  
  /**
   * Get all registered providers
   */
  getAllProviders(): LeadProvider[];
}
