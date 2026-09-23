import { Router } from 'express';
import { getHotelsHandler } from '../controllers/hotel.controller';

const router = Router();

/**
 * GET /api/hotels?city=delhi[&minPrice=X&maxPrice=Y]
 *
 * Aggregates hotel offers via Temporal workflow and returns deduplicated results.
 * Price filtering is performed inside Redis (ZRANGEBYSCORE).
 */
router.get('/hotels', getHotelsHandler);

export default router;

