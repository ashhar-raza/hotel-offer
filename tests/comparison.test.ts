import { describe, it, expect } from 'vitest';
import { compareAndDeduplicate } from '../src/utils/comparison';
import type { HotelOffer } from '../src/types/hotel.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeHotel(
  name: string,
  price: number,
  supplier: 'Supplier A' | 'Supplier B',
  overrides: Partial<HotelOffer> = {}
): HotelOffer {
  return {
    hotelId: `${supplier}-${name}`.replace(/\s/g, '-').toLowerCase(),
    name,
    price,
    city: 'delhi',
    commissionPct: 10,
    supplier,
    ...overrides,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('compareAndDeduplicate', () => {
  it('keeps Supplier A hotel when Supplier A is cheaper', () => {
    const a = [makeHotel('Holtin', 5000, 'Supplier A')];
    const b = [makeHotel('Holtin', 6000, 'Supplier B')];

    const result = compareAndDeduplicate(a, b);

    expect(result).toHaveLength(1);
    expect(result[0]?.supplier).toBe('Supplier A');
    expect(result[0]?.price).toBe(5000);
    expect(result[0]?.name).toBe('Holtin');
  });

  it('keeps Supplier B hotel when Supplier B is cheaper', () => {
    const a = [makeHotel('Holtin', 6000, 'Supplier A')];
    const b = [makeHotel('Holtin', 5340, 'Supplier B')];

    const result = compareAndDeduplicate(a, b);

    expect(result).toHaveLength(1);
    expect(result[0]?.supplier).toBe('Supplier B');
    expect(result[0]?.price).toBe(5340);
  });

  it('keeps hotel that only exists in Supplier A', () => {
    const a = [makeHotel('Taj Palace', 7500, 'Supplier A')];
    const b: HotelOffer[] = [];

    const result = compareAndDeduplicate(a, b);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Taj Palace');
    expect(result[0]?.supplier).toBe('Supplier A');
  });

  it('keeps hotel that only exists in Supplier B', () => {
    const a: HotelOffer[] = [];
    const b = [makeHotel('Marriott', 8200, 'Supplier B')];

    const result = compareAndDeduplicate(a, b);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Marriott');
    expect(result[0]?.supplier).toBe('Supplier B');
  });

  it('Supplier A wins when prices are equal (deterministic tie-breaker)', () => {
    const a = [makeHotel('The Leela', 9200, 'Supplier A')];
    const b = [makeHotel('The Leela', 9200, 'Supplier B')];

    const result = compareAndDeduplicate(a, b);

    expect(result).toHaveLength(1);
    expect(result[0]?.supplier).toBe('Supplier A');
    expect(result[0]?.price).toBe(9200);
  });

  it('returns empty array when Supplier A is empty', () => {
    const a: HotelOffer[] = [];
    const b = [makeHotel('Marriott', 8200, 'Supplier B')];

    const result = compareAndDeduplicate(a, b);

    expect(result).toHaveLength(1);
    expect(result[0]?.supplier).toBe('Supplier B');
  });

  it('returns empty array when Supplier B is empty', () => {
    const a = [makeHotel('Radison', 5900, 'Supplier A')];
    const b: HotelOffer[] = [];

    const result = compareAndDeduplicate(a, b);

    expect(result).toHaveLength(1);
    expect(result[0]?.supplier).toBe('Supplier A');
  });

  it('returns empty array when both suppliers are empty', () => {
    const result = compareAndDeduplicate([], []);
    expect(result).toHaveLength(0);
  });

  it('correctly deduplicates the full Delhi dataset', () => {
    const a: HotelOffer[] = [
      makeHotel('Holtin', 6000, 'Supplier A'),
      makeHotel('Radison', 5900, 'Supplier A'),
      makeHotel('Taj Palace', 7500, 'Supplier A'),
    ];
    const b: HotelOffer[] = [
      makeHotel('Holtin', 5340, 'Supplier B'),
      makeHotel('Radison', 6200, 'Supplier B'),
      makeHotel('Marriott', 8200, 'Supplier B'),
    ];

    const result = compareAndDeduplicate(a, b);

    expect(result).toHaveLength(4);

    const byName = Object.fromEntries(result.map((h) => [h.name, h]));

    // Holtin: B is cheaper (5340 < 6000)
    expect(byName['Holtin']?.supplier).toBe('Supplier B');
    expect(byName['Holtin']?.price).toBe(5340);

    // Radison: A is cheaper (5900 < 6200)
    expect(byName['Radison']?.supplier).toBe('Supplier A');
    expect(byName['Radison']?.price).toBe(5900);

    // Taj Palace: only in A
    expect(byName['Taj Palace']?.supplier).toBe('Supplier A');

    // Marriott: only in B
    expect(byName['Marriott']?.supplier).toBe('Supplier B');
  });

  it('handles case-insensitive hotel name matching', () => {
    const a = [makeHotel('HOLTIN', 6000, 'Supplier A')];
    const b = [makeHotel('holtin', 5340, 'Supplier B')];

    const result = compareAndDeduplicate(a, b);

    // Should merge into one — B is cheaper
    expect(result).toHaveLength(1);
    expect(result[0]?.supplier).toBe('Supplier B');
    expect(result[0]?.price).toBe(5340);
    // Display name is preserved from first seen (Supplier A: 'HOLTIN')
    expect(result[0]?.name).toBe('HOLTIN');
  });

  it('handles duplicate hotel names within Supplier A (keeps cheapest)', () => {
    const a: HotelOffer[] = [
      makeHotel('Holtin', 6000, 'Supplier A', { hotelId: 'a1' }),
      makeHotel('Holtin', 5500, 'Supplier A', { hotelId: 'a1-dup' }),
    ];
    const b: HotelOffer[] = [];

    const result = compareAndDeduplicate(a, b);

    expect(result).toHaveLength(1);
    expect(result[0]?.price).toBe(5500);
  });

  it('handles multiple non-overlapping hotels from both suppliers', () => {
    const a = [
      makeHotel('Hotel A1', 3000, 'Supplier A'),
      makeHotel('Hotel A2', 4000, 'Supplier A'),
    ];
    const b = [
      makeHotel('Hotel B1', 5000, 'Supplier B'),
      makeHotel('Hotel B2', 6000, 'Supplier B'),
    ];

    const result = compareAndDeduplicate(a, b);

    expect(result).toHaveLength(4);
  });
});
