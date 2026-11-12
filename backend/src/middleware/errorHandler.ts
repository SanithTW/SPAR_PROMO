import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { ExternalApiError } from '../integrations/common/apiErrors.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ExternalApiError) {
    return sendError(res, err.message, err.statusCode);
  }

  // Safe server logging without sensitive data
  console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err.message);

  const statusCode = (err as unknown as { statusCode?: number }).statusCode || 500;
  const message = statusCode < 500 ? err.message : 'An unexpected internal server error occurred.';

  return sendError(res, message, statusCode);
}
