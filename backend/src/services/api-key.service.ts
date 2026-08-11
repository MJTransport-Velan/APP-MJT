import crypto from 'crypto';
import { prisma } from '../config/db';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';

function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export interface CreateApiKeyInput {
  name: string;
  scopes: string[];
  rateLimitPerMinute?: number;
  expiresAt?: string;
}

export const apiKeyService = {
  async list() {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const rows = await prisma.apiKey.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
    // keyHash is never returned — only the prefix, so the raw key can't be reconstructed after creation.
    return rows.map(({ keyHash: _keyHash, ...rest }) => rest);
  },

  /** The raw key is returned exactly once, at creation — standard API key UX (GitHub/Stripe pattern) since only the hash is ever persisted. */
  async create(input: CreateApiKeyInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const rawKey = `mjerp_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = rawKey.slice(0, 12);
    const keyHash = hashKey(rawKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId,
        name: input.name,
        keyPrefix,
        keyHash,
        scopes: input.scopes.join(','),
        rateLimitPerMinute: input.rateLimitPerMinute ?? 60,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdById: actorId,
      },
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'ApiKey', entityId: apiKey.id, description: `Created API key "${input.name}"` });
    const { keyHash: _keyHash, ...rest } = apiKey;
    return { ...rest, rawKey };
  },

  async revoke(id: string, actorId: string) {
    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing) throw new AppError('API key not found', 404);
    const updated = await prisma.apiKey.update({ where: { id }, data: { isActive: false, revokedAt: new Date() } });
    await auditService.record({ userId: actorId, action: 'REVOKE', entityType: 'ApiKey', entityId: id, description: `Revoked API key "${existing.name}"` });
    const { keyHash: _keyHash, ...rest } = updated;
    return rest;
  },
};
