import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const companyWithGroup = Prisma.validator<Prisma.CompanyInclude>()({
  group: true,
});

export type AdminCompanyWithGroup = Prisma.CompanyGetPayload<{ include: typeof companyWithGroup }>;

export const adminCompanyRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
    groupId?: string;
    companyIds?: string[];
  }) {
    const where: Prisma.CompanyWhereInput = {
      deletedAt: null,
      AND: [
        params.search
          ? {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { code: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.isActive !== undefined ? { isActive: params.isActive } : {},
        params.groupId ? { groupId: params.groupId } : {},
        params.companyIds ? { id: { in: params.companyIds } } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.company.findMany({
        where,
        include: companyWithGroup,
        orderBy: { name: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.company.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.company.findFirst({ where: { id, deletedAt: null }, include: companyWithGroup });
  },

  findByCode(code: string) {
    return prisma.company.findFirst({ where: { code, deletedAt: null } });
  },

  findGroupById(id: string) {
    return prisma.group.findUnique({ where: { id } });
  },

  create(data: {
    name: string;
    code: string;
    groupId: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstNumber?: string;
    panNumber?: string;
    createdById?: string;
    updatedById?: string;
  }) {
    return prisma.company.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      groupId: string;
      contactPerson: string;
      phone: string;
      email: string;
      address: string;
      gstNumber: string;
      panNumber: string;
      isActive: boolean;
      updatedById: string;
    }>
  ) {
    return prisma.company.update({ where: { id }, data });
  },

  setLogo(id: string, logo: string, updatedById: string) {
    return prisma.company.update({ where: { id }, data: { logo, updatedById } });
  },

  toggleStatus(id: string, isActive: boolean, updatedById: string) {
    return prisma.company.update({ where: { id }, data: { isActive, updatedById } });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.company.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  delete(id: string) {
    return prisma.company.delete({ where: { id } });
  },

  findUserById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  },
};
