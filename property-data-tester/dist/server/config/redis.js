"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisConfig = getRedisConfig;
exports.getRedisUrl = getRedisUrl;
exports.logRedisConfig = logRedisConfig;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * Redis configuration using environment variables
 */
function getRedisConfig() {
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined
    };
}
/**
 * Get Redis connection URL
 */
function getRedisUrl() {
    const config = getRedisConfig();
    const auth = config.password ? `:${config.password}@` : '';
    const tls = config.tls ? 'rediss' : 'redis';
    return `${tls}://${auth}${config.host}:${config.port}`;
}
/**
 * Log Redis connection details for debugging
 */
function logRedisConfig() {
    console.log('Redis connection details:');
    console.log('Host:', process.env.REDIS_HOST || 'localhost');
    console.log('Port:', process.env.REDIS_PORT || '6379');
    console.log('TLS:', process.env.REDIS_TLS || 'false');
}
