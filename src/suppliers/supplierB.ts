import type { HotelOffer } from '../types/hotel.types';

/**
 * Static mock hotel data for Supplier B.
 *
 * Supported cities: delhi, mumbai, bangalore
 * Returns [] for any unknown city.
 *
 * Delhi intentionally overlaps with Supplier A:
 *   Holtin   → Supplier B cheaper (5340 vs 6000)
 *   Radison  → Supplier A cheaper (5900 vs 6200)
 *   Taj Palace → Supplier A only
 *   Marriott → Supplier B only
 */
const supplierBData: Record<string, HotelOffer[]> = {
  delhi: [
    {
      hotelId: 'b1',
      name: 'Holtin',
      price: 5340,
      city: 'delhi',
      commissionPct: 20,
      supplier: 'Supplier B',
    },
    {
      hotelId: 'b2',
      name: 'Radison',
      price: 6200,
      city: 'delhi',
      commissionPct: 12,
      supplier: 'Supplier B',
    },
    {
      hotelId: 'b3',
      name: 'Marriott',
      price: 8200,
      city: 'delhi',
      commissionPct: 18,
      supplier: 'Supplier B',
    },
    {
      hotelId: 'b4',
      name: 'The Leela',
      price: 9200,
      city: 'delhi',
      commissionPct: 17,
      supplier: 'Supplier B',
    },
  ],
  mumbai: [
    {
      hotelId: 'b5',
      name: 'Oberoi',
      price: 10500,
      city: 'mumbai',
      commissionPct: 15,
      supplier: 'Supplier B',
    },
    {
      hotelId: 'b6',
      name: 'Taj Lands End',
      price: 9000,
      city: 'mumbai',
      commissionPct: 12,
      supplier: 'Supplier B',
    },
    {
      hotelId: 'b7',
      name: 'JW Marriott',
      price: 13000,
      city: 'mumbai',
      commissionPct: 14,
      supplier: 'Supplier B',
    },
  ],
  bangalore: [
    {
      hotelId: 'b8',
      name: 'Taj Vivanta',
      price: 7500,
      city: 'bangalore',
      commissionPct: 14,
      supplier: 'Supplier B',
    },
    {
      hotelId: 'b9',
      name: 'Leela Palace',
      price: 10800,
      city: 'bangalore',
      commissionPct: 13,
      supplier: 'Supplier B',
    },
  ],
};

/**
 * Returns hotel offers for the given city from Supplier B.
 * Returns an empty array for unknown cities.
 */
export function getSupplierBData(city: string): HotelOffer[] {
  const normalised = city.trim().toLowerCase();
  return supplierBData[normalised] ?? [];
}
