import { Request } from 'express';
import { InvoiceStatus } from '@prisma/client';
import { invoiceRepository, InvoiceWithRelations } from '../repositories/invoice.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { creditControlService } from './credit-control.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { GenerateInvoiceInput, UpdateInvoiceInput, CreateCreditNoteInput, CreateDebitNoteInput } from '../validators/invoice.validator';
import { forcedCompanyScope } from '../utils/groupAccess';

function serialize(invoice: InvoiceWithRelations) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    outstandingAmount: invoice.outstandingAmount,
    notes: invoice.notes,
    creditPeriodDays: invoice.creditPeriodDays,
    company: { id: invoice.company.id, name: invoice.company.name },
    gstMaster: invoice.gstMaster ? { id: invoice.gstMaster.id, name: invoice.gstMaster.name } : null,
    trips: invoice.trips.map((t) => ({ id: t.id, tripNumber: t.tripNumber, freightAmount: t.freightAmount })),
    charges: invoice.charges.map((c) => ({ id: c.id, chargeType: c.chargeType, description: c.description, amount: c.amount, sequence: c.sequence })),
    creditNotes: invoice.creditNotes.map((c) => ({ id: c.id, creditNoteNumber: c.creditNoteNumber, amount: c.amount, reason: c.reason, category: c.category })),
    customerDebitNotes: invoice.customerDebitNotes.map((d) => ({ id: d.id, debitNoteNumber: d.debitNoteNumber, amount: d.amount, reason: d.reason, category: d.category })),
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

/** Recomputes paidAmount/outstandingAmount/status — a cache, recomputed transactionally, never a second source of truth (same rule as Voucher.totalDebit). */
async function recalcInvoice(invoiceId: string, actorId: string) {
  const invoice = await invoiceRepository.findByIdBasic(invoiceId);
  if (!invoice) return;

  const [receiptSum, creditNoteSum, debitNoteSum] = await Promise.all([
    invoiceRepository.sumReceiptsForInvoice(invoiceId),
    invoiceRepository.sumCreditNotesForInvoice(invoiceId),
    invoiceRepository.sumDebitNotesForInvoice(invoiceId),
  ]);

  const paidAmount = Number(receiptSum._sum.amount || 0);
  const creditedAmount = Number(creditNoteSum._sum.amount || 0);
  const debitedAmount = Number(debitNoteSum._sum.amount || 0);
  const netTotal = Number(invoice.totalAmount) - creditedAmount + debitedAmount;
  const outstandingAmount = Math.max(netTotal - paidAmount, 0);

  let status: InvoiceStatus = invoice.status;
  if (status !== 'CANCELLED') {
    if (outstandingAmount <= 0) status = 'PAID';
    else if (paidAmount > 0) status = 'PARTIALLY_PAID';
    else if (status === 'PAID' || status === 'PARTIALLY_PAID') status = 'GENERATED';
  }

  await invoiceRepository.recalculateOutstanding(invoiceId, { paidAmount, outstandingAmount, status, updatedById: actorId });
}

export const invoiceService = {
  async list(query: Request['query'], roles: string[] = [], userId?: string) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const companyId = (query.companyId as string) || undefined;
    const status = (query.status as InvoiceStatus) || undefined;
    const companyIds = userId ? await forcedCompanyScope(roles, userId) : undefined;
    const dateFrom = query.dateFrom ? new Date(query.dateFrom as string) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo as string) : undefined;

    const { rows, total } = await invoiceRepository.findManyPaginated({ skip, take, search, companyId, status, companyIds, dateFrom, dateTo });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string, roles: string[] = [], userId?: string) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    if (userId) {
      const scope = await forcedCompanyScope(roles, userId);
      if (scope !== undefined && !scope.includes(invoice.companyId)) {
        throw new AppError('You do not have access to this invoice', 403);
      }
    }
    return serialize(invoice);
  },

  /**
   * The invoice with everything the printable PDF needs. Runs the same
   * company-scope check as getById — a PDF endpoint must not become the way
   * around the access rule the JSON endpoint enforces.
   */
  async getForPdf(id: string, roles: string[] = [], userId?: string) {
    const invoice = await invoiceRepository.findByIdForPdf(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    if (userId) {
      const scope = await forcedCompanyScope(roles, userId);
      if (scope !== undefined && !scope.includes(invoice.companyId)) {
        throw new AppError('You do not have access to this invoice', 403);
      }
    }
    return invoice;
  },

  /** Generates an Invoice — pure receivable bookkeeping, no cash movement until a Receipt is recorded against it. */
  async generate(input: GenerateInvoiceInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);

    const company = await invoiceRepository.findCompanyById(input.companyId);
    if (!company) {
      throw new AppError('Company not found', 404);
    }
    if (!company.isActive) {
      throw new AppError('Cannot invoice an inactive company', 409);
    }

    if (input.gstMasterId) {
      const gst = await invoiceRepository.findGstMasterById(input.gstMasterId);
      if (!gst) throw new AppError('GST master not found', 404);
    }

    const trips = await invoiceRepository.findTripsByIds(input.tripIds);
    if (trips.length !== input.tripIds.length) {
      throw new AppError('One or more trips were not found', 404);
    }
    for (const trip of trips) {
      if (trip.status !== 'COMPLETED') {
        throw new AppError(`Trip ${trip.tripNumber} must be completed before it can be invoiced`, 400);
      }
      if (trip.invoiceId) {
        throw new AppError(`Trip ${trip.tripNumber} has already been invoiced`, 409);
      }
      if (trip.intent.companyId !== input.companyId) {
        throw new AppError(`Trip ${trip.tripNumber} does not belong to the selected company`, 400);
      }
    }

    const tripFreight = trips.reduce((sum, t) => sum + Number(t.freightAmount || 0), 0);
    const charges = (input.charges || []).map((c, index) => ({ ...c, sequence: index }));
    const chargesTotal = charges.reduce((sum, c) => sum + Number(c.amount), 0);
    const subtotal = Number((tripFreight + chargesTotal).toFixed(2));

    let taxAmount = 0;
    if (input.gstMasterId) {
      const gst = await invoiceRepository.findGstMasterById(input.gstMasterId);
      taxAmount = Number(((subtotal * Number(gst!.ratePercent)) / 100).toFixed(2));
    }
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    // Credit control — blocked customers rejected outright; over-limit warned/blocked per §13.
    await creditControlService.assertInvoiceAllowed(company, totalAmount, !!input.overrideCreditHold);

    const invoiceNumber = await invoiceRepository.nextInvoiceNumber();

    const invoice = await invoiceRepository.createWithTrips({
      invoiceNumber,
      companyId: input.companyId,
      gstMasterId: input.gstMasterId,
      organizationId,
      creditPeriodDays: company.creditDays ?? undefined,
      subtotal,
      taxAmount,
      totalAmount,
      outstandingAmount: totalAmount,
      dueDate: input.dueDate ? new Date(input.dueDate) : company.creditDays ? new Date(Date.now() + company.creditDays * 86400000) : undefined,
      notes: input.notes,
      tripIds: input.tripIds,
      charges,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Invoice',
      entityId: invoice.id,
      description: `Generated invoice ${invoice.invoiceNumber} for ${company.name} covering ${trips.length} trip(s)`,
    });

    return invoiceService.getById(invoice.id);
  },

  async update(id: string, input: UpdateInvoiceInput, actorId: string) {
    const existing = await invoiceRepository.findById(id);
    if (!existing) {
      throw new AppError('Invoice not found', 404);
    }
    if (existing.status === 'PAID' || existing.status === 'CANCELLED') {
      throw new AppError(`Cannot edit an invoice with status ${existing.status}`, 400);
    }

    await invoiceRepository.update(id, {
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      notes: input.notes,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Invoice',
      entityId: id,
      description: `Updated invoice ${existing.invoiceNumber}`,
    });

    return invoiceService.getById(id);
  },

  async send(id: string, actorId: string) {
    const existing = await invoiceRepository.findById(id);
    if (!existing) {
      throw new AppError('Invoice not found', 404);
    }
    if (existing.status !== 'GENERATED') {
      throw new AppError('Only generated invoices can be marked as sent', 400);
    }

    await invoiceRepository.setStatus(id, 'SENT', actorId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Invoice',
      entityId: id,
      description: `Marked invoice ${existing.invoiceNumber} as sent`,
    });

    return invoiceService.getById(id);
  },

  async cancel(id: string, actorId: string) {
    const existing = await invoiceRepository.findById(id);
    if (!existing) {
      throw new AppError('Invoice not found', 404);
    }
    if (existing.status === 'PAID' || existing.status === 'CANCELLED') {
      throw new AppError(`Cannot cancel an invoice with status ${existing.status}`, 400);
    }
    if (Number(existing.paidAmount) > 0) {
      throw new AppError('Cannot cancel an invoice that already has receipts allocated', 409);
    }

    await invoiceRepository.setStatus(id, 'CANCELLED', actorId);
    await invoiceRepository.unlinkTrips(id);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Invoice',
      entityId: id,
      description: `Cancelled invoice ${existing.invoiceNumber}`,
    });

    return invoiceService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await invoiceRepository.findById(id);
    if (!existing) {
      throw new AppError('Invoice not found', 404);
    }
    if (existing.status !== 'CANCELLED') {
      throw new AppError('Only cancelled invoices can be deleted', 400);
    }

    await invoiceRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Invoice',
      entityId: id,
      description: `Deleted invoice ${existing.invoiceNumber}`,
    });
  },

  async addCreditNote(invoiceId: string, input: CreateCreditNoteInput, actorId: string) {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    if (invoice.status === 'CANCELLED') {
      throw new AppError('Cannot issue a credit note against a cancelled invoice', 400);
    }
    if (input.amount > Number(invoice.outstandingAmount) + Number(invoice.paidAmount)) {
      throw new AppError('Credit note amount cannot exceed the invoice total', 400);
    }

    const creditNoteNumber = await invoiceRepository.nextCreditNoteNumber();
    const creditNote = await invoiceRepository.createCreditNote({
      creditNoteNumber,
      invoiceId,
      amount: input.amount,
      reason: input.reason,
      category: input.category,
      createdById: actorId,
      updatedById: actorId,
    });

    await recalcInvoice(invoiceId, actorId);

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'CreditNote',
      entityId: creditNote.id,
      description: `Issued credit note ${creditNote.creditNoteNumber} for invoice ${invoice.invoiceNumber}`,
    });

    return invoiceService.getById(invoiceId);
  },

  /** New in Phase 10 — the customer side had CreditNote only until now. */
  async addDebitNote(invoiceId: string, input: CreateDebitNoteInput, actorId: string) {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    if (invoice.status === 'CANCELLED') {
      throw new AppError('Cannot issue a debit note against a cancelled invoice', 400);
    }

    const debitNoteNumber = await invoiceRepository.nextDebitNoteNumber();
    const debitNote = await invoiceRepository.createDebitNote({
      debitNoteNumber,
      invoiceId,
      amount: input.amount,
      reason: input.reason,
      category: input.category,
      createdById: actorId,
      updatedById: actorId,
    });

    await recalcInvoice(invoiceId, actorId);

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'CustomerDebitNote',
      entityId: debitNote.id,
      description: `Issued debit note ${debitNote.debitNoteNumber} for invoice ${invoice.invoiceNumber}`,
    });

    return invoiceService.getById(invoiceId);
  },

  /** Exposed for the Receipt module to trigger recalculation after allocation. */
  recalc: recalcInvoice,
};
