import express from 'express';
import pinoHttp from 'pino-http';
import hotelRoutes from './routes/hotel.routes';
import supplierRoutes from './routes/supplier.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { healthHandler } from './controllers/hotel.controller';
import { logger } from './utils/logger';

/**
 * Creates and configures the Express application.
 *
 * Exported separately from server.ts so it can be imported by tests
 * without starting the HTTP server.
 */
export function createApp(): express.Application {
  const app = express();

  // ── Middleware ──────────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request-level HTTP logging via pino-http
  app.use(
    pinoHttp({
      logger,
      // Don't log health-check requests to reduce noise
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
    })
  );

  // ── Routes ──────────────────────────────────────────────────────────────────
  // API routes: /api/hotels
  app.use('/api', hotelRoutes);

  // Health check at root level (no /api prefix)
  app.get('/health', healthHandler);

  // Supplier mock routes: /supplierA/hotels, /supplierB/hotels
  app.use('/', supplierRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // ── Centralized error handler ────────────────────────────────────────────────
  app.use(errorMiddleware);

  return app;
}

