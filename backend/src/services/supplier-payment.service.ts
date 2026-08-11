import { Request } from 'express';
import { supplierPaymentRepository, SupplierPaymentWithRelations } from '../repositories/supplier-payment.repository';
import { supplierBillRepository } from '../repositories/supplier-bill.repository';
import { supplierBillService } from './supplier-bill.service';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateSupplierPaymentInput, UpdateSupplierPaymentInput } from '../validators/supplier-payment.validator';

function serialize(payment: SupplierPaymentWithRelations) {
  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    referenceNumber: payment.referenceNumber,
    isAdvance: payment.isAdvance,
    isRetentionRelease: payment.isRetentionRelease,
    remarks: payment.remarks,
    supplier: { id: payment.supplier.id, name: payment.supplier.name },
    trip: payment.trip ? { id: payment.trip.id, tripNumber: payment.trip.tripNumber } : null,
    bill: payment.bill ? { id: payment.bill.id, billNumber: payment.bill.billNumber } : null,
    paymentMode: payment.paymentMode ? { id: payment.paymentMode.id, name: payment.paymentMode.name } : null,
    cheque: payment.cheque ? { id: payment.cheque.id, chequeNumber: payment.cheque.chequeNumber, status: payment.cheque.status } : null,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export const supplierPaymentService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const supplierId = (query.supplierId as string) || undefined;
    const tripId = (query.tripId as string) || undefined;
    const billId = (query.billId as string) || undefined;
    const isAdvance = query.isAdvance === 'true' ? true : query.isAdvance === 'false' ? false : undefined;
    const dateFrom = query.dateFrom ? new Date(query.dateFrom as string) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo as string) : undefined;

    const { rows, total } = await supplierPaymentRepository.findManyPaginated({ skip, take, supplierId, tripId, billId, isAdvance, dateFrom, dateTo });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const payment = await supplierPaymentRepository.findById(id);
    if (!payment) {
      throw new AppError('Supplier payment not found', 404);
    }
    return serialize(payment);
  },

  /** Every supplier payment directly debits the fund account's currentBalance and (if tied to a bill) recalculates that bill's outstanding — no ledger/voucher involved. */
  async create(input: CreateSupplierPaymentInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);

    const supplier = await supplierPaymentRepository.findSupplierById(input.supplierId);
    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    if (input.tripId) {
      const trip = await supplierPaymentRepository.findTripById(input.tripId);
      if (!trip) throw new AppError('Trip not found', 404);
      if (trip.supplierId !== input.supplierId) {
        throw new AppError('Trip does not belong to the selected supplier', 400);
      }
      if (trip.status !== 'COMPLETED') {
        throw new AppError('Supplier payments can only reference completed trips', 400);
      }
    }

    let bill = null;
    if (input.billId) {
      bill = await supplierBillRepository.findByIdBasic(input.billId);
      if (!bill) throw new AppError('Supplier Bill not found', 404);
      if (bill.supplierId !== input.supplierId) throw new AppError('Bill does not belong to the selected supplier', 400);
      if (bill.status === 'CANCELLED') throw new AppError('Cannot pay a cancelled bill', 400);
      if (bill.status === 'PAID') throw new AppError('This bill is already fully paid', 409);
    }

    if (input.referenceNumber) {
      const dup = await supplierPaymentRepository.findByReferenceNumber(input.supplierId, input.referenceNumber);
      if (dup) throw new AppError(`Reference number "${input.referenceNumber}" has already been used for this supplier`, 409);
    }

    const fundAccount = await resolveOrDefaultFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    const paymentDate = input.paymentDate ? input.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const paymentNumber = await supplierPaymentRepository.nextPaymentNumber();

    const payment = await supplierPaymentRepository.create({
      paymentNumber,
      supplierId: input.supplierId,
      tripId: input.tripId,
      billId: input.billId,
      amount: input.amount,
      paymentDate: new Date(`${paymentDate}T00:00:00.000Z`),
      paymentModeId: input.paymentModeId,
      referenceNumber: input.referenceNumber,
      isAdvance: !input.billId,
      isRetentionRelease: input.isRetentionRelease ?? false,
      remarks: input.remarks,
      organizationId,
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      chequeId: input.chequeId,
      createdById: actorId,
      updatedById: actorId,
    });

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -input.amount);

    if (input.billId) {
      await supplierBillService.recalc(input.billId);
    }

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'SupplierPayment',
      entityId: payment.id,
      description: `Recorded supplier payment ${payment.paymentNumber} for ${supplier.name}${bill ? ` against bill ${bill.billNumber}` : ' (advance)'}`,
    });

    return supplierPaymentService.getById(payment.id);
  },

  async update(id: string, input: UpdateSupplierPaymentInput, actorId: string) {
    const existing = await supplierPaymentRepository.findById(id);
    if (!existing) {
      throw new AppError('Supplier payment not found', 404);
    }

    await supplierPaymentRepository.update(id, {
      amount: input.amount,
      paymentDate: input.paymentDate ? new Date(input.paymentDate) : undefined,
      paymentModeId: input.paymentModeId,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      updatedById: actorId,
    });

    if (input.amount !== undefined && existing.fundAccountType && existing.fundAccountId) {
      const delta = input.amount - Number(existing.amount);
      if (delta !== 0) await adjustFundAccountBalance(existing.fundAccountType, existing.fundAccountId, -delta);
    }

    if (existing.billId) {
      await supplierBillService.recalc(existing.billId);
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'SupplierPayment',
      entityId: id,
      description: `Updated supplier payment ${existing.paymentNumber}`,
    });

    return supplierPaymentService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await supplierPaymentRepository.findById(id);
    if (!existing) {
      throw new AppError('Supplier payment not found', 404);
    }

    await supplierPaymentRepository.softDelete(id, actorId);

    if (existing.fundAccountType && existing.fundAccountId) {
      await adjustFundAccountBalance(existing.fundAccountType, existing.fundAccountId, Number(existing.amount));
    }

    if (existing.billId) {
      await supplierBillService.recalc(existing.billId);
    }

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'SupplierPayment',
      entityId: id,
      description: `Deleted supplier payment ${existing.paymentNumber}`,
    });
  },
};
