import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const roleWithRelations = Prisma.validator<Prisma.RoleInclude>()({
  rolePermissions: { include: { permission: true } },
  _count: { select: { userRoles: true } },
});

export type AdminRoleWithRelations = Prisma.RoleGetPayload<{ include: typeof roleWithRelations }>;

export const adminRoleRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string }) {
    const where: Prisma.RoleWhereInput = params.search
      ? { name: { contains: params.search, mode: 'insensitive' } }
      : {};

    const [rows, total] = await prisma.$transaction([
      prisma.role.findMany({
        where,
        include: roleWithRelations,
        orderBy: { name: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.role.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.role.findUnique({ where: { id }, include: roleWithRelations });
  },

  findByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  },

  create(data: { name: string; description?: string }) {
    return prisma.role.create({ data });
  },

  update(id: string, data: Partial<{ name: string; description: string }>) {
    return prisma.role.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.role.delete({ where: { id } });
  },

  countUsers(roleId: string) {
    return prisma.userRole.count({ where: { roleId } });
  },

  setPermissions(roleId: string, permissionIds: string[]) {
    return prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      }),
    ]);
  },
};
