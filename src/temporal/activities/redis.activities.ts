import { createClient } from 'redis';
import type { HotelOffer } from '../../types/hotel.types';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Redis key pattern: hotel:offers:{city}
 */
function redisKey(city: string): string {
  return `hotel:offers:${city.trim().toLowerCase()}`;
}

/**
 * Creates a short-lived Redis client for use inside a Temporal activity.
 *
 * Activities run inside the worker process, not the API server, so we
 * cannot reuse the singleton from redis.client.ts (which lives in the API
 * process). Each activity invocation creates and closes its own connection.
 */
async function makeRedisClient() {
  const client = createClient({
    socket: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
  });
  await client.connect();
  return client;
}

/**
 * Temporal activity: Save deduplicated hotel offers to a Redis Sorted Set.
 *
 * Key:   hotel:offers:{city}
 * Score: hotel price (enables ZRANGEBYSCORE filtering)
 * Member: JSON-serialised HotelOffer
 *
 * The existing key is deleted before writing to ensure a clean snapshot.
 */
export async function saveHotelsToRedis(
  city: string,
  hotels: HotelOffer[]
): Promise<void> {
  const key = redisKey(city);
  logger.info({ city, key, count: hotels.length }, 'Activity: saving hotels to Redis');

  const client = await makeRedisClient();

  try {
    if (hotels.length === 0) {
      // Delete stale data for this city so callers get an empty result
      await client.del(key);
      logger.info({ city }, 'Activity: no hotels — cleared Redis key');
      return;
    }

    // Atomically replace the sorted set
    const pipeline = client.multi();
    pipeline.del(key);
    for (const hotel of hotels) {
      pipeline.zAdd(key, { score: hotel.price, value: JSON.stringify(hotel) });
    }
    await pipeline.exec();

    // Set a 24-hour TTL so stale city data eventually expires
    await client.expire(key, 86_400);

    logger.info({ city, key, count: hotels.length }, 'Activity: Redis save complete');
  } finally {
    await client.disconnect();
  }
}

/**
 * Temporal activity: Retrieve hotels from Redis filtered by price range.
 *
 * Uses ZRANGEBYSCORE — filtering happens entirely inside Redis.
 *
 * @param city      Normalised city name
 * @param minPrice  Minimum price (inclusive), defaults to 0
 * @param maxPrice  Maximum price (inclusive), defaults to +∞
 */
export async function getHotelsFromRedis(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<HotelOffer[]> {
  const key = redisKey(city);
  const min = minPrice ?? 0;
  const max = maxPrice ?? '+inf';

  logger.info({ city, key, min, max }, 'Activity: querying Redis by price range');

  const client = await makeRedisClient();

  try {
    const members = await client.zRangeByScore(key, min, max);
    const hotels: HotelOffer[] = members.map((m) => JSON.parse(m) as HotelOffer);
    logger.info({ city, count: hotels.length }, 'Activity: Redis filter complete');
    return hotels;
  } finally {
    await client.disconnect();
  }
}

/**
 * Temporal activity: Check whether Redis already contains data for a city.
 */
export async function cityExistsInRedis(city: string): Promise<boolean> {
  const key = redisKey(city);
  const client = await makeRedisClient();
  try {
    const count = await client.zCard(key);
    return count > 0;
  } finally {
    await client.disconnect();
  }
}
