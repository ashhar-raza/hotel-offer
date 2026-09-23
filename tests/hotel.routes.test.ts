import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import type { Express } from 'express';

/**
 * Route-level tests for GET /api/hotels query parameter validation.
 *
 * These tests mock the hotel service and Redis/Temporal so they do not
 * require live infrastructure.
 */

// Mock hotel.service so tests don't need Temporal or Redis
vi.mock('../src/services/hotel.service', () => ({
  getHotels: vi.fn().mockResolvedValue([
    {
      hotelId: 'a1',
      name: 'Holtin',
      price: 5340,
      city: 'delhi',
      commissionPct: 20,
      supplier: 'Supplier B',
    },
    {
      hotelId: 'a2',
      name: 'Radison',
      price: 5900,
      city: 'delhi',
      commissionPct: 13,
      supplier: 'Supplier A',
    },
  ]),
}));

// Mock temporal client so health check doesn't fail
vi.mock('../src/temporal/client', () => ({
  getTemporalClient: vi.fn(),
  disconnectTemporal: vi.fn(),
  pingTemporal: vi.fn().mockResolvedValue(false),
}));

// Mock redis client so health check doesn't fail
vi.mock('../src/redis/redis.client', () => ({
  getRedisClient: vi.fn(),
  disconnectRedis: vi.fn(),
  pingRedis: vi.fn().mockResolvedValue(false),
}));

let app: Express;

beforeAll(() => {
  app = createApp();
});

afterAll(() => {
  vi.clearAllMocks();
});

describe('GET /api/hotels — validation', () => {
  it('returns 400 when city is missing', async () => {
    const res = await request(app).get('/api/hotels');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when city is empty string', async () => {
    const res = await request(app).get('/api/hotels?city=');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when minPrice is not a number', async () => {
    const res = await request(app).get('/api/hotels?city=delhi&minPrice=abc');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when maxPrice is not a number', async () => {
    const res = await request(app).get('/api/hotels?city=delhi&maxPrice=xyz');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when minPrice is negative', async () => {
    const res = await request(app).get('/api/hotels?city=delhi&minPrice=-100');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when maxPrice is negative', async () => {
    const res = await request(app).get('/api/hotels?city=delhi&maxPrice=-1');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when minPrice > maxPrice', async () => {
    const res = await request(app).get(
      '/api/hotels?city=delhi&minPrice=8000&maxPrice=5000'
    );
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 200 with valid city only', async () => {
    const res = await request(app).get('/api/hotels?city=delhi');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 200 with city and minPrice only', async () => {
    const res = await request(app).get('/api/hotels?city=delhi&minPrice=5000');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 200 with city and maxPrice only', async () => {
    const res = await request(app).get('/api/hotels?city=delhi&maxPrice=7000');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 200 with city and valid price range', async () => {
    const res = await request(app).get(
      '/api/hotels?city=delhi&minPrice=4000&maxPrice=7000'
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('response contains expected hotel fields', async () => {
    const res = await request(app).get('/api/hotels?city=delhi');
    expect(res.status).toBe(200);
    const hotels = res.body as Array<Record<string, unknown>>;
    expect(hotels.length).toBeGreaterThan(0);

    const hotel = hotels[0];
    expect(hotel).toHaveProperty('name');
    expect(hotel).toHaveProperty('price');
    expect(hotel).toHaveProperty('supplier');
    expect(hotel).toHaveProperty('commissionPct');
    // Internal fields should not be exposed
    expect(hotel).not.toHaveProperty('hotelId');
    expect(hotel).not.toHaveProperty('city');
  });

  it('city is case-insensitive (normalised in response)', async () => {
    const res = await request(app).get('/api/hotels?city=DELHI');
    expect(res.status).toBe(200);
  });
});

describe('GET /supplierA/hotels', () => {
  it('returns hotels for delhi', async () => {
    const res = await request(app).get('/supplierA/hotels?city=delhi');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown city', async () => {
    const res = await request(app).get('/supplierA/hotels?city=unknown');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 503 when fail=true', async () => {
    const res = await request(app).get('/supplierA/hotels?city=delhi&fail=true');
    expect(res.status).toBe(503);
  });
});

describe('GET /supplierB/hotels', () => {
  it('returns hotels for delhi', async () => {
    const res = await request(app).get('/supplierB/hotels?city=delhi');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown city', async () => {
    const res = await request(app).get('/supplierB/hotels?city=unknown');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 503 when fail=true', async () => {
    const res = await request(app).get('/supplierB/hotels?city=delhi&fail=true');
    expect(res.status).toBe(503);
  });
});

describe('GET /health', () => {
  it('returns health status object', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('redis');
    expect(res.body).toHaveProperty('temporal');
    expect(res.body).toHaveProperty('suppliers');
    expect(res.body.suppliers).toHaveProperty('supplierA');
    expect(res.body.suppliers).toHaveProperty('supplierB');
  });
});
