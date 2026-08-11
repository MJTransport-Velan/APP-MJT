import { Prisma, SparePartUsageType } from '@prisma/client';
import { prisma } from '../config/db';

const usageWithRelations = Prisma.validator<Prisma.SparePartUsageInclude>()({
  vehicle: true,
  sparePart: true,
  maintenanceRecord: true,
});

export type SparePartUsageWithRelations = Prisma.SparePartUsageGetPayload<{ include: typeof usageWithRelations }>;

export const sparePartUsageRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    vehicleId?: string;
    sparePartId?: string;
    type?: SparePartUsageType;
  }) {
    const where: Prisma.SparePartUsageWhereInput = {
      AND: [
        params.vehicleId ? { vehicleId: params.vehicleId } : {},
        params.sparePartId ? { sparePartId: params.sparePartId } : {},
        params.type ? { type: params.type } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.sparePartUsage.findMany({
        where,
        include: usageWithRelations,
        orderBy: { usageDate: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.sparePartUsage.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.sparePartUsage.findUnique({ where: { id }, include: usageWithRelations });
  },

  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  },

  findSparePartById(id: string) {
    return prisma.sparePart.findFirst({ where: { id, deletedAt: null } });
  },

  /**
   * Creates the usage row and adjusts SparePart.stockQuantity atomically —
   * ISSUE decrements, RETURN increments. Throws if an ISSUE would take
   * stock negative.
   */
  async createWithStockMovement(data: {
    vehicleId: string;
    sparePartId: string;
    maintenanceRecordId?: string;
    type: SparePartUsageType;
    quantity: number;
    usageDate: Date;
    notes?: string;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const sparePart = await tx.sparePart.findUnique({ where: { id: data.sparePartId } });
      if (!sparePart) {
        throw new Error('SPARE_PART_NOT_FOUND');
      }

      if (data.type === 'ISSUE' && sparePart.stockQuantity < data.quantity) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      const stockDelta = data.type === 'ISSUE' ? -data.quantity : data.quantity;
      await tx.sparePart.update({
        where: { id: data.sparePartId },
        data: { stockQuantity: { increment: stockDelta } },
      });

      return tx.sparePartUsage.create({ data });
    });
  },
};
