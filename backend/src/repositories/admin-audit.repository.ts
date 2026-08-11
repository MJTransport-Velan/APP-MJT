import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const auditLogWithUser = Prisma.validator<Prisma.AuditLogInclude>()({
  user: true,
});

export type AdminAuditLogWithUser = Prisma.AuditLogGetPayload<{ include: typeof auditLogWithUser }>;

export const adminAuditRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    action?: string;
    entityType?: string;
    userId?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.AuditLogWhereInput = {
      AND: [
        params.search
          ? {
              OR: [
                { description: { contains: params.search, mode: 'insensitive' } },
                { entityType: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.action ? { action: params.action } : {},
        params.entityType ? { entityType: params.entityType } : {},
        params.userId ? { userId: params.userId } : {},
        params.from || params.to
          ? {
              createdAt: {
                ...(params.from ? { gte: params.from } : {}),
                ...(params.to ? { lte: params.to } : {}),
              },
            }
          : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: auditLogWithUser,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { rows, total };
  },
};
