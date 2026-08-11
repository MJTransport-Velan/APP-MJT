import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const reportScheduleRepository = {
  findMany(isActive?: boolean, category?: string) {
    return prisma.reportScheduleDefinition.findMany({
      where: { deletedAt: null, ...(isActive !== undefined ? { isActive } : {}), ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  },

  findById(id: string) {
    return prisma.reportScheduleDefinition.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: Prisma.ReportScheduleDefinitionUncheckedCreateInput) {
    return prisma.reportScheduleDefinition.create({ data });
  },

  update(id: string, data: Prisma.ReportScheduleDefinitionUncheckedUpdateInput) {
    return prisma.reportScheduleDefinition.update({ where: { id }, data });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.reportScheduleDefinition.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },
};
