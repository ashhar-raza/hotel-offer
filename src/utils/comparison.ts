import type { HotelOffer } from '../types/hotel.types';

/**
 * Deduplicates and compares hotel offers from two suppliers.
 *
 * Rules:
 *  - Hotels are keyed by their name (case-insensitive comparison).
 *  - If a hotel exists in both suppliers, the cheaper offer is kept.
 *  - If prices are equal, Supplier A wins (deterministic tie-breaker).
 *  - If a hotel exists in only one supplier, that offer is kept.
 *  - The original display name (first-seen) is preserved in the response.
 *
 * Complexity: O(A + B) time, O(A + B) space
 *
 * @param supplierA - Hotel offers from Supplier A
 * @param supplierB - Hotel offers from Supplier B
 * @returns Deduplicated list of cheapest hotel offers
 */
export function compareAndDeduplicate(
  supplierA: HotelOffer[],
  supplierB: HotelOffer[]
): HotelOffer[] {
  // Map keyed by normalised hotel name, value is the winning offer
  const offerMap = new Map<string, HotelOffer>();

  // Add all Supplier A hotels first
  for (const offer of supplierA) {
    const key = normaliseKey(offer.name);
    const existing = offerMap.get(key);
    if (!existing || offer.price < existing.price) {
      // Preserve original display name from first occurrence
      offerMap.set(key, existing ? { ...offer, name: existing.name } : offer);
    }
  }

  // Merge Supplier B — keep cheaper; Supplier A wins on tie
  for (const offer of supplierB) {
    const key = normaliseKey(offer.name);
    const existing = offerMap.get(key);

    if (!existing) {
      // Hotel only in Supplier B — add it
      offerMap.set(key, offer);
    } else if (offer.price < existing.price) {
      // Supplier B is cheaper — replace but preserve display name
      offerMap.set(key, { ...offer, name: existing.name });
    }
    // If prices equal or Supplier A is cheaper, keep Supplier A (no-op)
  }

  return Array.from(offerMap.values());
}

/**
 * Normalises a hotel name for consistent Map keying.
 * Trims whitespace and lowercases.
 */
function normaliseKey(name: string): string {
  return name.trim().toLowerCase();
}
