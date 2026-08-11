import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const departmentWithCounts = Prisma.validator<Prisma.DepartmentInclude>()({
  _count: { select: { teams: true } },
});

export type AdminDepartmentWithCounts = Prisma.DepartmentGetPayload<{ include: typeof departmentWithCounts }>;

export const adminDepartmentRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string }) {
    const where: Prisma.DepartmentWhereInput = params.search
      ? { name: { contains: params.search, mode: 'insensitive' } }
      : {};

    const [rows, total] = await prisma.$transaction([
      prisma.department.findMany({
        where,
        include: departmentWithCounts,
        orderBy: { name: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.department.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.department.findUnique({ where: { id }, include: departmentWithCounts });
  },

  findByName(name: string) {
    return prisma.department.findUnique({ where: { name } });
  },

  create(data: { name: string; description?: string }) {
    return prisma.department.create({ data });
  },

  update(id: string, data: Partial<{ name: string; description: string; isActive: boolean }>) {
    return prisma.department.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.department.delete({ where: { id } });
  },

  countTeams(departmentId: string) {
    return prisma.team.count({ where: { departmentId } });
  },
};
