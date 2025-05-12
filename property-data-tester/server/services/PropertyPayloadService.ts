import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool } from 'pg';
import { BatchFileStatus } from '../models';
import { BatchFileStatusRepository } from '../repositories/BatchFileStatusRepository';

/**
 * Service for managing property payload files
 */
export class PropertyPayloadService {
  private batchFileStatusRepo: BatchFileStatusRepository;
  private baseDir: string;
  private pendingDir: string;
  private processingDir: string;
  private processedDir: string;
  
  constructor(
    pool: Pool,
    baseDir: string = path.join(process.cwd(), 'logs')
  ) {
    this.batchFileStatusRepo = new BatchFileStatusRepository(pool);
    this.baseDir = path.join(baseDir, 'property_payloads');
    this.pendingDir = path.join(baseDir, 'pending');
    this.processingDir = path.join(baseDir, 'processing');
    this.processedDir = path.join(baseDir, 'processed');
    
    // Ensure all directories exist
    this.ensureDirectoryExists(this.baseDir);
    this.ensureDirectoryExists(this.pendingDir);
    this.ensureDirectoryExists(this.processingDir);
    this.ensureDirectoryExists(this.processedDir);
  }
  
  /**
   * Save property payload to file
   * @param rawPayload Full raw payload object from provider API
   * @param campaignId Campaign identifier
   * @param batchNumber Batch sequence number
   * @returns The created batch file status
   */
  async savePropertyPayload(
    rawPayload: any,
    campaignId: string,
    batchNumber: number
  ): Promise<BatchFileStatus> {
    // Create month directory if it doesn't exist
    const now = new Date();
    const monthDir = this.getMonthDirectory(now);
    this.ensureDirectoryExists(monthDir);
    
    // Create filename with timestamp
    const timestamp = this.formatTimestamp(now);
    const filename = `${campaignId}_batch${batchNumber}_${timestamp}.json`;
    const filePath = path.join(monthDir, filename);
    
    // Extract the array of property objects (main branch behavior)
    let propertiesArray: any[] = [];
    if (rawPayload && Array.isArray(rawPayload.results)) {
      propertiesArray = rawPayload.results;
    } else if (rawPayload && Array.isArray(rawPayload.properties)) {
      propertiesArray = rawPayload.properties;
    } else if (Array.isArray(rawPayload)) {
      propertiesArray = rawPayload;
    }

    // Ensure all properties have a RadarID
    const validProperties = propertiesArray.filter(prop => {
      if (!prop.RadarID) {
        console.warn('WARNING: Filtering out property missing RadarID in payload');
        return false;
      }
      return true;
    });

    // Calculate checksum of the data (array only)
    const dataString = JSON.stringify(validProperties, null, 2);
    const checksum = this.calculateChecksum(dataString);

    // Determine properties count
    const propertiesCount = validProperties.length;

    // Write only the array to file (main branch behavior)
    await this.writeJsonToFile(filePath, validProperties);
    
    // Create batch file status record
    const fileStatus: BatchFileStatus = {
      file_path: this.getRelativePath(filePath),
      campaign_id: campaignId,
      batch_number: batchNumber,
      status: 'PENDING',
      properties_count: propertiesCount,
      success_count: 0,
      error_count: 0,
      error_details: JSON.stringify({ checksum })
    };
    
    const result = await this.batchFileStatusRepo.createFileStatus(fileStatus);
    
    // Create a pending marker file
    const pendingMarker = path.join(this.pendingDir, path.basename(filePath));
    await fs.promises.writeFile(pendingMarker, filePath, 'utf8');
    
    console.log(`Saved property payload to ${filePath} with ${propertiesCount} properties`);
    return result;
  }
  
  /**
   * Get pending files for processing
   * @param limit Maximum number of files to return
   * @returns Array of pending batch files with absolute paths
   */
  async getPendingFiles(limit: number = 10): Promise<{ fileStatus: BatchFileStatus, originalPath: string }[]> {
    try {
      // Get pending files from database
      const pendingStatuses = await this.batchFileStatusRepo.findPendingFiles(limit);
      const result: { fileStatus: BatchFileStatus, originalPath: string }[] = [];
      
      // Check if the files exist
      for (const fileStatus of pendingStatuses) {
        const originalPath = this.getAbsolutePath(fileStatus.file_path);
        if (await this.fileExists(originalPath)) {
          result.push({ fileStatus, originalPath });
        } else {
          console.error(`File not found: ${originalPath}`);
          await this.batchFileStatusRepo.updateProcessingResults(
            fileStatus.file_id!,
            0,
            0,
            0,
            `File not found: ${originalPath}`
          );
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting pending files:', error);
      return [];
    }
  }
  
  /**
   * Process a pending file
   * @param fileStatus Batch file status
   * @param originalPath Original file path
   * @param processor Function to process the properties
   * @returns Processing result
   */
  async processFile(
    fileStatus: BatchFileStatus,
    originalPath: string,
    processor: (properties: any[]) => Promise<{ success: number, errors: number }>
  ): Promise<{ success: boolean, message: string }> {
    const fileId = fileStatus.file_id!;
    const filename = path.basename(originalPath);
    const processingPath = path.join(this.processingDir, filename);
    const processedMarker = path.join(this.processedDir, filename);
    const lockFile = `${processingPath}.lock`;
    
    try {
      // Check if already processed
      if (await this.fileExists(processedMarker)) {
        console.log(`File already processed: ${filename}`);
        return { success: true, message: 'Already processed' };
      }
      
      // Check for lock file to prevent concurrent processing
      if (await this.fileExists(lockFile)) {
        console.log(`File is locked (being processed): ${filename}`);
        return { success: false, message: 'File is locked' };
      }
      
      // Create lock file
      await fs.promises.writeFile(lockFile, new Date().toISOString(), 'utf8');
      
      // Mark as processing in database
      await this.batchFileStatusRepo.updateStatus(fileId, 'PROCESSING');
      
      // Copy file to processing directory
      await fs.promises.copyFile(originalPath, processingPath);
      
      // Read the file and verify checksum
      const fileContent = await fs.promises.readFile(processingPath, 'utf8');
      const properties = JSON.parse(fileContent);
      
      // Get stored checksum
      const storedChecksumData = fileStatus.error_details ? JSON.parse(fileStatus.error_details) : {};
      const storedChecksum = storedChecksumData.checksum;
      
      // Calculate current checksum
      const currentChecksum = this.calculateChecksum(fileContent);
      
      // Verify checksum
      if (storedChecksum && storedChecksum !== currentChecksum) {
        throw new Error(`Checksum mismatch: file may be corrupted`);
      }
      
      // Process the properties
      const startTime = Date.now();
      const { success, errors } = await processor(properties);
      const processingTime = Date.now() - startTime;
      
      // Mark as completed in database
      await this.batchFileStatusRepo.updateProcessingResults(
        fileId,
        success,
        errors,
        processingTime
      );
      
      // Create processed marker
      await fs.promises.writeFile(processedMarker, new Date().toISOString(), 'utf8');
      
      // Remove processing file and lock
      await fs.promises.unlink(processingPath);
      await fs.promises.unlink(lockFile);
      
      console.log(`Successfully processed ${filename}: ${success} succeeded, ${errors} failed`);
      return { success: true, message: `Processed ${success} properties with ${errors} errors` };
    } catch (error) {
      console.error(`Error processing file ${filename}:`, error);
      
      // Mark as failed in database
      await this.batchFileStatusRepo.updateProcessingResults(
        fileId,
        0,
        fileStatus.properties_count || 0,
        0,
        (error as Error).message
      );
      
      // Clean up
      try {
        if (await this.fileExists(processingPath)) {
          await fs.promises.unlink(processingPath);
        }
        if (await this.fileExists(lockFile)) {
          await fs.promises.unlink(lockFile);
        }
      } catch (cleanupError) {
        console.error(`Error cleaning up after failed processing:`, cleanupError);
      }
      
      return { success: false, message: (error as Error).message };
    }
  }
  
  /**
   * Find stuck files
   * @param pendingMinutes Minutes threshold for pending files
   * @param processingMinutes Minutes threshold for processing files
   * @returns Array of stuck batch files
   */
  async findStuckFiles(
    pendingMinutes: number = 60,
    processingMinutes: number = 180
  ): Promise<BatchFileStatus[]> {
    return this.batchFileStatusRepo.findStuckFiles(pendingMinutes, processingMinutes);
  }
  
  /**
   * Clean up old files
   * @param monthsToKeep Number of months to keep files
   * @returns Number of directories removed
   */
  async cleanupOldFiles(monthsToKeep: number = 1): Promise<number> {
    try {
      const dirs = await fs.promises.readdir(this.baseDir);
      const now = new Date();
      let removedCount = 0;
      
      for (const dir of dirs) {
        // Skip non-month directories
        if (!dir.match(/^\d{4}-\d{2}$/)) continue;
        
        const [yearStr, monthStr] = dir.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1; // JS months are 0-based
        
        const dirDate = new Date(year, month, 1);
        const monthsDiff = this.getMonthsDifference(dirDate, now);
        
        if (monthsDiff > monthsToKeep) {
          const dirPath = path.join(this.baseDir, dir);
          await fs.promises.rm(dirPath, { recursive: true, force: true });
          removedCount++;
          console.log(`Removed old property payload directory: ${dirPath}`);
        }
      }
      
      return removedCount;
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      return 0;
    }
  }
  
  /**
   * Ensure directory exists
   * @param dir Directory path
   */
  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  /**
   * Check if file exists
   * @param filePath File path
   * @returns True if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get month directory
   * @param date Date
   * @returns Path to month directory
   */
  private getMonthDirectory(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return path.join(this.baseDir, `${year}-${month}`);
  }
  
  /**
   * Format timestamp
   * @param date Date
   * @returns Formatted timestamp
   */
  private formatTimestamp(date: Date): string {
    return date.toISOString()
      .replace(/[:.]/g, '')
      .replace('T', '')
      .replace('Z', '');
  }
  
  /**
   * Calculate checksum of data
   * @param data Data to calculate checksum for
   * @returns Checksum
   */
  private calculateChecksum(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }
  
  /**
   * Write JSON to file
   * @param filePath File path
   * @param data Data to write
   */
  private async writeJsonToFile(filePath: string, data: any): Promise<void> {
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error writing to ${filePath}:`, error);
      throw new Error(`Failed to write property payload: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get relative path
   * @param absolutePath Absolute path
   * @returns Relative path
   */
  private getRelativePath(absolutePath: string): string {
    return path.relative(process.cwd(), absolutePath).replace(/\\/g, '/');
  }
  
  /**
   * Get absolute path
   * @param relativePath Relative path
   * @returns Absolute path
   */
  private getAbsolutePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.join(process.cwd(), relativePath);
  }
  
  /**
   * Get months difference between two dates
   * @param date1 First date
   * @param date2 Second date
   * @returns Number of months
   */
  private getMonthsDifference(date1: Date, date2: Date): number {
    const yearDiff = date2.getFullYear() - date1.getFullYear();
    const monthDiff = date2.getMonth() - date1.getMonth();
    return yearDiff * 12 + monthDiff;
  }
}
