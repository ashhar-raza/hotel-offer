import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HotelQuerySchema, toResponse } from '../types/hotel.types';
import { getHotels } from '../services/hotel.service';
import { pingRedis } from '../redis/redis.client';
import { pingTemporal } from '../temporal/client';
import { logger } from '../utils/logger';

/**
 * GET /api/hotels
 *
 * Query params:
 *   city      (required)  — city to search
 *   minPrice  (optional)  — inclusive minimum price
 *   maxPrice  (optional)  — inclusive maximum price
 *
 * Validates with Zod, delegates to hotel.service, returns slim JSON response.
 */
export async function getHotelsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info({ query: req.query }, 'Request received: GET /api/hotels');

  // Validate query parameters
  const parseResult = HotelQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    const zodError = parseResult.error as ZodError;
    const messages = zodError.errors.map((e) => e.message).join('; ');
    logger.warn({ errors: zodError.errors }, 'Validation failed');
    res.status(400).json({ error: messages });
    return;
  }

  const { city, minPrice, maxPrice } = parseResult.data;

  try {
    const hotels = await getHotels(city, minPrice, maxPrice);
    const response = hotels.map(toResponse);
    logger.info({ city, count: response.length }, 'Request complete: GET /api/hotels');
    res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /health
 *
 * Returns the health status of all system dependencies.
 * Reports DEGRADED (not DOWN) so the endpoint always returns 200
 * and dependent monitors can read component-level status.
 *
 * Note: supplier health is not checked here because both suppliers
 * are served from static JSON files embedded in the image — they
 * are always available as long as the process is running.
 */
export async function healthHandler(
  _req: Request,
  res: Response
): Promise<void> {
  logger.info('Health check requested');

  const [redisUp, temporalUp] = await Promise.allSettled([
    pingRedis(),
    pingTemporal(),
  ]).then((results) =>
    results.map((r) => r.status === 'fulfilled' && r.value === true)
  );

  const allUp = redisUp && temporalUp;

  const body = {
    status: allUp ? 'UP' : 'DEGRADED',
    redis: redisUp ? 'UP' : 'DOWN',
    temporal: temporalUp ? 'UP' : 'DOWN',
    suppliers: { supplierA: 'UP', supplierB: 'UP' },
  };

  logger.info(body, 'Health check complete');
  res.json(body);
}

