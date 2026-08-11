import { Prisma, VehicleExpenseCategory, ApprovalStatus } from '@prisma/client';
import { prisma } from '../config/db';

const expenseWithRelations = Prisma.validator<Prisma.VehicleExpenseInclude>()({
  vehicle: true,
  paymentMode: true,
  trip: { select: { id: true, tripNumber: true } },
  supplier: { select: { id: true, name: true } },
  gstMaster: { select: { id: true, name: true, ratePercent: true } },
});

export type VehicleExpenseWithRelations = Prisma.VehicleExpenseGetPayload<{ include: typeof expenseWithRelations }>;

export const vehicleExpenseRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    vehicleId?: string;
    category?: VehicleExpenseCategory;
    approvalStatus?: ApprovalStatus;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.VehicleExpenseWhereInput = {
      deletedAt: null,
      AND: [
        params.vehicleId ? { vehicleId: params.vehicleId } : {},
        params.category ? { category: params.category } : {},
        params.approvalStatus ? { approvalStatus: params.approvalStatus } : {},
        params.from || params.to
          ? {
              expenseDate: {
                ...(params.from ? { gte: params.from } : {}),
                ...(params.to ? { lte: params.to } : {}),
              },
            }
          : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.vehicleExpense.findMany({
        where,
        include: expenseWithRelations,
        orderBy: { expenseDate: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.vehicleExpense.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.vehicleExpense.findFirst({ where: { id, deletedAt: null }, include: expenseWithRelations });
  },

  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  },

  findByReference(referenceType: string, referenceId: string) {
    return prisma.vehicleExpense.findFirst({ where: { referenceType, referenceId, deletedAt: null } });
  },

  create(data: Prisma.VehicleExpenseUncheckedCreateInput) {
    return prisma.vehicleExpense.create({ data, include: expenseWithRelations });
  },

  update(id: string, data: Prisma.VehicleExpenseUncheckedUpdateInput) {
    return prisma.vehicleExpense.update({ where: { id }, data, include: expenseWithRelations });
  },

  setBillDocument(id: string, billDocument: string, updatedById: string) {
    return prisma.vehicleExpense.update({ where: { id }, data: { billDocument, updatedById } });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.vehicleExpense.update({ where: { id }, data: { deletedAt: new Date(), updatedById } });
  },
};
