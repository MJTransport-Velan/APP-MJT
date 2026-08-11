import { ArchiveScope } from '@prisma/client';
import { prisma } from '../config/db';
import { archiveRunRepository } from '../repositories/archive-run.repository';
import { auditService } from './audit.service';
import { logger } from '../config/logger';

async function deleteOlderThan(scope: ArchiveScope, cutoffDate: Date): Promise<number> {
  switch (scope) {
    case 'AUDIT_LOG':
      return (await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoffDate } } })).count;
    case 'API_REQUEST_LOG':
      return (await prisma.apiRequestLog.deleteMany({ where: { createdAt: { lt: cutoffDate } } })).count;
    case 'WEBHOOK_DELIVERY':
      return (await prisma.webhookDelivery.deleteMany({ where: { createdAt: { lt: cutoffDate } } })).count;
  }
}

export const archiveService = {
  /**
   * Log/trail data (Audit/ApiRequestLog/WebhookDelivery) is safe to prune
   * outright. The ArchiveRun record itself is the permanent trail of what
   * was removed and when.
   */
  async archiveLogs(scope: ArchiveScope, cutoffDays: number, actorId?: string) {
    const cutoffDate = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);
    const run = await archiveRunRepository.create({ scope, cutoffDate, status: 'RUNNING', triggeredById: actorId ?? null });

    try {
      const count = await deleteOlderThan(scope, cutoffDate);
      const updated = await archiveRunRepository.update(run.id, { status: 'SUCCESS', recordsArchived: count, completedAt: new Date() });

      if (actorId) {
        await auditService.record({ userId: actorId, action: 'ARCHIVE', entityType: 'ArchiveRun', entityId: run.id, description: `Archived ${count} ${scope} rows older than ${cutoffDate.toISOString()}` });
      }
      return updated;
    } catch (err) {
      logger.error('Archive run failed', err);
      const message = err instanceof Error ? err.message : 'Archive failed';
      return archiveRunRepository.update(run.id, { status: 'FAILED', errorMessage: message.slice(0, 1000), completedAt: new Date() });
    }
  },

  list(query: { page?: string; pageSize?: string; scope?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Number(query.pageSize) || 20);
    return archiveRunRepository
      .findManyPaginated({ scope: query.scope as ArchiveScope | undefined, skip: (page - 1) * pageSize, take: pageSize })
      .then(({ rows, total }) => ({ data: rows, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } }));
  },
};
