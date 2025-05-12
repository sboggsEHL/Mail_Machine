import { Pool, PoolClient } from 'pg';
import { BatchFileStatus } from '../models';
import { BaseRepository } from './BaseRepository';

/**
 * Repository for batch file status operations
 */
export class BatchFileStatusRepository extends BaseRepository<BatchFileStatus> {
  constructor(pool: Pool) {
    super(pool, 'batch_file_status');
  }

  /**
   * Create a new batch file status record
   * @param fileStatus The batch file status to create
   * @param client Optional client for transaction handling
   * @returns The created batch file status with ID
   */
  async createFileStatus(
    fileStatus: BatchFileStatus,
    client?: PoolClient
  ): Promise<BatchFileStatus> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query(`
      INSERT INTO ${this.tableName} (
        file_path, campaign_id, batch_number, status, 
        properties_count, success_count, error_count
      ) VALUES ($1, $2::VARCHAR, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      fileStatus.file_path,
      String(fileStatus.campaign_id), // Ensure campaign_id is a string
      fileStatus.batch_number,
      fileStatus.status || 'PENDING',
      fileStatus.properties_count || 0,
      fileStatus.success_count || 0,
      fileStatus.error_count || 0
    ]);
    
    return result.rows[0];
  }

  /**
   * Update batch file status
   * @param fileId The file ID
   * @param status The new status
   * @param client Optional client for transaction handling
   * @returns The updated batch file status
   */
  async updateStatus(
    fileId: number,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    client?: PoolClient
  ): Promise<BatchFileStatus | null> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query(`
      UPDATE ${this.tableName}
      SET status = $2, processed_at = CASE WHEN $2 IN ('COMPLETED', 'FAILED') THEN NOW() ELSE processed_at END
      WHERE file_id = $1
      RETURNING *
    `, [fileId, status]);
    
    return result.rows.length ? result.rows[0] : null;
  }

  /**
   * Update batch file processing results
   * @param fileId The file ID
   * @param successCount Number of successfully processed records
   * @param errorCount Number of records with errors
   * @param processingTimeMs Processing time in milliseconds
   * @param errorDetails Optional error details if status is FAILED
   * @param client Optional client for transaction handling
   * @returns The updated batch file status
   */
  async updateProcessingResults(
    fileId: number,
    successCount: number,
    errorCount: number,
    processingTimeMs: number,
    errorDetails?: string,
    client?: PoolClient
  ): Promise<BatchFileStatus | null> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query(`
      UPDATE ${this.tableName}
      SET 
        success_count = $2,
        error_count = $3,
        processing_time_ms = $4,
        error_details = $5,
        status = CASE 
          WHEN $5 IS NOT NULL THEN 'FAILED'
          ELSE 'COMPLETED'
        END,
        processed_at = NOW()
      WHERE file_id = $1
      RETURNING *
    `, [fileId, successCount, errorCount, processingTimeMs, errorDetails || null]);
    
    return result.rows.length ? result.rows[0] : null;
  }

  /**
   * Find pending batch files
   * @param limit Maximum number of files to return
   * @param client Optional client for transaction handling
   * @returns Array of pending batch files
   */
  async findPendingFiles(
    limit: number = 10,
    client?: PoolClient
  ): Promise<BatchFileStatus[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query(`
      SELECT * FROM ${this.tableName}
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  }

  /**
   * Find stuck batch files
   * @param pendingMinutes Minutes threshold for pending files
   * @param processingMinutes Minutes threshold for processing files
   * @param client Optional client for transaction handling
   * @returns Array of stuck batch files
   */
  async findStuckFiles(
    pendingMinutes: number = 60,
    processingMinutes: number = 180,
    client?: PoolClient
  ): Promise<BatchFileStatus[]> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query(`
      SELECT *, 
        EXTRACT(EPOCH FROM (NOW() - created_at))/60 AS minutes_since_creation
      FROM ${this.tableName}
      WHERE 
        (status = 'PENDING' AND created_at < NOW() - INTERVAL '${pendingMinutes} minutes')
        OR
        (status = 'PROCESSING' AND created_at < NOW() - INTERVAL '${processingMinutes} minutes')
      ORDER BY created_at ASC
    `);
    
    return result.rows;
  }

  /**
   * Get batch file statistics by campaign
   * @param campaignId Campaign ID
   * @param startDate Start date for filtering
   * @param endDate End date for filtering
   * @param client Optional client for transaction handling
   * @returns Statistics for the campaign
   */
  async getCampaignStatistics(
    campaignId: string,
    startDate?: Date,
    endDate?: Date,
    client?: PoolClient
  ): Promise<any> {
    const queryExecutor = client || this.pool;
    
    let query = `
      SELECT 
        COUNT(*) AS total_batches,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_batches,
        SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END) AS processing_batches,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_batches,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed_batches,
        SUM(properties_count) AS total_properties,
        SUM(success_count) AS successful_properties,
        SUM(error_count) AS failed_properties,
        AVG(processing_time_ms)/1000 AS avg_processing_time_seconds
      FROM ${this.tableName}
      WHERE campaign_id = $1::VARCHAR
    `;
    
    const params: any[] = [String(campaignId)];
    
    if (startDate) {
      query += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    const result = await queryExecutor.query(query, params);
    
    return result.rows[0];
  }
}
