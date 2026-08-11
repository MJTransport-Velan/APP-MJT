import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { getReportDefinition } from '../reports/report.registry';
import { ReportCategory } from '../reports/report.types';
import { writeReportFile } from '../utils/reportExportFile';
import { notificationService } from './notification.service';
import { organizationService } from './organization.service';
import { logger } from '../config/logger';

function computeNextRunAt(frequency: string, from: Date = new Date()): Date {
  const next = new Date(from);
  if (frequency === 'DAILY') next.setUTCDate(next.getUTCDate() + 1);
  else if (frequency === 'WEEKLY') next.setUTCDate(next.getUTCDate() + 7);
  else if (frequency === 'MONTHLY') next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 3);
  return next;
}

/**
 * The executor Phase 13 (docs Phase 7) explicitly left unbuilt ("no cron/
 * executor/email-sender exists yet, that belongs to Phase 8"). Runs
 * against the pre-existing legacy reportRegistry (Trip/Invoice/
 * SupplierPayment-sourced reports) — the one uniform, generically callable
 * report interface in this codebase. Email delivery stays architecture-
 * only: a Notification is raised instead of an actual SMTP send.
 */
export const reportScheduleExecutorService = {
  async execute(scheduleId: string, actorId?: string) {
    const schedule = await prisma.reportScheduleDefinition.findFirst({ where: { id: scheduleId, deletedAt: null } });
    if (!schedule) throw new AppError('Report schedule not found', 404);

    const definition = getReportDefinition(schedule.category as ReportCategory, schedule.reportKey);
    if (!definition) {
      throw new AppError(`No report registered for category "${schedule.category}" / key "${schedule.reportKey}"`, 422);
    }

    try {
      const { rows } = await definition.run({}, 0, 5000);
      const filePath = await writeReportFile(schedule.format, definition.label, definition.columns, rows);

      const organizationId = await organizationService.resolveOrganizationId(undefined);
      await notificationService.send({
        organizationId,
        userId: actorId,
        category: 'REPORT',
        priority: 'NORMAL',
        title: `Report ready: ${definition.label}`,
        message: `"${schedule.name}" generated ${rows.length} rows.${schedule.recipientEmails ? ` (would email: ${schedule.recipientEmails})` : ''}`,
        channel: schedule.recipientEmails ? 'EMAIL' : 'IN_APP',
      });

      const updated = await prisma.reportScheduleDefinition.update({
        where: { id: scheduleId },
        data: { lastRunAt: new Date(), nextRunAt: computeNextRunAt(schedule.frequency) },
      });
      return { schedule: updated, filePath, rowCount: rows.length };
    } catch (err) {
      logger.error(`Report schedule ${scheduleId} execution failed`, err);
      throw err;
    }
  },
};
