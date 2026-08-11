import { Prisma, InvoiceStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { dateRangeWhere } from '../utils/reportFilters';

const invoiceWithRelations = Prisma.validator<Prisma.InvoiceInclude>()({
  company: true,
  gstMaster: true,
  trips: true,
  creditNotes: true,
  customerDebitNotes: true,
  charges: { orderBy: { sequence: 'asc' } },
});

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{ include: typeof invoiceWithRelations }>;

export const invoiceRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    companyId?: string;
    status?: InvoiceStatus;
    companyIds?: string[];
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { invoiceNumber: { contains: params.search, mode: 'insensitive' } } : {},
        params.companyId ? { companyId: params.companyId } : {},
        params.status ? { status: params.status } : {},
        params.companyIds ? { companyId: { in: params.companyIds } } : {},
        dateRangeWhere('invoiceDate', { dateFrom: params.dateFrom, dateTo: params.dateTo }),
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        include: invoiceWithRelations,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.invoice.findFirst({ where: { id, deletedAt: null }, include: invoiceWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.invoice.findFirst({ where: { id, deletedAt: null } });
  },

  findCompanyById(id: string) {
    return prisma.company.findFirst({ where: { id, deletedAt: null } });
  },

  findGstMasterById(id: string) {
    return prisma.gstMaster.findFirst({ where: { id, deletedAt: null } });
  },

  findTripsByIds(ids: string[]) {
    return prisma.trip.findMany({ where: { id: { in: ids }, deletedAt: null }, include: { intent: true } });
  },

  async nextInvoiceNumber() {
    const count = await prisma.invoice.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `INV-${datePart}-${String(count + 1).padStart(4, '0')}`;
  },

  async createWithTrips(data: {
    invoiceNumber: string;
    companyId: string;
    gstMasterId?: string;
    organizationId: string;
    creditPeriodDays?: number;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    outstandingAmount: number;
    dueDate?: Date;
    notes?: string;
    tripIds: string[];
    charges: { chargeType: string; description?: string; amount: number; sequence: number }[];
    createdById: string;
    updatedById: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          companyId: data.companyId,
          gstMasterId: data.gstMasterId,
          organizationId: data.organizationId,
          creditPeriodDays: data.creditPeriodDays,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          totalAmount: data.totalAmount,
          outstandingAmount: data.outstandingAmount,
          status: 'GENERATED',
          dueDate: data.dueDate,
          notes: data.notes,
          createdById: data.createdById,
          updatedById: data.updatedById,
          charges: {
            create: data.charges.map((c) => ({
              chargeType: c.chargeType as never,
              description: c.description,
              amount: c.amount,
              sequence: c.sequence,
            })),
          },
        },
      });

      await tx.trip.updateMany({
        where: { id: { in: data.tripIds } },
        data: { invoiceId: invoice.id },
      });

      return invoice;
    });
  },

  update(id: string, data: Partial<{ dueDate: Date; notes: string; updatedById: string }>) {
    return prisma.invoice.update({ where: { id }, data });
  },

  setStatus(id: string, status: InvoiceStatus, updatedById: string) {
    return prisma.invoice.update({ where: { id }, data: { status, updatedById } });
  },

  recalculateOutstanding(
    id: string,
    data: { paidAmount: number; outstandingAmount: number; status: InvoiceStatus; updatedById: string }
  ) {
    return prisma.invoice.update({ where: { id }, data });
  },

  async unlinkTrips(invoiceId: string) {
    await prisma.trip.updateMany({ where: { invoiceId }, data: { invoiceId: null } });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.invoice.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  createCreditNote(data: {
    creditNoteNumber: string;
    invoiceId: string;
    amount: number;
    reason: string;
    category?: string;
    voucherId?: string;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.creditNote.create({ data: { ...data, category: data.category as never } });
  },

  async nextCreditNoteNumber() {
    const count = await prisma.creditNote.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `CN-${datePart}-${String(count + 1).padStart(4, '0')}`;
  },

  createDebitNote(data: {
    debitNoteNumber: string;
    invoiceId: string;
    amount: number;
    reason: string;
    category?: string;
    voucherId?: string;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.customerDebitNote.create({ data: { ...data, category: data.category as never } });
  },

  async nextDebitNoteNumber() {
    const count = await prisma.customerDebitNote.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `CDN-${datePart}-${String(count + 1).padStart(4, '0')}`;
  },

  sumReceiptsForInvoice(invoiceId: string) {
    return prisma.receipt.aggregate({ where: { invoiceId, deletedAt: null }, _sum: { amount: true } });
  },

  sumCreditNotesForInvoice(invoiceId: string) {
    return prisma.creditNote.aggregate({ where: { invoiceId, deletedAt: null }, _sum: { amount: true } });
  },

  sumDebitNotesForInvoice(invoiceId: string) {
    return prisma.customerDebitNote.aggregate({ where: { invoiceId, deletedAt: null }, _sum: { amount: true } });
  },
};
