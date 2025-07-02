// redisClient.js
// Centralized Redis client for service layer caching

import { createClient } from 'redis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REDIS_HOST = process.env.REDIS_HOST || 'redis-13649.c274.us-east-1-3.ec2.redns.redis-cloud.com';
const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 13649;
const REDIS_USERNAME = process.env.REDIS_USERNAME || 'default';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'lL54Evy8VpxMlNQcL6GFYg6RMZkv0mPK';

const client = createClient({
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
    socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        reconnectStrategy: (retries) => {
            // Exponential backoff for reconnection
            if (retries > 10) return new Error('Redis: Too many retries');
            return Math.min(retries * 50, 2000);
        }
    }
});

client.on('connect', () => {
    console.log('Redis client connected');
});

client.on('ready', () => {
    console.log('Redis client ready to use');
});

client.on('reconnecting', () => {
    console.warn('Redis client reconnecting...');
});

client.on('end', () => {
    console.warn('Redis client connection closed');
});

client.on('error', err => {
    console.error('Redis Client Error:', err);
});

let connectPromise;
async function connectRedis() {
    if (!client.isOpen) {
        if (!connectPromise) {
            connectPromise = client.connect().catch(err => {
                connectPromise = null;
                throw err;
            });
        }
        await connectPromise;
    }
}

process.on('SIGINT', async () => {
    try {
        await client.quit();
        console.log('Redis client disconnected through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error during Redis client quit:', err);
        process.exit(1);
    }
});

/**
 * Returns true if the Redis client is ready for commands.
 */
export function redisAvailable() {
    return client.isReady;
}

export default { client, connectRedis };
