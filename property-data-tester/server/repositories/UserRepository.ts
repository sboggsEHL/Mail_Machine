import { Pool, PoolClient, QueryResult } from 'pg';
import bcrypt from 'bcrypt';
import { BaseRepository } from './BaseRepository';

/**
 * User database entity
 */
export interface UserEntity {
  user_id: number;
  username: string;
  email: string;
  password: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * User repository for database operations
 */
export class UserRepository extends BaseRepository<UserEntity> {
  constructor(pool: Pool) {
    super(pool, 'users');
  }

  /**
   * Find a user by username
   * @param username Username to find
   * @param client Optional client for transaction handling
   * @returns User entity or null if not found
   */
  async findByUsername(username: string, client?: PoolClient): Promise<UserEntity | null> {
    const queryExecutor = client || this.pool;
    
    const result = await queryExecutor.query<UserEntity>(
      `SELECT * FROM ${this.tableName} WHERE username = $1 AND is_active = TRUE`,
      [username]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Verify user credentials
   * @param username Username to verify
   * @param password Password to verify
   * @param client Optional client for transaction handling
   * @returns User entity if credentials are valid, null otherwise
   */
  async verifyCredentials(username: string, password: string, client?: PoolClient): Promise<UserEntity | null> {
    const user = await this.findByUsername(username, client);
    
    if (!user) {
      return null;
    }
    
    // Verify password
    try {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return null;
      }
      
      // Update last login timestamp
      await this.updateLastLogin(user.user_id, client);
      
      return user;
    } catch (error) {
      console.error('Error verifying password:', error);
      return null;
    }
  }

  /**
   * Update the user's last login timestamp
   * @param userId User ID
   * @param client Optional client for transaction handling
   */
  async updateLastLogin(userId: number, client?: PoolClient): Promise<void> {
    const queryExecutor = client || this.pool;
    
    await queryExecutor.query(
      `UPDATE ${this.tableName} SET last_login = NOW(), updated_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Map a database user entity to a client user object
   * @param userEntity User entity from database
   * @returns Mapped user object for client
   */
  mapToClientUser(userEntity: UserEntity): any {
    return {
      id: userEntity.user_id,
      username: userEntity.username,
      email: userEntity.email,
      firstName: userEntity.first_name,
      lastName: userEntity.last_name,
      isAdmin: userEntity.is_admin,
      lastLogin: userEntity.last_login
    };
  }

  /**
   * Override the ID field name for users
   */
  protected getIdFieldName(): string {
    return 'user_id';
  }
}
