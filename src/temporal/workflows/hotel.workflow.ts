/**
 * Hotel Offer Temporal Workflow
 *
 * Orchestrates parallel supplier fetching, deduplication, and Redis persistence.
 *
 * IMPORTANT: Workflows must be deterministic. All I/O (HTTP, Redis) must be
 * performed inside Activities, not directly in workflow code.
 */

import { proxyActivities } from '@temporalio/workflow';
import type { HotelOffer } from '../../types/hotel.types';
import { compareAndDeduplicate } from '../../utils/comparison';

// Temporal requires activities to be proxied — direct imports are not allowed
// because workflows run inside the Temporal sandbox.
import type * as SupplierActivities from '../activities/supplier.activities';
import type * as RedisActivities from '../activities/redis.activities';

const { getSupplierAHotels, getSupplierBHotels } =
  proxyActivities<typeof SupplierActivities>({
    startToCloseTimeout: '30 seconds',
    retry: {
      initialInterval: '1 second',
      backoffCoefficient: 2,
      maximumAttempts: 3,
    },
  });

const { saveHotelsToRedis } = proxyActivities<typeof RedisActivities>({
  startToCloseTimeout: '15 seconds',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

/**
 * Hotel Offer Workflow
 *
 * Steps:
 * 1. Fetch hotels from Supplier A and Supplier B in parallel.
 * 2. Deduplicate by hotel name — keep cheapest offer.
 * 3. Save deduplicated list to Redis Sorted Set (score = price).
 * 4. Return final hotel list.
 *
 * @param city - Normalised (lowercase, trimmed) city name
 * @returns Deduplicated list of cheapest hotel offers
 */
export async function hotelOfferWorkflow(city: string): Promise<HotelOffer[]> {
  // Step 1: Fetch from both suppliers in parallel
  const [supplierAHotels, supplierBHotels] = await Promise.all([
    getSupplierAHotels(city),
    getSupplierBHotels(city),
  ]);

  // Step 2: Deduplicate and select cheapest
  // compareAndDeduplicate is a pure function — safe to call in workflow context
  const deduplicated = compareAndDeduplicate(supplierAHotels, supplierBHotels);

  // Step 3: Persist to Redis via activity (not directly from workflow)
  await saveHotelsToRedis(city, deduplicated);

  // Step 4: Return results
  return deduplicated;
}
