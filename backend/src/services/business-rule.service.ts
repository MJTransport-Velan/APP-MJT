import { BusinessRuleType } from '@prisma/client';
import { businessRuleRepository } from '../repositories/business-rule.repository';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { CreateBusinessRuleInput, UpdateBusinessRuleInput } from '../validators/business-rule.validator';

export const businessRuleService = {
  async list(ruleType?: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    return businessRuleRepository.findAll(organizationId, ruleType as BusinessRuleType | undefined);
  },

  async create(input: CreateBusinessRuleInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const rule = await businessRuleRepository.create({
      organizationId,
      ruleType: input.ruleType,
      name: input.name,
      description: input.description,
      conditionJson: input.conditionJson,
      actionJson: input.actionJson,
      priority: input.priority ?? 1,
      createdById: actorId,
      updatedById: actorId,
    });
    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'BusinessRule', entityId: rule.id, description: `Created business rule ${rule.name}` });
    return rule;
  },

  async update(id: string, input: UpdateBusinessRuleInput, actorId: string) {
    const existing = await businessRuleRepository.findById(id);
    if (!existing) throw new AppError('Business Rule not found', 404);
    const updated = await businessRuleRepository.update(id, { ...input, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'BusinessRule', entityId: id, description: `Updated business rule ${existing.name}` });
    return updated;
  },

  async remove(id: string, actorId: string) {
    const existing = await businessRuleRepository.findById(id);
    if (!existing) throw new AppError('Business Rule not found', 404);
    await businessRuleRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'BusinessRule', entityId: id, description: `Deleted business rule ${existing.name}` });
  },
};
