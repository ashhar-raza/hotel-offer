import { z } from 'zod';

/**
 * Core hotel offer interface representing a single hotel room offer
 * from either supplier.
 */
export interface HotelOffer {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
  supplier: string;
}

/**
 * Slim response returned to API clients (no internal fields).
 */
export interface HotelOfferResponse {
  name: string;
  price: number;
  supplier: string;
  commissionPct: number;
}

/**
 * Zod schema for validating GET /api/hotels query parameters.
 */
export const HotelQuerySchema = z.object({
  city: z
    .string({ required_error: 'city is required' })
    .min(1, 'city must not be empty')
    .transform((v) => v.trim().toLowerCase()),

  minPrice: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined))
    .pipe(
      z
        .number()
        .nonnegative('minPrice must not be negative')
        .optional()
    ),

  maxPrice: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined))
    .pipe(
      z
        .number()
        .nonnegative('maxPrice must not be negative')
        .optional()
    ),
}).refine(
  (data) => {
    if (data.minPrice !== undefined && data.maxPrice !== undefined) {
      return data.minPrice <= data.maxPrice;
    }
    return true;
  },
  { message: 'minPrice must be less than or equal to maxPrice', path: ['minPrice'] }
);

export type HotelQuery = z.infer<typeof HotelQuerySchema>;

/**
 * Converts a HotelOffer to the slim API response shape.
 */
export function toResponse(offer: HotelOffer): HotelOfferResponse {
  return {
    name: offer.name,
    price: offer.price,
    supplier: offer.supplier,
    commissionPct: offer.commissionPct,
  };
}
