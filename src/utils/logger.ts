import pino from 'pino';
import { env } from '../config/env';

const isTest = process.env['NODE_ENV'] === 'test' || process.env['VITEST'] === 'true';

/**
 * Singleton Pino logger used throughout the application.
 * - Development: pretty-printed via pino-pretty transport
 * - Test: silent (suppresses output during test runs)
 * - Production: structured JSON to stdout
 */
export const logger = pino({
  level: isTest ? 'silent' : env.isProduction ? 'info' : 'debug',
  ...(env.isProduction || isTest
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
});
