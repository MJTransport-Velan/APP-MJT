import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const userWithRelations = Prisma.validator<Prisma.UserInclude>()({
  userRoles: { include: { role: true } },
  userTeams: { include: { team: { include: { department: true } } } },
});

export type AdminUserWithRelations = Prisma.UserGetPayload<{ include: typeof userWithRelations }>;

export const adminUserRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
    roleId?: string;
    teamId?: string;
  }) {
    const where: Prisma.UserWhereInput = {
      AND: [
        params.search
          ? {
              OR: [
                { username: { contains: params.search, mode: 'insensitive' } },
                { fullName: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.isActive !== undefined ? { isActive: params.isActive } : {},
        params.roleId ? { userRoles: { some: { roleId: params.roleId } } } : {},
        params.teamId ? { userTeams: { some: { teamId: params.teamId } } } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        include: userWithRelations,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.user.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: userWithRelations });
  },

  findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  create(data: { username: string; email?: string; phone?: string; fullName: string; password: string }) {
    return prisma.user.create({ data });
  },

  update(id: string, data: Partial<{ email: string; phone: string; fullName: string }>) {
    return prisma.user.update({ where: { id }, data });
  },

  setActive(id: string, isActive: boolean) {
    return prisma.user.update({ where: { id }, data: { isActive } });
  },

  setPassword(id: string, password: string) {
    return prisma.user.update({ where: { id }, data: { password, refreshToken: null } });
  },

  setProfilePhoto(id: string, profilePhoto: string) {
    return prisma.user.update({ where: { id }, data: { profilePhoto } });
  },

  setRoles(userId: string, roleIds: string[]) {
    return prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId } }),
      prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
        skipDuplicates: true,
      }),
    ]);
  },

  setTeams(userId: string, teamIds: string[]) {
    return prisma.$transaction([
      prisma.userTeam.deleteMany({ where: { userId } }),
      prisma.userTeam.createMany({
        data: teamIds.map((teamId) => ({ userId, teamId })),
        skipDuplicates: true,
      }),
    ]);
  },
};
