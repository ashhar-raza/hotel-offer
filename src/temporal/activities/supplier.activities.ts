import axios from 'axios';
import { type HotelOffer } from '../../types/hotel.types';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Temporal activity: Fetch hotel offers from Supplier A mock API.
 *
 * Retries are configured externally via the workflow's ActivityOptions.
 */
export async function getSupplierAHotels(city: string): Promise<HotelOffer[]> {
  const url = `${env.SUPPLIER_A_BASE_URL}/supplierA/hotels`;
  logger.info({ city, url }, 'Activity: fetching Supplier A hotels');

  const response = await axios.get<HotelOffer[]>(url, {
    params: { city },
    timeout: 10_000,
  });

  logger.info(
    { city, count: response.data.length },
    'Activity: Supplier A response received'
  );

  return response.data;
}

/**
 * Temporal activity: Fetch hotel offers from Supplier B mock API.
 *
 * Retries are configured externally via the workflow's ActivityOptions.
 */
export async function getSupplierBHotels(city: string): Promise<HotelOffer[]> {
  const url = `${env.SUPPLIER_B_BASE_URL}/supplierB/hotels`;
  logger.info({ city, url }, 'Activity: fetching Supplier B hotels');

  const response = await axios.get<HotelOffer[]>(url, {
    params: { city },
    timeout: 10_000,
  });

  logger.info(
    { city, count: response.data.length },
    'Activity: Supplier B response received'
  );

  return response.data;
}
