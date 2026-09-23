import type { HotelOffer } from '../types/hotel.types';

/**
 * Static mock hotel data for Supplier A.
 *
 * Supported cities: delhi, mumbai, bangalore
 * Returns [] for any unknown city.
 */
const supplierAData: Record<string, HotelOffer[]> = {
  delhi: [
    {
      hotelId: 'a1',
      name: 'Holtin',
      price: 6000,
      city: 'delhi',
      commissionPct: 10,
      supplier: 'Supplier A',
    },
    {
      hotelId: 'a2',
      name: 'Radison',
      price: 5900,
      city: 'delhi',
      commissionPct: 13,
      supplier: 'Supplier A',
    },
    {
      hotelId: 'a3',
      name: 'Taj Palace',
      price: 7500,
      city: 'delhi',
      commissionPct: 15,
      supplier: 'Supplier A',
    },
    {
      hotelId: 'a4',
      name: 'The Leela',
      price: 9200,
      city: 'delhi',
      commissionPct: 12,
      supplier: 'Supplier A',
    },
  ],
  mumbai: [
    {
      hotelId: 'a5',
      name: 'Oberoi',
      price: 11000,
      city: 'mumbai',
      commissionPct: 14,
      supplier: 'Supplier A',
    },
    {
      hotelId: 'a6',
      name: 'Trident',
      price: 7800,
      city: 'mumbai',
      commissionPct: 11,
      supplier: 'Supplier A',
    },
    {
      hotelId: 'a7',
      name: 'JW Marriott',
      price: 12500,
      city: 'mumbai',
      commissionPct: 16,
      supplier: 'Supplier A',
    },
  ],
  bangalore: [
    {
      hotelId: 'a8',
      name: 'ITC Windsor',
      price: 8900,
      city: 'bangalore',
      commissionPct: 13,
      supplier: 'Supplier A',
    },
    {
      hotelId: 'a9',
      name: 'Leela Palace',
      price: 10200,
      city: 'bangalore',
      commissionPct: 15,
      supplier: 'Supplier A',
    },
  ],
};

/**
 * Returns hotel offers for the given city from Supplier A.
 * Returns an empty array for unknown cities.
 */
export function getSupplierAData(city: string): HotelOffer[] {
  const normalised = city.trim().toLowerCase();
  return supplierAData[normalised] ?? [];
}
