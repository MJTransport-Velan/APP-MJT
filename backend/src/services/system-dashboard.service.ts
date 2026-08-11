import fs from 'fs';
import { prisma } from '../config/db';
import { organizationService } from './organization.service';
import { schedulerService } from './scheduler.service';
import { backupRecordRepository } from '../repositories/backup-record.repository';
import { BACKUPS_DIR } from '../utils/pgDump.util';

function dirSizeBytes(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).reduce((total, file) => {
    try {
      return total + fs.statSync(`${dir}/${file}`).size;
    } catch {
      return total;
    }
  }, 0);
}

export const systemDashboardService = {
  async health() {
    let dbConnected = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbConnected = false;
    }

    const mem = process.memoryUsage();
    return {
      dbConnected,
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      memory: { rssMb: Math.round(mem.rss / 1024 / 1024), heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024), heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024) },
      scheduledJobCount: schedulerService.activeTaskCount(),
      checkedAt: new Date(),
    };
  },

  async metrics() {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [runningJobs, failedJobsToday, openExceptions, pendingApprovals, apiRequests24h, apiErrors24h, latestBackup, backupsStorageBytes] = await Promise.all([
      prisma.automationRunLog.count({ where: { status: 'RUNNING' } }),
      prisma.automationRunLog.count({ where: { status: 'FAILED', startedAt: { gte: since24h } } }),
      prisma.systemException.count({ where: { status: 'OPEN' } }),
      // The generic cross-entity ApprovalInstance table went away with the
      // Voucher approval workflow — Petty Cash is the one approval queue
      // that still exists directly on its own table.
      prisma.pettyCashRequest.count({ where: { status: 'PENDING' } }),
      prisma.apiRequestLog.count({ where: { createdAt: { gte: since24h } } }),
      prisma.apiRequestLog.count({ where: { createdAt: { gte: since24h }, statusCode: { gte: 500 } } }),
      backupRecordRepository.latestSuccessful(),
      Promise.resolve(dirSizeBytes(BACKUPS_DIR)),
    ]);

    return {
      queue: { runningJobs, failedJobsToday },
      openExceptions,
      pendingApprovals,
      api: { requests24h: apiRequests24h, serverErrors24h: apiErrors24h },
      backup: { lastSuccessfulAt: latestBackup?.startedAt ?? null, storageBytes: backupsStorageBytes },
    };
  },

  /**
   * Go-Live / Production Readiness checklist — every item is a genuine
   * computed check against this deployment's own current state, not a
   * static document.
   */
  async readiness() {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const [adminUserCount, latestBackup, passwordPolicySet, webhookSubCount, notificationTemplateCount, openExceptions] = await Promise.all([
      prisma.user.count({ where: { isActive: true, userRoles: { some: { role: { name: { in: ['SUPER_ADMIN', 'ADMIN'] } } } } } }),
      backupRecordRepository.latestSuccessful(),
      prisma.systemSetting.findFirst({ where: { organizationId, category: 'SECURITY', key: 'passwordMinLength' } }),
      prisma.webhookSubscription.count({ where: { organizationId, isActive: true } }),
      prisma.notificationTemplate.count({ where: { isActive: true } }),
      prisma.systemException.count({ where: { status: 'OPEN' } }),
    ]);

    const backupAgeDays = latestBackup ? (Date.now() - latestBackup.startedAt.getTime()) / (1000 * 60 * 60 * 24) : null;

    const checks = [
      { item: 'Database connectivity', passed: true, detail: 'Connected (this request itself is proof)' },
      { item: 'At least one Admin/Super Admin user exists', passed: adminUserCount > 0, detail: `${adminUserCount} admin user(s)` },
      { item: 'Backup taken within the last 7 days', passed: backupAgeDays !== null && backupAgeDays <= 7, detail: backupAgeDays !== null ? `${backupAgeDays.toFixed(1)} days ago` : 'No successful backup yet' },
      { item: 'Password policy configured', passed: !!passwordPolicySet, detail: passwordPolicySet ? `min length ${passwordPolicySet.value}` : 'Using defaults (not explicitly configured)' },
      { item: 'Notification templates seeded', passed: notificationTemplateCount > 0, detail: `${notificationTemplateCount} template(s)` },
      { item: 'No open (untriaged) system exceptions', passed: openExceptions === 0, detail: `${openExceptions} open` },
      { item: 'At least one active webhook subscription (optional)', passed: webhookSubCount > 0, detail: `${webhookSubCount} active subscription(s)` },
    ];

    return { checks, passedCount: checks.filter((c) => c.passed).length, totalCount: checks.length };
  },
};
