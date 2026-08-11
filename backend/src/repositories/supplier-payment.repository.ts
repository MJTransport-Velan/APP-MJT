import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { dateRangeWhere } from '../utils/reportFilters';

const paymentWithRelations = Prisma.validator<Prisma.SupplierPaymentInclude>()({
  supplier: true,
  trip: true,
  paymentMode: true,
  bill: true,
  cheque: { select: { id: true, chequeNumber: true, status: true } },
});

export type SupplierPaymentWithRelations = Prisma.SupplierPaymentGetPayload<{ include: typeof paymentWithRelations }>;

export const supplierPaymentRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    supplierId?: string;
    tripId?: string;
    billId?: string;
    isAdvance?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: Prisma.SupplierPaymentWhereInput = {
      deletedAt: null,
      AND: [
        params.supplierId ? { supplierId: params.supplierId } : {},
        params.tripId ? { tripId: params.tripId } : {},
        params.billId ? { billId: params.billId } : {},
        params.isAdvance !== undefined ? { isAdvance: params.isAdvance } : {},
        dateRangeWhere('paymentDate', { dateFrom: params.dateFrom, dateTo: params.dateTo }),
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.supplierPayment.findMany({ where, include: paymentWithRelations, orderBy: { paymentDate: 'desc' }, skip: params.skip, take: params.take }),
      prisma.supplierPayment.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.supplierPayment.findFirst({ where: { id, deletedAt: null }, include: paymentWithRelations });
  },

  findSupplierById(id: string) {
    return prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  },

  findTripById(id: string) {
    return prisma.trip.findFirst({ where: { id, deletedAt: null } });
  },

  findByReferenceNumber(supplierId: string, referenceNumber: string) {
    return prisma.supplierPayment.findFirst({ where: { supplierId, referenceNumber, deletedAt: null } });
  },

  sumPaymentsForTrip(tripId: string) {
    return prisma.supplierPayment.aggregate({ where: { tripId, deletedAt: null }, _sum: { amount: true } });
  },

  async nextPaymentNumber() {
    const count = await prisma.supplierPayment.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `SPY-${datePart}-${String(count + 1).padStart(4, '0')}`;
  },

  create(data: Prisma.SupplierPaymentUncheckedCreateInput) {
    return prisma.supplierPayment.create({ data, include: paymentWithRelations });
  },

  update(
    id: string,
    data: Partial<{
      amount: number;
      paymentDate: Date;
      paymentModeId: string;
      referenceNumber: string;
      remarks: string;
      updatedById: string;
    }>
  ) {
    return prisma.supplierPayment.update({ where: { id }, data });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.supplierPayment.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },
};
