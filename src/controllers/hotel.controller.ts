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
 */
export async function healthHandler(
  _req: Request,
  res: Response
): Promise<void> {
  logger.info('Health check requested');

  const [redisUp, temporalUp, supplierAUp, supplierBUp] = await Promise.allSettled([
    pingRedis(),
    pingTemporal(),
    checkSupplierHealth('supplierA'),
    checkSupplierHealth('supplierB'),
  ]).then((results) =>
    results.map((r) => r.status === 'fulfilled' && r.value === true)
  );

  const allUp = redisUp && temporalUp && supplierAUp && supplierBUp;

  const body = {
    status: allUp ? 'UP' : 'DEGRADED',
    redis: redisUp ? 'UP' : 'DOWN',
    temporal: temporalUp ? 'UP' : 'DOWN',
    suppliers: {
      supplierA: supplierAUp ? 'UP' : 'DOWN',
      supplierB: supplierBUp ? 'UP' : 'DOWN',
    },
  };

  logger.info(body, 'Health check complete');
  res.json(body);
}

/**
 * Pings a supplier endpoint to check availability.
 */
async function checkSupplierHealth(supplier: 'supplierA' | 'supplierB'): Promise<boolean> {
  try {
    const axios = await import('axios');
    // Use a neutral city so that the supplier returns 200 (not necessarily data)
    const url = `http://localhost:${process.env['PORT'] ?? 3000}/${supplier}/hotels?city=delhi`;
    await axios.default.get(url, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
