import { Prisma, SystemSettingCategory } from '@prisma/client';
import { prisma } from '../config/db';

export const systemSettingRepository = {
  findAll(organizationId: string, category?: SystemSettingCategory) {
    return prisma.systemSetting.findMany({
      where: { organizationId, ...(category ? { category } : {}) },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  },

  findOne(organizationId: string, category: SystemSettingCategory, key: string) {
    return prisma.systemSetting.findUnique({ where: { organizationId_category_key: { organizationId, category, key } } });
  },

  upsert(organizationId: string, category: SystemSettingCategory, key: string, value: string, description: string | undefined, updatedById: string) {
    return prisma.systemSetting.upsert({
      where: { organizationId_category_key: { organizationId, category, key } },
      create: { organizationId, category, key, value, description, updatedById },
      update: { value, description, updatedById },
    });
  },

  createManyIfMissing(rows: Prisma.SystemSettingCreateManyInput[]) {
    return prisma.systemSetting.createMany({ data: rows, skipDuplicates: true });
  },
};
