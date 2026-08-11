import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from './error.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export interface ApiKeyRequest extends Request {
  apiKeyId?: string;
  apiKeyScopes?: string[];
}

function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Alternate, machine-to-machine auth path (X-API-Key header) — available
 * for any Phase 8+ route that wants it, kept separate from the JWT-based
 * `authenticate` middleware rather than rewired into it, since no existing
 * route in this ERP currently needs machine auth.
 */
export const apiKeyAuth = asyncHandler(async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
  const rawKey = req.header('X-API-Key');
  if (!rawKey) throw new AppError('Missing X-API-Key header', 401);

  const keyHash = hashKey(rawKey);
  const apiKey = await prisma.apiKey.findFirst({ where: { keyHash, isActive: true } });
  if (!apiKey) throw new AppError('Invalid API key', 401);
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) throw new AppError('API key has expired', 401);

  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  req.apiKeyId = apiKey.id;
  req.apiKeyScopes = apiKey.scopes.split(',').map((s) => s.trim());
  next();
});
