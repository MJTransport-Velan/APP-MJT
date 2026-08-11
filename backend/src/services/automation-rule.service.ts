import { automationRuleRepository } from '../repositories/automation-rule.repository';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { schedulerService } from './scheduler.service';
import { CreateAutomationRuleInput, UpdateAutomationRuleInput } from '../validators/automation-rule.validator';

export const automationRuleService = {
  async list() {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    return automationRuleRepository.findAll(organizationId);
  },

  async create(input: CreateAutomationRuleInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    if (input.triggerType === 'SCHEDULE' && !input.cronExpression) {
      throw new AppError('cronExpression is required for a SCHEDULE-triggered rule', 422);
    }
    if (input.triggerType === 'EVENT' && !input.eventCode) {
      throw new AppError('eventCode is required for an EVENT-triggered rule', 422);
    }

    const rule = await automationRuleRepository.create({
      organizationId,
      name: input.name,
      description: input.description,
      triggerType: input.triggerType,
      cronExpression: input.cronExpression,
      eventCode: input.eventCode,
      actionType: input.actionType,
      actionConfig: input.actionConfig,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'AutomationRule', entityId: rule.id, description: `Created automation rule "${rule.name}"` });
    await schedulerService.reload();
    return rule;
  },

  async update(id: string, input: UpdateAutomationRuleInput, actorId: string) {
    const existing = await automationRuleRepository.findById(id);
    if (!existing) throw new AppError('Automation rule not found', 404);

    const updated = await automationRuleRepository.update(id, { ...input, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'AutomationRule', entityId: id, description: `Updated automation rule "${existing.name}"` });
    await schedulerService.reload();
    return updated;
  },

  async remove(id: string, actorId: string) {
    const existing = await automationRuleRepository.findById(id);
    if (!existing) throw new AppError('Automation rule not found', 404);

    await automationRuleRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'AutomationRule', entityId: id, description: `Deleted automation rule "${existing.name}"` });
    await schedulerService.reload();
  },

  async runNow(id: string, actorId: string) {
    return schedulerService.runManual(id, actorId);
  },

  async runLogs(id: string, query: { page?: string; pageSize?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Number(query.pageSize) || 20);
    const { rows, total } = await automationRuleRepository.findRunLogsPaginated(id, (page - 1) * pageSize, pageSize);
    return { data: rows, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  },
};
