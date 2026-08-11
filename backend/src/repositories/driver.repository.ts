import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const driverRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; isActive?: boolean }) {
    const where: Prisma.DriverWhereInput = {
      deletedAt: null,
      AND: [
        params.search
          ? {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { code: { contains: params.search, mode: 'insensitive' } },
                { licenseNumber: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.isActive !== undefined ? { isActive: params.isActive } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.driver.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.driver.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.driver.findFirst({ where: { id, deletedAt: null } });
  },

  findByCode(code: string) {
    return prisma.driver.findFirst({ where: { code, deletedAt: null } });
  },

  findByLicenseNumber(licenseNumber: string) {
    return prisma.driver.findFirst({ where: { licenseNumber, deletedAt: null } });
  },

  create(data: {
    name: string;
    code: string;
    licenseNumber: string;
    phone?: string;
    licenseExpiryDate?: Date;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.driver.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      licenseNumber: string;
      phone: string;
      licenseExpiryDate: Date;
      isActive: boolean;
      updatedById: string;
    }>
  ) {
    return prisma.driver.update({ where: { id }, data });
  },

  setLicenseDocument(id: string, licenseDocument: string, updatedById: string) {
    return prisma.driver.update({ where: { id }, data: { licenseDocument, updatedById } });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.driver.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  toggleStatus(id: string, isActive: boolean, updatedById: string) {
    return prisma.driver.update({ where: { id }, data: { isActive, updatedById } });
  },
};
