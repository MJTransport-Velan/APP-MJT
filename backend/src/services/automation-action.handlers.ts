import { AutomationRule } from '@prisma/client';
import { notificationService } from './notification.service';
import { backupService } from './backup.service';
import { archiveService } from './archive.service';
import { kpiService } from './kpi.service';
import { systemExceptionService } from './system-exception.service';
import { reportScheduleExecutorService } from './report-schedule-executor.service';
import { arApOutstandingService } from './ar-ap-outstanding.service';
import { AutomationRunTrigger, ArchiveScope } from '@prisma/client';

interface ActionResult {
  summary: string;
}

function parseConfig(actionConfig: string | null): Record<string, unknown> {
  if (!actionConfig) return {};
  try {
    return JSON.parse(actionConfig);
  } catch {
    return {};
  }
}

/**
 * One handler per AutomationActionType — every handler reuses an
 * already-built Phase 8 (or earlier, read-only) service rather than
 * duplicating logic; this file is purely the dispatch table.
 */
export async function executeAutomationAction(rule: AutomationRule, triggeredBy: AutomationRunTrigger, actorId?: string): Promise<ActionResult> {
  const config = parseConfig(rule.actionConfig);

  switch (rule.actionType) {
    case 'SEND_NOTIFICATION': {
      await notificationService.send({
        organizationId: rule.organizationId,
        roleId: (config.roleId as string) ?? null,
        userId: (config.userId as string) ?? null,
        category: 'SYSTEM',
        priority: (config.priority as never) ?? 'NORMAL',
        title: (config.title as string) ?? rule.name,
        message: (config.message as string) ?? `Automation rule "${rule.name}" fired`,
      });
      return { summary: 'Notification sent' };
    }

    case 'RUN_REPORT_SCHEDULE': {
      const reportScheduleId = config.reportScheduleId as string;
      if (!reportScheduleId) throw new Error('actionConfig.reportScheduleId is required');
      const result = await reportScheduleExecutorService.execute(reportScheduleId, actorId);
      return { summary: `Generated ${result.rowCount} rows` };
    }

    case 'RUN_BACKUP': {
      const result = await backupService.runBackup(triggeredBy === 'MANUAL' ? 'MANUAL' : 'SCHEDULED', actorId);
      if (result.status !== 'SUCCESS') throw new Error(result.errorMessage ?? 'Backup failed');
      return { summary: `Backup completed (${result.sizeBytes ?? 0} bytes)` };
    }

    case 'ARCHIVE_LOGS': {
      const scope = (config.scope as ArchiveScope) ?? 'AUDIT_LOG';
      const cutoffDays = (config.cutoffDays as number) ?? 365;
      const result = await archiveService.archiveLogs(scope, cutoffDays, actorId);
      if (result.status !== 'SUCCESS') throw new Error(result.errorMessage ?? 'Archive failed');
      return { summary: `Archived ${result.recordsArchived} ${scope} rows` };
    }

    case 'OUTSTANDING_REMINDER': {
      const aging = await arApOutstandingService.customerAging();
      const overdue = aging.filter((a) => a.total - a.buckets.CURRENT > 0);
      if (overdue.length > 0) {
        await notificationService.send({
          organizationId: rule.organizationId,
          roleId: (config.roleId as string) ?? null,
          category: 'REMINDER',
          priority: 'HIGH',
          title: 'Outstanding receivables reminder',
          message: `${overdue.length} customers have overdue receivables totalling ₹${overdue.reduce((s, a) => s + (a.total - a.buckets.CURRENT), 0).toFixed(2)}`,
        });
      }
      return { summary: `${overdue.length} customers with overdue receivables` };
    }

    case 'COMPUTE_KPI_SNAPSHOTS': {
      const result = await kpiService.computeSnapshots(actorId);
      return { summary: `${result.computed} KPI snapshots computed` };
    }

    default:
      throw new Error(`Unhandled action type: ${rule.actionType}`);
  }
}
