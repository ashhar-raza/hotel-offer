import { readFileSync } from 'fs';
import { join } from 'path';
import { type HotelOffer } from '../../types/hotel.types';
import { logger } from '../../utils/logger';

/**
 * Loads all offers from a static JSON data file.
 * The JSON file is a Record<city, HotelOffer[]>.
 *
 * @param filename - filename relative to src/data (e.g. 'supplierA.json')
 * @param city     - normalised (lowercase, trimmed) city name
 */
function loadFromJson(filename: string, city: string): HotelOffer[] {
  // __dirname resolves to dist/temporal/activities at runtime (after tsc),
  // so we walk up three levels to reach the project root and into src/data.
  const dataPath = join(__dirname, '..', '..', '..', 'src', 'data', filename);
  const raw = readFileSync(dataPath, 'utf-8');
  // Strip UTF-8 BOM (\uFEFF) — PowerShell Out-File adds it by default and
  // JSON.parse throws "Unexpected token" if it's present.
  const stripped = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const data: Record<string, HotelOffer[]> = JSON.parse(stripped);
  return data[city] ?? [];
}

/**
 * Temporal activity: Return hotel offers for a city from the Supplier A
 * static JSON file (src/data/supplierA.json).
 *
 * Retries are configured externally via the workflow's ActivityOptions.
 */
export async function getSupplierAHotels(city: string): Promise<HotelOffer[]> {
  logger.info({ city }, 'Activity: loading Supplier A hotels from static JSON');
  const hotels = loadFromJson('supplierA.json', city);
  logger.info({ city, count: hotels.length }, 'Activity: Supplier A data loaded');
  return hotels;
}

/**
 * Temporal activity: Return hotel offers for a city from the Supplier B
 * static JSON file (src/data/supplierB.json).
 *
 * Retries are configured externally via the workflow's ActivityOptions.
 */
export async function getSupplierBHotels(city: string): Promise<HotelOffer[]> {
  logger.info({ city }, 'Activity: loading Supplier B hotels from static JSON');
  const hotels = loadFromJson('supplierB.json', city);
  logger.info({ city, count: hotels.length }, 'Activity: Supplier B data loaded');
  return hotels;
}
