import { Request, Response } from 'express';
import { getSupplierAData } from '../suppliers/supplierA';
import { getSupplierBData } from '../suppliers/supplierB';
import { logger } from '../utils/logger';

/**
 * GET /supplierA/hotels?city={city}[&fail=true]
 *
 * Returns mock hotel offers from Supplier A for the given city.
 * Pass ?fail=true to simulate a 503 Service Unavailable (for testing retries).
 */
export function getSupplierAHotels(req: Request, res: Response): void {
  const city = (req.query['city'] as string | undefined) ?? '';
  const fail = req.query['fail'] === 'true';

  logger.info({ city, fail }, 'Supplier A request received');

  if (fail) {
    logger.warn({ city }, 'Supplier A simulated failure');
    res.status(503).json({ error: 'Supplier A service temporarily unavailable' });
    return;
  }

  const hotels = getSupplierAData(city);
  logger.info({ city, count: hotels.length }, 'Supplier A responding');
  res.json(hotels);
}

/**
 * GET /supplierB/hotels?city={city}[&fail=true]
 *
 * Returns mock hotel offers from Supplier B for the given city.
 * Pass ?fail=true to simulate a 503 Service Unavailable (for testing retries).
 */
export function getSupplierBHotels(req: Request, res: Response): void {
  const city = (req.query['city'] as string | undefined) ?? '';
  const fail = req.query['fail'] === 'true';

  logger.info({ city, fail }, 'Supplier B request received');

  if (fail) {
    logger.warn({ city }, 'Supplier B simulated failure');
    res.status(503).json({ error: 'Supplier B service temporarily unavailable' });
    return;
  }

  const hotels = getSupplierBData(city);
  logger.info({ city, count: hotels.length }, 'Supplier B responding');
  res.json(hotels);
}
