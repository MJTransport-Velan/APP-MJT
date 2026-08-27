import { Request } from 'express';
import { SupplierBillStatus } from '@prisma/client';
import { supplierBillRepository, SupplierBillWithRelations } from '../repositories/supplier-bill.repository';
import { AppError } from '../middlewares/error.middleware';
import { hardDelete } from '../utils/hardDelete.util';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import {
  GenerateSupplierBillInput,
  UpdateSupplierBillInput,
  CreateSupplierCreditNoteInput,
  CreateSupplierDebitNoteInput,
} from '../validators/supplier-bill.validator';

function serialize(bill: SupplierBillWithRelations) {
  return {
    id: bill.id,
    billNumber: bill.billNumber,
    status: bill.status,
    billDate: bill.billDate,
    dueDate: bill.dueDate,
    subtotal: bill.subtotal,
    taxAmount: bill.taxAmount,
    totalAmount: bill.totalAmount,
    retentionAmount: bill.retentionAmount,
    paidAmount: bill.paidAmount,
    outstandingAmount: bill.outstandingAmount,
    notes: bill.notes,
    supplier: { id: bill.supplier.id, name: bill.supplier.name },
    trip: bill.trip ? { id: bill.trip.id, tripNumber: bill.trip.tripNumber } : null,
    creditNotes: bill.creditNotes.map((c) => ({ id: c.id, creditNoteNumber: c.creditNoteNumber, amount: c.amount, reason: c.reason, category: c.category })),
    debitNotes: bill.debitNotes.map((d) => ({ id: d.id, debitNoteNumber: d.debitNoteNumber, amount: d.amount, reason: d.reason, category: d.category })),
    payments: bill.payments.map((p) => ({ id: p.id, paymentNumber: p.paymentNumber, amount: p.amount, paymentDate: p.paymentDate, isRetentionRelease: p.isRetentionRelease })),
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
  };
}

async function recalcBill(billId: string) {
  const bill = await supplierBillRepository.findByIdBasic(billId);
  if (!bill) return;

  const [paymentSum, creditNoteSum, debitNoteSum] = await Promise.all([
    supplierBillRepository.sumPaymentsForBill(billId),
    supplierBillRepository.sumCreditNotesForBill(billId),
    supplierBillRepository.sumDebitNotesForBill(billId),
  ]);

  const paidAmount = Number(paymentSum._sum.amount || 0);
  const creditedAmount = Number(creditNoteSum._sum.amount || 0);
  const debitedAmount = Number(debitNoteSum._sum.amount || 0);
  const netTotal = Number(bill.totalAmount) - creditedAmount + debitedAmount;
  const outstandingAmount = Math.max(netTotal - paidAmount, 0);

  let status: SupplierBillStatus = bill.status;
  if (status !== 'CANCELLED') {
    if (outstandingAmount <= 0) status = 'PAID';
    else if (paidAmount > 0) status = 'PARTIALLY_PAID';
    else if (status === 'PAID' || status === 'PARTIALLY_PAID') status = 'GENERATED';
  }

  await supplierBillRepository.recalculateOutstanding(billId, { paidAmount, outstandingAmount, status });
}

export const supplierBillService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await supplierBillRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      supplierId: (query.supplierId as string) || undefined,
      status: (query.status as SupplierBillStatus) || undefined,
      unpaidOnly: query.unpaidOnly === 'true',
      dateFrom: query.dateFrom ? new Date(query.dateFrom as string) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo as string) : undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const bill = await supplierBillRepository.findById(id);
    if (!bill) throw new AppError('Supplier Bill not found', 404);
    return serialize(bill);
  },

  /** Generates a SupplierBill — pure payable bookkeeping, no cash movement until a Supplier Payment is recorded against it. */
  async generate(input: GenerateSupplierBillInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);

    const supplier = await supplierBillRepository.findSupplierById(input.supplierId);
    if (!supplier) throw new AppError('Supplier not found', 404);
    if (!supplier.isActive) throw new AppError('Cannot bill an inactive supplier', 409);

    let trip = null;
    if (input.tripId) {
      trip = await supplierBillRepository.findTripById(input.tripId);
      if (!trip) throw new AppError('Trip not found', 404);
      if (trip.supplierId !== input.supplierId) throw new AppError('Trip does not belong to the selected supplier', 400);
      if (trip.status !== 'COMPLETED') throw new AppError('Supplier bills can only reference completed trips', 400);

      // Nothing prevented the same trip being billed over and over: each
      // bill carried the trip's full supplier rate, so the payable — and
      // whatever the supplier could then be paid — multiplied with every
      // repeat. A cancelled bill doesn't count, so a mis-raised bill can
      // still be voided and re-issued.
      const already = await supplierBillRepository.findLiveBillForTrip(input.tripId);
      if (already) {
        throw new AppError(`Trip ${trip.tripNumber} has already been billed on ${already.billNumber}`, 409);
      }
    }

    const subtotal = input.subtotal ?? (trip ? Number(trip.supplierRate || 0) : undefined);
    if (!subtotal || subtotal <= 0) {
      throw new AppError('subtotal is required (or a trip with a supplierRate)', 422);
    }
    const taxAmount = input.taxAmount ?? 0;
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));
    const retentionAmount = input.retentionAmount ?? 0;
    if (retentionAmount > totalAmount) throw new AppError('Retention amount cannot exceed the bill total', 422);

    const billNumber = await supplierBillRepository.nextBillNumber();
    const today = new Date().toISOString().slice(0, 10);

    const bill = await supplierBillRepository.create({
      billNumber,
      supplierId: input.supplierId,
      tripId: input.tripId,
      organizationId,
      billDate: new Date(`${today}T00:00:00.000Z`),
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      subtotal,
      taxAmount,
      totalAmount,
      retentionAmount,
      outstandingAmount: totalAmount,
      status: 'GENERATED',
      notes: input.notes,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'SupplierBill',
      entityId: bill.id,
      description: `Generated supplier bill ${bill.billNumber} for ${supplier.name}`,
    });

    return supplierBillService.getById(bill.id);
  },

  async update(id: string, input: UpdateSupplierBillInput, actorId: string) {
    const existing = await supplierBillRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Supplier Bill not found', 404);
    if (existing.status === 'PAID' || existing.status === 'CANCELLED') {
      throw new AppError(`Cannot edit a bill with status ${existing.status}`, 400);
    }

    await supplierBillRepository.update(id, {
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      notes: input.notes,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'SupplierBill', entityId: id, description: `Updated supplier bill ${existing.billNumber}` });
    return supplierBillService.getById(id);
  },

  async cancel(id: string, actorId: string) {
    const existing = await supplierBillRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Supplier Bill not found', 404);
    if (existing.status === 'PAID' || existing.status === 'CANCELLED') {
      throw new AppError(`Cannot cancel a bill with status ${existing.status}`, 400);
    }
    if (Number(existing.paidAmount) > 0) {
      throw new AppError('Cannot cancel a bill that already has payments allocated', 409);
    }

    await supplierBillRepository.update(id, { status: 'CANCELLED', updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'SupplierBill', entityId: id, description: `Cancelled supplier bill ${existing.billNumber}` });
    return supplierBillService.getById(id);
  },

  async addCreditNote(billId: string, input: CreateSupplierCreditNoteInput, actorId: string) {
    const bill = await supplierBillRepository.findById(billId);
    if (!bill) throw new AppError('Supplier Bill not found', 404);
    if (bill.status === 'CANCELLED') throw new AppError('Cannot issue a credit note against a cancelled bill', 400);

    const creditNoteNumber = await supplierBillRepository.nextCreditNoteNumber();
    const creditNote = await supplierBillRepository.createCreditNote({
      creditNoteNumber,
      billId,
      amount: input.amount,
      reason: input.reason,
      category: (input.category ?? 'OTHER') as never,
      createdById: actorId,
      updatedById: actorId,
    });

    await recalcBill(billId);

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'SupplierCreditNote', entityId: creditNote.id, description: `Issued supplier credit note ${creditNote.creditNoteNumber}` });
    return supplierBillService.getById(billId);
  },

  async addDebitNote(billId: string, input: CreateSupplierDebitNoteInput, actorId: string) {
    const bill = await supplierBillRepository.findById(billId);
    if (!bill) throw new AppError('Supplier Bill not found', 404);
    if (bill.status === 'CANCELLED') throw new AppError('Cannot issue a debit note against a cancelled bill', 400);

    const debitNoteNumber = await supplierBillRepository.nextDebitNoteNumber();
    const debitNote = await supplierBillRepository.createDebitNote({
      debitNoteNumber,
      billId,
      amount: input.amount,
      reason: input.reason,
      category: (input.category ?? 'OTHER') as never,
      createdById: actorId,
      updatedById: actorId,
    });

    await recalcBill(billId);

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'SupplierDebitNote', entityId: debitNote.id, description: `Issued supplier debit note ${debitNote.debitNoteNumber}` });
    return supplierBillService.getById(billId);
  },

  recalc: recalcBill,

  /**
   * Deletes a bill outright. Payments, credit notes and debit notes recorded
   * against it block the delete — those documents carry their own balances
   * and would be left pointing at a bill that no longer exists.
   */
  async remove(id: string, actorId: string) {
    const existing = await supplierBillRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Supplier Bill not found', 404);

    const linked = await supplierBillRepository.countLinkedDocuments(id);
    const blocking = [
      linked.payments ? `${linked.payments} payment(s)` : null,
      linked.creditNotes ? `${linked.creditNotes} credit note(s)` : null,
      linked.debitNotes ? `${linked.debitNotes} debit note(s)` : null,
    ].filter(Boolean);
    if (blocking.length) {
      throw new AppError(`This bill has ${blocking.join(' and ')} recorded against it and cannot be deleted. Cancel it instead.`, 409);
    }

    await hardDelete('Supplier Bill', () => supplierBillRepository.hardDelete(id));

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'SupplierBill',
      entityId: id,
      description: `Deleted supplier bill ${existing.billNumber}`,
    });
  },
};
