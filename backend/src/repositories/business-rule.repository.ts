import { BusinessRuleType, Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const businessRuleRepository = {
  findAll(organizationId: string, ruleType?: BusinessRuleType) {
    return prisma.businessRule.findMany({
      where: { organizationId, deletedAt: null, ...(ruleType ? { ruleType } : {}) },
      orderBy: [{ ruleType: 'asc' }, { priority: 'asc' }],
    });
  },

  findActiveByType(organizationId: string, ruleType: BusinessRuleType) {
    return prisma.businessRule.findMany({ where: { organizationId, ruleType, isActive: true, deletedAt: null }, orderBy: { priority: 'asc' } });
  },

  findById(id: string) {
    return prisma.businessRule.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: Prisma.BusinessRuleUncheckedCreateInput) {
    return prisma.businessRule.create({ data });
  },

  update(id: string, data: Prisma.BusinessRuleUncheckedUpdateInput) {
    return prisma.businessRule.update({ where: { id }, data });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.businessRule.update({ where: { id }, data: { deletedAt: new Date(), updatedById } });
  },
};
