import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { dateRangeWhere } from '../utils/reportFilters';

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

  findByReferenceNumber(companyId: string, referenceNumber: string) {
    return prisma.receipt.findFirst({ where: { companyId, referenceNumber, deletedAt: null } });
  },

  async nextReceiptNumber() {
    const count = await prisma.receipt.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `RCT-${datePart}-${String(count + 1).padStart(4, '0')}`;
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
