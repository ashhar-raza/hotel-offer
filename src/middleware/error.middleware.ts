import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Shape of a structured application error.
 */
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Centralized Express error-handling middleware.
 *
 * Usage: app.use(errorMiddleware) — must be registered after all routes.
 *
 * Supplier failures propagate: Supplier → Activity → Workflow → Service → here.
 *
 * In production:
 *  - Only the generic message is exposed to the client.
 *  - Stack traces are logged server-side but never sent to the client.
 */
export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const isOperational = err.isOperational ?? false;

  // Always log the full error server-side
  if (statusCode >= 500) {
    logger.error(
      { err, statusCode },
      'Unhandled server error'
    );
  } else {
    logger.warn({ err, statusCode }, 'Client error');
  }

  // Do not expose stack traces or internal details to clients
  const clientMessage =
    isOperational && statusCode < 500
      ? err.message
      : 'Failed to fetch hotel offers';

  res.status(statusCode).json({ error: clientMessage });
}

/**
 * Creates a structured operational error that the middleware will
 * expose to clients (safe to show, no sensitive details).
 */
export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}
