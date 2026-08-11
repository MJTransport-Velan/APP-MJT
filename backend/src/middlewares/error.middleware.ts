import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { sendError } from '../utils/response';
import { systemExceptionService } from '../services/system-exception.service';

export class AppError extends Error {
  statusCode: number;
  errors?: unknown;

  constructor(message: string, statusCode = 400, errors?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function notFoundHandler(req: Request, res: Response) {
  sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error(err.message, { stack: err.stack });

  // Phase 14 (docs Phase 8) Exception Management — only genuinely
  // unexpected server errors (5xx, non-AppError) are recorded; routine
  // 4xx validation/business rejections via AppError are normal control
  // flow, not exceptions to triage.
  if (!(err instanceof AppError)) {
    void systemExceptionService.record({
      module: `${req.method} ${req.baseUrl}${req.path}`,
      errorType: 'UNEXPECTED',
      message: err.message,
      stackTrace: err.stack,
      context: { originalUrl: req.originalUrl },
    });
  }

  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message, err.errors);
  }

  return sendError(res, 500, 'Internal Server Error');
}
