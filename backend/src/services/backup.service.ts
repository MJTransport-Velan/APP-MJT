import { backupRecordRepository } from '../repositories/backup-record.repository';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { runPgDump, verifyPgDumpFile } from '../utils/pgDump.util';
import { logger } from '../config/logger';
import { BackupTrigger } from '@prisma/client';

function serialize<T extends { sizeBytes: bigint | null }>(record: T) {
  return { ...record, sizeBytes: record.sizeBytes === null ? null : Number(record.sizeBytes) };
}

export const backupService = {
  async runBackup(trigger: BackupTrigger, actorId?: string) {
    const record = await backupRecordRepository.create({ type: 'FULL', status: 'RUNNING', triggeredBy: trigger, triggeredById: actorId ?? null });

    try {
      const fileNameBase = `mj_erp_backup_${record.id}`;
      const { filePath, sizeBytes } = await runPgDump(fileNameBase);
      const updated = await backupRecordRepository.update(record.id, {
        status: 'SUCCESS',
        fileName: `${fileNameBase}.dump`,
        filePath,
        sizeBytes: BigInt(sizeBytes),
        completedAt: new Date(),
      });

      if (actorId) {
        await auditService.record({ userId: actorId, action: 'BACKUP', entityType: 'BackupRecord', entityId: record.id, description: `${trigger} backup completed (${sizeBytes} bytes)` });
      }
      return serialize(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Backup failed';
      logger.error('Backup failed', err);
      const updated = await backupRecordRepository.update(record.id, { status: 'FAILED', errorMessage: message.slice(0, 1000), completedAt: new Date() });
      return serialize(updated);
    }
  },

  async verify(id: string, actorId: string) {
    const record = await backupRecordRepository.findById(id);
    if (!record) throw new AppError('Backup record not found', 404);
    if (record.status !== 'SUCCESS' || !record.filePath) {
      throw new AppError('Only a successfully completed backup can be verified', 422);
    }

    const result = await verifyPgDumpFile(record.filePath);
    const updated = result.ok ? await backupRecordRepository.update(id, { verifiedAt: new Date() }) : record;

    await auditService.record({
      userId: actorId,
      action: 'BACKUP_VERIFY',
      entityType: 'BackupRecord',
      entityId: id,
      description: result.ok ? `Restore validation passed: ${result.detail}` : `Restore validation failed: ${result.detail}`,
    });

    return { ...serialize(updated), verificationDetail: result.detail, verificationPassed: result.ok };
  },

  async list(query: { page?: string; pageSize?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Number(query.pageSize) || 20);
    const { rows, total } = await backupRecordRepository.findManyPaginated({ skip: (page - 1) * pageSize, take: pageSize });
    return { data: rows.map(serialize), meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  },

  async latestStatus() {
    const record = await backupRecordRepository.latestSuccessful();
    return record ? serialize(record) : null;
  },
};
