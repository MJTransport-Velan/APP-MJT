import { ExceptionErrorType } from '@prisma/client';
import { systemExceptionRepository } from '../repositories/system-exception.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from '../services/audit.service';
import { logger } from '../config/logger';

export interface RecordExceptionInput {
  organizationId?: string | null;
  module: string;
  errorType: ExceptionErrorType;
  message: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
}

export const systemExceptionService = {
  /** Never throws — recovery-logging a failure must not itself fail the request. */
  async record(input: RecordExceptionInput): Promise<void> {
    try {
      await systemExceptionRepository.create({
        organizationId: input.organizationId ?? null,
        module: input.module,
        errorType: input.errorType,
        message: input.message.slice(0, 2000),
        stackTrace: input.stackTrace?.slice(0, 4000),
        contextJson: input.context ? JSON.stringify(input.context) : null,
      });
    } catch (err) {
      logger.error('Failed to record system exception', err);
    }
  },

  list(query: { status?: string; errorType?: string; module?: string; page?: string; pageSize?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Number(query.pageSize) || 20);
    return systemExceptionRepository
      .findManyPaginated({ status: query.status, errorType: query.errorType, module: query.module, skip: (page - 1) * pageSize, take: pageSize })
      .then(({ rows, total }) => ({ data: rows, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } }));
  },

  async acknowledge(id: string, actorId: string) {
    const existing = await systemExceptionRepository.findById(id);
    if (!existing) throw new AppError('Exception not found', 404);
    const updated = await systemExceptionRepository.acknowledge(id, actorId);
    await auditService.record({ userId: actorId, action: 'ACKNOWLEDGE', entityType: 'SystemException', entityId: id, description: `Acknowledged exception in ${existing.module}` });
    return updated;
  },

  async resolve(id: string, actorId: string, resolution: string) {
    const existing = await systemExceptionRepository.findById(id);
    if (!existing) throw new AppError('Exception not found', 404);
    const updated = await systemExceptionRepository.resolve(id, actorId, resolution);
    await auditService.record({ userId: actorId, action: 'RESOLVE', entityType: 'SystemException', entityId: id, description: `Resolved exception in ${existing.module}: ${resolution}` });
    return updated;
  },

  openCount() {
    return systemExceptionRepository.openCount();
  },
};
