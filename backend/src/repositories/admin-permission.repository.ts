import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const adminPermissionRepository = {
  findMany(where: Prisma.PermissionWhereInput) {
    return prisma.permission.findMany({ where, orderBy: { name: 'asc' } });
  },
};
