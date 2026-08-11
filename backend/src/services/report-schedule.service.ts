import { reportScheduleRepository } from '../repositories/report-schedule.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { CreateReportScheduleInput, UpdateReportScheduleInput } from '../validators/report-schedule.validator';

/** Foundation only (design brief: "Email Reports (Future)") — nextRunAt is computed for display; nothing executes it yet, that belongs to Phase 8's automation/notification module. */
function computeNextRunAt(frequency: string, from: Date = new Date()): Date {
  const next = new Date(from);
  if (frequency === 'DAILY') next.setUTCDate(next.getUTCDate() + 1);
  else if (frequency === 'WEEKLY') next.setUTCDate(next.getUTCDate() + 7);
  else if (frequency === 'MONTHLY') next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 3);
  return next;
}

export const reportScheduleService = {
  async list(isActive?: boolean, category?: string) {
    return reportScheduleRepository.findMany(isActive, category);
  },

  async getById(id: string) {
    const schedule = await reportScheduleRepository.findById(id);
    if (!schedule) throw new AppError('Report Schedule not found', 404);
    return schedule;
  },

  async create(input: CreateReportScheduleInput, actorId: string) {
    const schedule = await reportScheduleRepository.create({
      name: input.name,
      reportKey: input.reportKey,
      category: input.category,
      frequency: input.frequency,
      format: input.format ?? 'PDF',
      recipientEmails: input.recipientEmails,
      nextRunAt: computeNextRunAt(input.frequency),
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'ReportScheduleDefinition', entityId: schedule.id, description: `Created report schedule "${schedule.name}" (${schedule.frequency})` });
    return schedule;
  },

  async update(id: string, input: UpdateReportScheduleInput, actorId: string) {
    const existing = await reportScheduleRepository.findById(id);
    if (!existing) throw new AppError('Report Schedule not found', 404);

    const updated = await reportScheduleRepository.update(id, {
      ...input,
      nextRunAt: input.frequency ? computeNextRunAt(input.frequency) : undefined,
      updatedById: actorId,
    });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'ReportScheduleDefinition', entityId: id, description: `Updated report schedule "${existing.name}"` });
    return updated;
  },

  async remove(id: string, actorId: string) {
    const existing = await reportScheduleRepository.findById(id);
    if (!existing) throw new AppError('Report Schedule not found', 404);

    await reportScheduleRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'ReportScheduleDefinition', entityId: id, description: `Deleted report schedule "${existing.name}"` });
  },
};
