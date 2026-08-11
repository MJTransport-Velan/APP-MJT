import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const teamWithRelations = Prisma.validator<Prisma.TeamInclude>()({
  department: true,
  _count: { select: { userTeams: true } },
});

const teamWithMembers = Prisma.validator<Prisma.TeamInclude>()({
  department: true,
  userTeams: { include: { user: true } },
});

export type AdminTeamWithRelations = Prisma.TeamGetPayload<{ include: typeof teamWithRelations }>;
export type AdminTeamWithMembers = Prisma.TeamGetPayload<{ include: typeof teamWithMembers }>;

export const adminTeamRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; departmentId?: string }) {
    const where: Prisma.TeamWhereInput = {
      AND: [
        params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {},
        params.departmentId ? { departmentId: params.departmentId } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.team.findMany({
        where,
        include: teamWithRelations,
        orderBy: { name: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.team.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.team.findUnique({ where: { id }, include: teamWithMembers });
  },

  findByName(name: string) {
    return prisma.team.findUnique({ where: { name } });
  },

  findDepartmentById(id: string) {
    return prisma.department.findUnique({ where: { id } });
  },

  create(data: { name: string; departmentId: string; description?: string }) {
    return prisma.team.create({ data });
  },

  update(id: string, data: Partial<{ name: string; departmentId: string; description: string; isActive: boolean }>) {
    return prisma.team.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.team.delete({ where: { id } });
  },

  countMembers(teamId: string) {
    return prisma.userTeam.count({ where: { teamId } });
  },

  setMembers(teamId: string, userIds: string[]) {
    return prisma.$transaction([
      prisma.userTeam.deleteMany({ where: { teamId } }),
      prisma.userTeam.createMany({
        data: userIds.map((userId) => ({ userId, teamId })),
        skipDuplicates: true,
      }),
    ]);
  },
};
