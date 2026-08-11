import { Prisma, VehicleOwnership } from '@prisma/client';
import { prisma } from '../config/db';

const vehicleWithRelations = Prisma.validator<Prisma.VehicleInclude>()({
  vehicleType: true,
  supplier: true,
});

export type VehicleWithRelations = Prisma.VehicleGetPayload<{ include: typeof vehicleWithRelations }>;

export const vehicleRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    vehicleTypeId?: string;
    supplierId?: string;
    ownership?: VehicleOwnership;
    isActive?: boolean;
  }) {
    const where: Prisma.VehicleWhereInput = {
      deletedAt: null,
      AND: [
        params.search
          ? {
              OR: [
                { registrationNumber: { contains: params.search, mode: 'insensitive' } },
                { manufacturer: { contains: params.search, mode: 'insensitive' } },
                { model: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.vehicleTypeId ? { vehicleTypeId: params.vehicleTypeId } : {},
        params.supplierId ? { supplierId: params.supplierId } : {},
        params.ownership ? { ownership: params.ownership } : {},
        params.isActive !== undefined ? { isActive: params.isActive } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.vehicle.findMany({
        where,
        include: vehicleWithRelations,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.vehicle.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null }, include: vehicleWithRelations });
  },

  findByRegistrationNumber(registrationNumber: string) {
    return prisma.vehicle.findFirst({ where: { registrationNumber, deletedAt: null } });
  },

  findVehicleTypeById(id: string) {
    return prisma.vehicleType.findFirst({ where: { id, deletedAt: null } });
  },

  findSupplierById(id: string) {
    return prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: {
    registrationNumber: string;
    vehicleTypeId: string;
    ownership?: VehicleOwnership;
    supplierId?: string;
    manufacturer?: string;
    model?: string;
    capacityTon?: number;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.vehicle.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      vehicleTypeId: string;
      ownership: VehicleOwnership;
      supplierId: string | null;
      manufacturer: string;
      model: string;
      capacityTon: number;
      isActive: boolean;
      updatedById: string;
    }>
  ) {
    return prisma.vehicle.update({ where: { id }, data });
  },

  setDocuments(
    id: string,
    data: Partial<{ rcDocument: string; insuranceDocument: string; permitDocument: string }>,
    updatedById: string
  ) {
    return prisma.vehicle.update({ where: { id }, data: { ...data, updatedById } });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  toggleStatus(id: string, isActive: boolean, updatedById: string) {
    return prisma.vehicle.update({ where: { id }, data: { isActive, updatedById } });
  },
};
