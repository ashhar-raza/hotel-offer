import { Router } from 'express';
import {
  getSupplierAHotels,
  getSupplierBHotels,
} from '../controllers/supplier.controller';

const router = Router();

/**
 * GET /supplierA/hotels?city={city}[&fail=true]
 *
 * Returns mock hotel data from Supplier A.
 * Supports ?fail=true to simulate a 503 for Temporal retry testing.
 */
router.get('/supplierA/hotels', getSupplierAHotels);

/**
 * GET /supplierB/hotels?city={city}[&fail=true]
 *
 * Returns mock hotel data from Supplier B.
 * Supports ?fail=true to simulate a 503 for Temporal retry testing.
 */
router.get('/supplierB/hotels', getSupplierBHotels);

export default router;
