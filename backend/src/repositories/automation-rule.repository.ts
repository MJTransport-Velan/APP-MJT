import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const automationRuleRepository = {
  findAll(organizationId: string) {
    return prisma.automationRule.findMany({ where: { organizationId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  },

  findAllActiveScheduled() {
    return prisma.automationRule.findMany({ where: { deletedAt: null, isActive: true, triggerType: 'SCHEDULE', cronExpression: { not: null } } });
  },

  findAllActiveForEvent(organizationId: string, eventCode: string) {
    return prisma.automationRule.findMany({ where: { organizationId, deletedAt: null, isActive: true, triggerType: 'EVENT', eventCode } });
  },

  findById(id: string) {
    return prisma.automationRule.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: Prisma.AutomationRuleUncheckedCreateInput) {
    return prisma.automationRule.create({ data });
  },

  update(id: string, data: Prisma.AutomationRuleUncheckedUpdateInput) {
    return prisma.automationRule.update({ where: { id }, data });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.automationRule.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  createRunLog(data: Prisma.AutomationRunLogUncheckedCreateInput) {
    return prisma.automationRunLog.create({ data });
  },

  updateRunLog(id: string, data: Prisma.AutomationRunLogUncheckedUpdateInput) {
    return prisma.automationRunLog.update({ where: { id }, data });
  },

  async findRunLogsPaginated(automationRuleId: string, skip: number, take: number) {
    const where = { automationRuleId };
    const [rows, total] = await prisma.$transaction([
      prisma.automationRunLog.findMany({ where, orderBy: { startedAt: 'desc' }, skip, take }),
      prisma.automationRunLog.count({ where }),
    ]);
    return { rows, total };
  },
};
