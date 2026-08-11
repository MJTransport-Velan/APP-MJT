import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const groupWithRelations = Prisma.validator<Prisma.GroupInclude>()({
  _count: { select: { companies: true, members: true } },
});

const groupWithDetail = Prisma.validator<Prisma.GroupInclude>()({
  companies: { orderBy: { name: 'asc' } },
  members: {
    include: { user: { include: { userRoles: { include: { role: true } } } } },
  },
});

export type AdminGroupWithRelations = Prisma.GroupGetPayload<{ include: typeof groupWithRelations }>;
export type AdminGroupWithDetail = Prisma.GroupGetPayload<{ include: typeof groupWithDetail }>;

export const adminGroupRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string }) {
    const where: Prisma.GroupWhereInput = {
      AND: [params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.group.findMany({
        where,
        include: groupWithRelations,
        orderBy: { name: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.group.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.group.findUnique({ where: { id }, include: groupWithDetail });
  },

  findByName(name: string) {
    return prisma.group.findUnique({ where: { name } });
  },

  create(data: { name: string; description?: string }) {
    return prisma.group.create({ data });
  },

  update(id: string, data: Partial<{ name: string; description: string; isActive: boolean }>) {
    return prisma.group.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.group.delete({ where: { id } });
  },

  countCompanies(groupId: string) {
    return prisma.company.count({ where: { groupId, deletedAt: null } });
  },

  countMembers(groupId: string) {
    return prisma.groupMembership.count({ where: { groupId } });
  },

  findUserById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  },

  moveCompaniesToGroup(groupId: string, companyIds: string[]) {
    return prisma.company.updateMany({ where: { id: { in: companyIds } }, data: { groupId } });
  },

  // Per-user upsert (not delete-all/recreate like Team membership) because
  // userId is globally unique across all groups — this correctly implements
  // "move" semantics without disturbing other groups' existing members.
  upsertMembers(groupId: string, userIds: string[]) {
    return prisma.$transaction(
      userIds.map((userId) =>
        prisma.groupMembership.upsert({
          where: { userId },
          update: { groupId },
          create: { groupId, userId },
        })
      )
    );
  },

  removeMember(groupId: string, userId: string) {
    return prisma.groupMembership.deleteMany({ where: { groupId, userId } });
  },
};
