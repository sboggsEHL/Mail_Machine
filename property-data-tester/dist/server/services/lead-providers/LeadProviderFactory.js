"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadProviderFactory = exports.LeadProviderFactoryImpl = void 0;
/**
 * Implementation of the Lead Provider Factory
 * This factory manages different lead provider implementations
 * and provides access to them by their unique code
 */
class LeadProviderFactoryImpl {
    constructor() {
        this.providers = new Map();
    }
    /**
     * Register a lead provider with the factory
     * @param provider The provider implementation to register
     */
    registerProvider(provider) {
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
    getProvider(code) {
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
    getAllProviders() {
        return Array.from(this.providers.values());
    }
}
exports.LeadProviderFactoryImpl = LeadProviderFactoryImpl;
/**
 * Singleton instance of the lead provider factory
 */
exports.leadProviderFactory = new LeadProviderFactoryImpl();
