import 'dotenv/config';

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  /** HTTP port for the Express server */
  PORT: parseInt(optionalEnv('PORT', '3000'), 10),

  /** Application environment */
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),

  /** Redis configuration */
  REDIS_HOST: optionalEnv('REDIS_HOST', 'localhost'),
  REDIS_PORT: parseInt(optionalEnv('REDIS_PORT', '6379'), 10),

  /** Temporal configuration */
  TEMPORAL_ADDRESS: optionalEnv('TEMPORAL_ADDRESS', 'localhost:7233'),
  TEMPORAL_NAMESPACE: optionalEnv('TEMPORAL_NAMESPACE', 'default'),
  TEMPORAL_TASK_QUEUE: optionalEnv('TEMPORAL_TASK_QUEUE', 'hotel-offer-task-queue'),

  /** Base URLs for supplier mock APIs (used by Temporal activities) */
  SUPPLIER_A_BASE_URL: optionalEnv('SUPPLIER_A_BASE_URL', 'http://localhost:3000'),
  SUPPLIER_B_BASE_URL: optionalEnv('SUPPLIER_B_BASE_URL', 'http://localhost:3000'),

  get isProduction(): boolean {
    return this.NODE_ENV === 'production';
  },
} as const;
