import { createClient, type RedisClientType } from 'redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Singleton Redis client.
 * Connects once and reuses the connection across the application.
 */
let client: RedisClientType | null = null;
let isConnected = false;

export async function getRedisClient(): Promise<RedisClientType> {
  if (client && isConnected) {
    return client;
  }

  client = createClient({
    socket: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis: Maximum reconnection attempts reached');
          return new Error('Max Redis reconnection attempts reached');
        }
        const delay = Math.min(retries * 100, 3000);
        logger.warn({ retries, delay }, 'Redis: Reconnecting...');
        return delay;
      },
    },
  }) as RedisClientType;

  client.on('error', (err: Error) => {
    logger.error({ err }, 'Redis client error');
    isConnected = false;
  });

  client.on('ready', () => {
    logger.info('Redis client connected and ready');
    isConnected = true;
  });

  client.on('end', () => {
    logger.warn('Redis client connection closed');
    isConnected = false;
  });

  await client.connect();
  return client;
}

/**
 * Disconnects and destroys the Redis client.
 * Used for graceful shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.disconnect();
    client = null;
    isConnected = false;
    logger.info('Redis client disconnected');
  }
}

/**
 * Pings Redis and returns true if healthy.
 */
export async function pingRedis(): Promise<boolean> {
  try {
    const c = await getRedisClient();
    const result = await c.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
