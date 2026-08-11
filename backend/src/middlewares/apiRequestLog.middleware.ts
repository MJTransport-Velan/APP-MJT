import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { AuthRequest } from './auth.middleware';

/**
 * REST API Governance / Enterprise Audit Center — API Audit. Fire-and-
 * forget like auditService.record: a failure to log a request must never
 * fail the request itself. Only /api/* traffic is captured (mounted after
 * the /api prefix in app.ts), so static/health checks don't pollute it.
 */
export function apiRequestLogMiddleware(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const userId = (req as AuthRequest).user?.userId ?? null;
    const apiKeyId = (req as Request & { apiKeyId?: string }).apiKeyId ?? null;

    prisma.apiRequestLog
      .create({
        data: {
          method: req.method,
          path: req.originalUrl.split('?')[0].slice(0, 500),
          statusCode: res.statusCode,
          durationMs,
          userId,
          apiKeyId,
          ipAddress: req.ip ?? null,
        },
      })
      .catch((err) => logger.error('Failed to write API request log', err));
  });

  next();
}
