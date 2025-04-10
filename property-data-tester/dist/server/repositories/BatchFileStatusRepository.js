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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchFileStatusRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
/**
 * Repository for batch file status operations
 */
class BatchFileStatusRepository extends BaseRepository_1.BaseRepository {
    constructor(pool) {
        super(pool, 'batch_file_status');
    }
    /**
     * Create a new batch file status record
     * @param fileStatus The batch file status to create
     * @param client Optional client for transaction handling
     * @returns The created batch file status with ID
     */
    createFileStatus(fileStatus, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`
      INSERT INTO ${this.tableName} (
        file_path, campaign_id, batch_number, status, 
        properties_count, success_count, error_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
                fileStatus.file_path,
                fileStatus.campaign_id,
                fileStatus.batch_number,
                fileStatus.status || 'PENDING',
                fileStatus.properties_count || 0,
                fileStatus.success_count || 0,
                fileStatus.error_count || 0
            ]);
            return result.rows[0];
        });
    }
    /**
     * Update batch file status
     * @param fileId The file ID
     * @param status The new status
     * @param client Optional client for transaction handling
     * @returns The updated batch file status
     */
    updateStatus(fileId, status, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`
      UPDATE ${this.tableName}
      SET status = $2, processed_at = CASE WHEN $2 IN ('COMPLETED', 'FAILED') THEN NOW() ELSE processed_at END
      WHERE file_id = $1
      RETURNING *
    `, [fileId, status]);
            return result.rows.length ? result.rows[0] : null;
        });
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
    updateProcessingResults(fileId, successCount, errorCount, processingTimeMs, errorDetails, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`
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
        });
    }
    /**
     * Find pending batch files
     * @param limit Maximum number of files to return
     * @param client Optional client for transaction handling
     * @returns Array of pending batch files
     */
    findPendingFiles() {
        return __awaiter(this, arguments, void 0, function* (limit = 10, client) {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`
      SELECT * FROM ${this.tableName}
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT $1
    `, [limit]);
            return result.rows;
        });
    }
    /**
     * Find stuck batch files
     * @param pendingMinutes Minutes threshold for pending files
     * @param processingMinutes Minutes threshold for processing files
     * @param client Optional client for transaction handling
     * @returns Array of stuck batch files
     */
    findStuckFiles() {
        return __awaiter(this, arguments, void 0, function* (pendingMinutes = 60, processingMinutes = 180, client) {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`
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
        });
    }
    /**
     * Get batch file statistics by campaign
     * @param campaignId Campaign ID
     * @param startDate Start date for filtering
     * @param endDate End date for filtering
     * @param client Optional client for transaction handling
     * @returns Statistics for the campaign
     */
    getCampaignStatistics(campaignId, startDate, endDate, client) {
        return __awaiter(this, void 0, void 0, function* () {
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
      WHERE campaign_id = $1
    `;
            const params = [campaignId];
            if (startDate) {
                query += ` AND created_at >= $${params.length + 1}`;
                params.push(startDate);
            }
            if (endDate) {
                query += ` AND created_at <= $${params.length + 1}`;
                params.push(endDate);
            }
            const result = yield queryExecutor.query(query, params);
            return result.rows[0];
        });
    }
}
exports.BatchFileStatusRepository = BatchFileStatusRepository;
