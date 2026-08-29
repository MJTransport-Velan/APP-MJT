import { Prisma, AdBlueStockTransactionType } from '@prisma/client';
import { prisma } from '../config/db';

const transactionWithRelations = Prisma.validator<Prisma.AdBlueStockTransactionInclude>()({
  vehicle: { select: { id: true, registrationNumber: true } },
  supplier: { select: { id: true, name: true } },
  adBlueEntry: { select: { id: true, entryDate: true, quantityLiters: true, location: true } },
});

export type AdBlueStockRow = Prisma.AdBlueStockGetPayload<object>;
export type AdBlueStockTransactionWithRelations = Prisma.AdBlueStockTransactionGetPayload<{
  include: typeof transactionWithRelations;
}>;

export const adBlueStockRepository = {
  /** There is exactly one live AdBlue store for the whole fleet — lazily created on first use. */
  async getOrCreateStock(actorId: string): Promise<AdBlueStockRow> {
    const existing = await prisma.adBlueStock.findFirst({ where: { deletedAt: null } });
    if (existing) return existing;
    return prisma.adBlueStock.create({ data: { createdById: actorId, updatedById: actorId } });
  },

  findStock() {
    return prisma.adBlueStock.findFirst({ where: { deletedAt: null } });
  },

  /**
   * Litres and value move together — a withdrawal that took the litres out
   * without taking their cost out would leave the average rate drifting
   * upwards forever.
   */
  adjustStock(id: string, quantityDelta: Prisma.Decimal.Value, valueDelta: Prisma.Decimal.Value) {
    return prisma.adBlueStock.update({
      where: { id },
      data: {
        currentQuantityLiters: { increment: quantityDelta },
        currentValue: { increment: valueDelta },
      },
    });
  },

  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  },

  findSupplierById(id: string) {
    return prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  },

  createTransaction(data: Prisma.AdBlueStockTransactionUncheckedCreateInput) {
    return prisma.adBlueStockTransaction.create({ data, include: transactionWithRelations });
  },

  findTransactionById(id: string) {
    return prisma.adBlueStockTransaction.findUnique({ where: { id }, include: transactionWithRelations });
  },

  /** The withdrawal a FROM_STOCK top-up owns, if it has one. */
  findTransactionByEntryId(adBlueEntryId: string) {
    return prisma.adBlueStockTransaction.findUnique({ where: { adBlueEntryId } });
  },

  updateTransaction(id: string, data: Prisma.AdBlueStockTransactionUncheckedUpdateInput) {
    return prisma.adBlueStockTransaction.update({ where: { id }, data, include: transactionWithRelations });
  },

  deleteTransaction(id: string) {
    return prisma.adBlueStockTransaction.delete({ where: { id } });
  },

  findTransactionsPaginated(params: {
    skip: number;
    take: number;
    vehicleId?: string;
    supplierId?: string;
    type?: AdBlueStockTransactionType;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.AdBlueStockTransactionWhereInput = {
      AND: [
        params.vehicleId ? { vehicleId: params.vehicleId } : {},
        params.supplierId ? { supplierId: params.supplierId } : {},
        params.type ? { type: params.type } : {},
        params.from || params.to
          ? { transactionDate: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } }
          : {},
      ],
    };
    return prisma
      .$transaction([
        prisma.adBlueStockTransaction.findMany({
          where,
          include: transactionWithRelations,
          orderBy: { transactionDate: 'desc' },
          skip: params.skip,
          take: params.take,
        }),
        prisma.adBlueStockTransaction.count({ where }),
      ])
      .then(([rows, total]) => ({ rows, total }));
  },

  stockTotals(stockId: string) {
    return prisma.adBlueStockTransaction.groupBy({
      by: ['type'],
      where: { stockId },
      _sum: { quantityLiters: true, amount: true },
    });
  },

  /**
   * Truck-wise consumption out of the store. The stock is shared, so this
   * is how many litres each truck has drawn — never a per-truck balance.
   */
  issuesByVehicle(stockId: string) {
    return prisma.adBlueStockTransaction.groupBy({
      by: ['vehicleId'],
      where: { stockId, type: 'ISSUE' },
      _sum: { quantityLiters: true, amount: true },
      _count: { _all: true },
    });
  },

  findVehiclesByIds(ids: string[]) {
    return prisma.vehicle.findMany({ where: { id: { in: ids } }, select: { id: true, registrationNumber: true } });
  },
};
