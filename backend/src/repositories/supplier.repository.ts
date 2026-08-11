import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const supplierRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; isActive?: boolean }) {
    const where: Prisma.SupplierWhereInput = {
      deletedAt: null,
      AND: [
        params.search
          ? {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { code: { contains: params.search, mode: 'insensitive' } },
                { gstNumber: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.isActive !== undefined ? { isActive: params.isActive } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.supplier.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.supplier.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  },

  findByCode(code: string) {
    return prisma.supplier.findFirst({ where: { code, deletedAt: null } });
  },

  create(data: {
    name: string;
    code: string;
    gstNumber?: string;
    panNumber?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.supplier.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      gstNumber: string;
      panNumber: string;
      contactPerson: string;
      phone: string;
      email: string;
      address: string;
      isActive: boolean;
      updatedById: string;
    }>
  ) {
    return prisma.supplier.update({ where: { id }, data });
  },

  setDocument(id: string, document: string, updatedById: string) {
    return prisma.supplier.update({ where: { id }, data: { document, updatedById } });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.supplier.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  toggleStatus(id: string, isActive: boolean, updatedById: string) {
    return prisma.supplier.update({ where: { id }, data: { isActive, updatedById } });
  },

  countVehicles(supplierId: string) {
    return prisma.vehicle.count({ where: { supplierId, deletedAt: null } });
  },
};
