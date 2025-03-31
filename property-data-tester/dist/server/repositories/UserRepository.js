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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const BaseRepository_1 = require("./BaseRepository");
/**
 * User repository for database operations
 */
class UserRepository extends BaseRepository_1.BaseRepository {
    constructor(pool) {
        super(pool, 'users');
    }
    /**
     * Find a user by username
     * @param username Username to find
     * @param client Optional client for transaction handling
     * @returns User entity or null if not found
     */
    findByUsername(username, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            const result = yield queryExecutor.query(`SELECT * FROM ${this.tableName} WHERE username = $1 AND is_active = TRUE`, [username]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    /**
     * Verify user credentials
     * @param username Username to verify
     * @param password Password to verify
     * @param client Optional client for transaction handling
     * @returns User entity if credentials are valid, null otherwise
     */
    verifyCredentials(username, password, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.findByUsername(username, client);
            if (!user) {
                return null;
            }
            // Verify password
            try {
                const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
                if (!isPasswordValid) {
                    return null;
                }
                // Update last login timestamp
                yield this.updateLastLogin(user.user_id, client);
                return user;
            }
            catch (error) {
                console.error('Error verifying password:', error);
                return null;
            }
        });
    }
    /**
     * Update the user's last login timestamp
     * @param userId User ID
     * @param client Optional client for transaction handling
     */
    updateLastLogin(userId, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryExecutor = client || this.pool;
            yield queryExecutor.query(`UPDATE ${this.tableName} SET last_login = NOW(), updated_at = NOW() WHERE user_id = $1`, [userId]);
        });
    }
    /**
     * Map a database user entity to a client user object
     * @param userEntity User entity from database
     * @returns Mapped user object for client
     */
    mapToClientUser(userEntity) {
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
    getIdFieldName() {
        return 'user_id';
    }
}
exports.UserRepository = UserRepository;
