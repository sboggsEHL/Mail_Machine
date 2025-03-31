import { Pool, PoolClient } from 'pg';
import { LeadProvider } from '../../shared/types/database';
import { BaseRepository } from './BaseRepository';

/**
 * Repository for lead providers
 */
export class LeadProviderRepository extends BaseRepository<LeadProvider> {
  constructor(pool: Pool) {
    super(pool, 'lead_providers');
  }

  /**
   * Find a lead provider by its code
   * @param code The provider code (e.g., 'PR' for PropertyRadar)
   * @param client Optional client for transaction handling
   * @returns The lead provider or null if not found
   */
  async findByCode(code: string, client?: PoolClient): Promise<LeadProvider | null> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<LeadProvider>(
      `SELECT * FROM ${this.tableName} WHERE provider_code = $1`,
      [code]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Ensure a lead provider exists, creating it if necessary
   * @param providerName Provider name
   * @param providerCode Provider code
   * @param client Optional client for transaction handling
   * @returns The provider ID
   */
  async ensureProvider(
    providerName: string,
    providerCode: string,
    apiKey?: string,
    apiEndpoint?: string,
    client?: PoolClient
  ): Promise<number> {
    const queryExecutor = client || this.pool;
    
    // Try to find an existing provider
    const existingProvider = await this.findByCode(providerCode, client);
    
    if (existingProvider) {
      return existingProvider.provider_id;
    }
    
    // Create a new provider
    const result = await queryExecutor.query<{ provider_id: number }>(
      `INSERT INTO ${this.tableName} (provider_name, provider_code, api_key, api_endpoint, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING provider_id`,
      [providerName, providerCode, apiKey, apiEndpoint]
    );
    
    return result.rows[0].provider_id;
  }

  /**
   * Get all active lead providers
   * @param client Optional client for transaction handling
   * @returns Array of active lead providers
   */
  async findAllActive(client?: PoolClient): Promise<LeadProvider[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<LeadProvider>(
      `SELECT * FROM ${this.tableName} WHERE is_active = true`
    );
    
    return result.rows;
  }

  /**
   * Update a lead provider's API credentials
   * @param id The provider ID
   * @param apiKey The API key
   * @param apiEndpoint The API endpoint
   * @param client Optional client for transaction handling
   * @returns The updated lead provider
   */
  async updateCredentials(
    id: number,
    apiKey: string,
    apiEndpoint?: string,
    client?: PoolClient
  ): Promise<LeadProvider | null> {
    const updateData: Partial<LeadProvider> = {
      api_key: apiKey,
      updated_at: new Date()
    };
    
    if (apiEndpoint) {
      updateData.api_endpoint = apiEndpoint;
    }
    
    return this.update(id, updateData, client);
  }
}
