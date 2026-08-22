import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { dateRangeWhere } from '../utils/reportFilters';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';

const receiptWithRelations = Prisma.validator<Prisma.ReceiptInclude>()({
  company: true,
  invoice: true,
  paymentMode: true,
  cheque: { select: { id: true, chequeNumber: true, status: true } },
});

export type ReceiptWithRelations = Prisma.ReceiptGetPayload<{ include: typeof receiptWithRelations }>;

export const receiptRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    companyId?: string;
    invoiceId?: string;
    isAdvance?: boolean;
    companyIds?: string[];
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: Prisma.ReceiptWhereInput = {
      deletedAt: null,
      AND: [
        params.companyId ? { companyId: params.companyId } : {},
        params.invoiceId ? { invoiceId: params.invoiceId } : {},
        params.isAdvance !== undefined ? { isAdvance: params.isAdvance } : {},
        params.companyIds ? { companyId: { in: params.companyIds } } : {},
        dateRangeWhere('receiptDate', { dateFrom: params.dateFrom, dateTo: params.dateTo }),
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.receipt.findMany({
        where,
        include: receiptWithRelations,
        orderBy: { receiptDate: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.receipt.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.receipt.findFirst({ where: { id, deletedAt: null }, include: receiptWithRelations });
  },

  findCompanyById(id: string) {
    return prisma.company.findFirst({ where: { id, deletedAt: null } });
  },

  findInvoiceById(id: string) {
    return prisma.invoice.findFirst({ where: { id, deletedAt: null } });
  },

  /**
   * Atomically reserves `amount` of an invoice's outstanding balance, and
   * returns how many rows that claimed — 1 when this caller won, 0 when the
   * invoice no longer has that much left. Putting the balance in the WHERE
   * clause is what makes simultaneous collections mutually exclusive; a
   * read-then-check cannot, because every racing caller reads the same
   * balance before any of them writes.
   *
   * invoiceService.recalc() recomputes paid/outstanding from the actual
   * receipt rows immediately afterwards, so these figures only need to be
   * exclusive, not authoritative.
   */
  async claimInvoiceOutstanding(invoiceId: string, amount: number): Promise<number> {
    const result = await prisma.invoice.updateMany({
      where: { id: invoiceId, deletedAt: null, outstandingAmount: { gte: amount } },
      data: { outstandingAmount: { decrement: amount }, paidAmount: { increment: amount } },
    });
    return result.count;
  },

  findByReferenceNumber(companyId: string, referenceNumber: string) {
    return prisma.receipt.findFirst({ where: { companyId, referenceNumber, deletedAt: null } });
  },

  async nextReceiptNumber() {
    return nextDocumentNumber('RCT', 4, async (stamp) => {
      const rows = await prisma.receipt.findMany({
        where: { receiptNumber: { startsWith: `RCT-${stamp}-` } },
        select: { receiptNumber: true },
      });
      return highestSequenceToday(rows, 'receiptNumber', 'RCT', stamp);
    });
  },

  create(data: Prisma.ReceiptUncheckedCreateInput) {
    return prisma.receipt.create({ data, include: receiptWithRelations });
  },

  update(
    id: string,
    data: Partial<{
      amount: number;
      receiptDate: Date;
      paymentModeId: string;
      referenceNumber: string;
      remarks: string;
      updatedById: string;
    }>
  ) {
    return prisma.receipt.update({ where: { id }, data });
  },

  allocate(id: string, invoiceId: string, updatedById: string) {
    return prisma.receipt.update({ where: { id }, data: { invoiceId, isAdvance: false, updatedById } });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.receipt.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },
};
