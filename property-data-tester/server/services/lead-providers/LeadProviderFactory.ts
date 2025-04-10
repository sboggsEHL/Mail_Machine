import { LeadProvider, LeadProviderFactory } from './interfaces';

/**
 * Implementation of the Lead Provider Factory
 * This factory manages different lead provider implementations
 * and provides access to them by their unique code
 */
export class LeadProviderFactoryImpl implements LeadProviderFactory {
  private providers: Map<string, LeadProvider> = new Map();

  /**
   * Register a lead provider with the factory
   * @param provider The provider implementation to register
   */
  registerProvider(provider: LeadProvider): void {
    const code = provider.getCode();
    
    if (this.providers.has(code)) {
      throw new Error(`Provider with code ${code} is already registered`);
    }
    
    this.providers.set(code, provider);
  }

  /**
   * Get a specific lead provider by its code
   * @param code The unique code of the provider
   * @returns The provider implementation
   * @throws Error if no provider with the given code is registered
   */
  getProvider(code: string): LeadProvider {
    const provider = this.providers.get(code);
    
    if (!provider) {
      throw new Error(`Lead provider with code '${code}' not found. Available providers: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    
    return provider;
  }

  /**
   * Get all registered lead providers
   * @returns Array of all registered provider implementations
   */
  getAllProviders(): LeadProvider[] {
    return Array.from(this.providers.values());
  }
}

/**
 * Singleton instance of the lead provider factory
 */
export const leadProviderFactory = new LeadProviderFactoryImpl();
