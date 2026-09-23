import { createClient } from 'redis';
import { randomUUID } from 'crypto';
import type { HotelOffer } from '../types/hotel.types';
import { getTemporalClient } from '../temporal/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Redis key pattern: hotel:offers:{city}
 */
function redisKey(city: string): string {
  return `hotel:offers:${city}`;
}

/**
 * Creates a short-lived Redis client within the API service.
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
 * Checks whether Redis already contains hotel data for the given city.
 */
async function cityExistsInRedis(city: string): Promise<boolean> {
  const client = await makeRedisClient();
  try {
    const count = await client.zCard(redisKey(city));
    return count > 0;
  } finally {
    await client.disconnect();
  }
}

/**
 * Queries Redis for hotels within the given price range.
 * Filtering is performed entirely inside Redis using ZRANGEBYSCORE.
 *
 * @param city      Normalised city name
 * @param minPrice  Minimum price inclusive (default 0)
 * @param maxPrice  Maximum price inclusive (default +∞)
 */
async function queryRedisHotels(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<HotelOffer[]> {
  const min = minPrice ?? 0;
  const max = maxPrice ?? '+inf';
  const key = redisKey(city);

  logger.info({ city, key, min, max }, 'Service: querying Redis Sorted Set');

  const client = await makeRedisClient();
  try {
    const members = await client.zRangeByScore(key, min, max);
    const hotels: HotelOffer[] = members.map((m) => JSON.parse(m) as HotelOffer);
    logger.info({ city, count: hotels.length }, 'Service: Redis filter complete');
    return hotels;
  } finally {
    await client.disconnect();
  }
}

/**
 * Starts a Temporal workflow to fetch, deduplicate, and cache hotel offers.
 */
async function runWorkflow(city: string): Promise<void> {
  const temporalClient = await getTemporalClient();
  const workflowId = `hotel-offer-${city}-${randomUUID()}`;

  logger.info({ city, workflowId }, 'Service: starting hotel offer workflow');

  const handle = await temporalClient.start('hotelOfferWorkflow', {
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    workflowId,
    args: [city],
  });

  logger.info({ workflowId }, 'Service: waiting for workflow result');
  await handle.result();
  logger.info({ workflowId }, 'Service: workflow completed');
}

/**
 * Main service method.
 *
 * Flow:
 *  1. Check Redis — if city data exists, skip workflow.
 *  2. If not in Redis, run Temporal workflow to fetch + cache offers.
 *  3. Query Redis with price range filter (ZRANGEBYSCORE).
 *  4. Return filtered results.
 *
 * @param city      Normalised (lowercase, trimmed) city name
 * @param minPrice  Optional minimum price filter
 * @param maxPrice  Optional maximum price filter
 */
export async function getHotels(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<HotelOffer[]> {
  logger.info({ city, minPrice, maxPrice }, 'Service: getHotels called');

  const exists = await cityExistsInRedis(city);

  if (!exists) {
    logger.info({ city }, 'Service: cache miss — starting Temporal workflow');
    await runWorkflow(city);
  } else {
    logger.info({ city }, 'Service: cache hit — using Redis data');
  }

  return queryRedisHotels(city, minPrice, maxPrice);
}
