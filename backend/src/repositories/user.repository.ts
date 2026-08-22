import { prisma } from '../config/db';

export const userRepository = {
  findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });
  },

  findAll() {
    return prisma.user.findMany({
      include: {
        userRoles: { include: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  create(data: { username: string; email?: string; fullName: string; password: string }) {
    return prisma.user.create({ data });
  },

  update(id: string, data: Partial<{ email: string; fullName: string; isActive: boolean }>) {
    return prisma.user.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.user.delete({ where: { id } });
  },

  setRefreshToken(id: string, refreshToken: string | null) {
    return prisma.user.update({ where: { id }, data: { refreshToken } });
  },

  /**
   * Invalidates every access token already issued to this user, by moving
   * the version their tokens were signed against. Call this from anywhere
   * that must end a session immediately: logout, deactivate, delete,
   * password change, and role/team reassignment.
   */
  bumpTokenVersion(id: string) {
    return prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
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
};
