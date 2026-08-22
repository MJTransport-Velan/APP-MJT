import { Prisma, SupplierBillStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { dateRangeWhere } from '../utils/reportFilters';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';

const billWithRelations = Prisma.validator<Prisma.SupplierBillInclude>()({
  supplier: true,
  trip: true,
  creditNotes: true,
  debitNotes: true,
  payments: { where: { deletedAt: null }, orderBy: { paymentDate: 'desc' } },
});

export type SupplierBillWithRelations = Prisma.SupplierBillGetPayload<{ include: typeof billWithRelations }>;

export const supplierBillRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    supplierId?: string;
    status?: SupplierBillStatus;
    unpaidOnly?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: Prisma.SupplierBillWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { billNumber: { contains: params.search, mode: 'insensitive' } } : {},
        params.supplierId ? { supplierId: params.supplierId } : {},
        params.status ? { status: params.status } : params.unpaidOnly ? { status: { in: ['GENERATED', 'PARTIALLY_PAID'] } } : {},
        dateRangeWhere('billDate', { dateFrom: params.dateFrom, dateTo: params.dateTo }),
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.supplierBill.findMany({ where, include: billWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.supplierBill.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.supplierBill.findFirst({ where: { id, deletedAt: null }, include: billWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.supplierBill.findFirst({ where: { id, deletedAt: null } });
  },

  findSupplierById(id: string) {
    return prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  },

  findTripById(id: string) {
    return prisma.trip.findFirst({ where: { id, deletedAt: null } });
  },

  /** An existing, non-cancelled bill for this trip — the guard against billing one trip twice. */
  findLiveBillForTrip(tripId: string) {
    return prisma.supplierBill.findFirst({
      where: { tripId, deletedAt: null, status: { not: 'CANCELLED' } },
      select: { id: true, billNumber: true },
    });
  },

  async nextBillNumber() {
    return nextDocumentNumber('SBL', 4, async (stamp) => {
      const rows = await prisma.supplierBill.findMany({
        where: { billNumber: { startsWith: `SBL-${stamp}-` } },
        select: { billNumber: true },
      });
      return highestSequenceToday(rows, 'billNumber', 'SBL', stamp);
    });
  },

  create(data: Prisma.SupplierBillUncheckedCreateInput) {
    return prisma.supplierBill.create({ data, include: billWithRelations });
  },

  update(id: string, data: Prisma.SupplierBillUncheckedUpdateInput) {
    return prisma.supplierBill.update({ where: { id }, data, include: billWithRelations });
  },

  recalculateOutstanding(id: string, data: { paidAmount: number; outstandingAmount: number; status: SupplierBillStatus }) {
    return prisma.supplierBill.update({ where: { id }, data });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.supplierBill.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  sumPaymentsForBill(billId: string) {
    return prisma.supplierPayment.aggregate({ where: { billId, deletedAt: null }, _sum: { amount: true } });
  },

  sumCreditNotesForBill(billId: string) {
    return prisma.supplierCreditNote.aggregate({ where: { billId, deletedAt: null }, _sum: { amount: true } });
  },

  sumDebitNotesForBill(billId: string) {
    return prisma.supplierDebitNote.aggregate({ where: { billId, deletedAt: null }, _sum: { amount: true } });
  },

  createCreditNote(data: Prisma.SupplierCreditNoteUncheckedCreateInput) {
    return prisma.supplierCreditNote.create({ data });
  },

  async nextCreditNoteNumber() {
    return nextDocumentNumber('SCN', 4, async (stamp) => {
      const rows = await prisma.supplierCreditNote.findMany({
        where: { creditNoteNumber: { startsWith: `SCN-${stamp}-` } },
        select: { creditNoteNumber: true },
      });
      return highestSequenceToday(rows, 'creditNoteNumber', 'SCN', stamp);
    });
  },

  createDebitNote(data: Prisma.SupplierDebitNoteUncheckedCreateInput) {
    return prisma.supplierDebitNote.create({ data });
  },

  async nextDebitNoteNumber() {
    return nextDocumentNumber('SDN', 4, async (stamp) => {
      const rows = await prisma.supplierDebitNote.findMany({
        where: { debitNoteNumber: { startsWith: `SDN-${stamp}-` } },
        select: { debitNoteNumber: true },
      });
      return highestSequenceToday(rows, 'debitNoteNumber', 'SDN', stamp);
    });
  },
};
