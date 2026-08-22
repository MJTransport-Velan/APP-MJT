import { Request } from 'express';
import { receiptRepository, ReceiptWithRelations } from '../repositories/receipt.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { invoiceService } from './invoice.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { assertNotFutureDate, todayStr } from '../utils/businessDate.util';
import { CreateReceiptInput, UpdateReceiptInput } from '../validators/receipt.validator';
import { forcedCompanyScope } from '../utils/groupAccess';

function serialize(receipt: ReceiptWithRelations) {
  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    amount: receipt.amount,
    receiptDate: receipt.receiptDate,
    referenceNumber: receipt.referenceNumber,
    isAdvance: receipt.isAdvance,
    remarks: receipt.remarks,
    company: { id: receipt.company.id, name: receipt.company.name },
    invoice: receipt.invoice ? { id: receipt.invoice.id, invoiceNumber: receipt.invoice.invoiceNumber } : null,
    paymentMode: receipt.paymentMode ? { id: receipt.paymentMode.id, name: receipt.paymentMode.name } : null,
    cheque: receipt.cheque ? { id: receipt.cheque.id, chequeNumber: receipt.cheque.chequeNumber, status: receipt.cheque.status } : null,
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
  };
}

export const receiptService = {
  async list(query: Request['query'], roles: string[] = [], userId?: string) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const companyId = (query.companyId as string) || undefined;
    const invoiceId = (query.invoiceId as string) || undefined;
    const isAdvance = query.isAdvance === 'true' ? true : query.isAdvance === 'false' ? false : undefined;
    const companyIds = userId ? await forcedCompanyScope(roles, userId) : undefined;
    const dateFrom = query.dateFrom ? new Date(query.dateFrom as string) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo as string) : undefined;

    const { rows, total } = await receiptRepository.findManyPaginated({ skip, take, companyId, invoiceId, isAdvance, companyIds, dateFrom, dateTo });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string, roles: string[] = [], userId?: string) {
    const receipt = await receiptRepository.findById(id);
    if (!receipt) {
      throw new AppError('Receipt not found', 404);
    }
    if (userId) {
      const scope = await forcedCompanyScope(roles, userId);
      if (scope !== undefined && !scope.includes(receipt.companyId)) {
        throw new AppError('You do not have access to this receipt', 403);
      }
    }
    return serialize(receipt);
  },

  /** Every receipt directly credits the fund account's currentBalance and (if tied to an invoice) recalculates that invoice's outstanding — no ledger/voucher involved. */
  async create(input: CreateReceiptInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);

    const company = await receiptRepository.findCompanyById(input.companyId);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    let invoice = null;
    if (input.invoiceId) {
      invoice = await receiptRepository.findInvoiceById(input.invoiceId);
      if (!invoice) throw new AppError('Invoice not found', 404);
      if (invoice.companyId !== input.companyId) {
        throw new AppError('Invoice does not belong to the selected company', 400);
      }
      if (invoice.status === 'CANCELLED') {
        throw new AppError('Cannot receipt against a cancelled invoice', 400);
      }

      // Without this, a settled invoice would keep accepting receipts: the
      // cash reached the bank while nothing was left to clear against it,
      // so total assets rose with no matching receivable. Anything genuinely
      // collected beyond the invoice belongs on a customer advance (omit
      // invoiceId) rather than against a bill that is already paid.
      //
      // The claim is a conditional UPDATE rather than a read-then-check,
      // because a plain check is decided before it is acted on: four cashiers
      // collecting the same invoice at the same instant all read the same
      // outstanding balance and all passed, and the bank took four times the
      // invoice. `updateMany` with the balance in its WHERE clause makes
      // reserving the amount a single atomic step, so exactly one of those
      // four can win. recalcInvoice below then recomputes paid/outstanding
      // from the real receipt rows, so this reservation never has to be
      // exact — only exclusive.
      const claimed = await receiptRepository.claimInvoiceOutstanding(input.invoiceId, input.amount);
      if (claimed === 0) {
        const current = Number(invoice.outstandingAmount);
        if (current <= 0) {
          throw new AppError(
            `Invoice ${invoice.invoiceNumber} is already settled in full. Record this as a customer advance instead of allocating it to this invoice.`,
            409
          );
        }
        throw new AppError(
          `Receipt amount (${input.amount}) exceeds the ${current} still outstanding on invoice ${invoice.invoiceNumber}.`,
          409
        );
      }
    }

    if (input.referenceNumber) {
      const dup = await receiptRepository.findByReferenceNumber(input.companyId, input.referenceNumber);
      if (dup) throw new AppError(`Reference number "${input.referenceNumber}" has already been used for this customer`, 409);
    }

    const fundAccount = await resolveOrDefaultFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    const receiptDate = input.receiptDate ? input.receiptDate.slice(0, 10) : todayStr();
    assertNotFutureDate(receiptDate, 'Receipt date');
    const receiptNumber = await receiptRepository.nextReceiptNumber();

    const receipt = await receiptRepository.create({
      receiptNumber,
      companyId: input.companyId,
      invoiceId: input.invoiceId,
      amount: input.amount,
      receiptDate: new Date(`${receiptDate}T00:00:00.000Z`),
      paymentModeId: input.paymentModeId,
      referenceNumber: input.referenceNumber,
      isAdvance: !input.invoiceId,
      remarks: input.remarks,
      organizationId,
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      chequeId: input.chequeId,
      createdById: actorId,
      updatedById: actorId,
    });

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, input.amount);

    if (input.invoiceId) {
      await invoiceService.recalc(input.invoiceId, actorId);
    }

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Receipt',
      entityId: receipt.id,
      description: `Recorded receipt ${receipt.receiptNumber} for ${company.name}${input.invoiceId ? ` against invoice ${invoice!.invoiceNumber}` : ' (advance)'}`,
    });

    return receiptService.getById(receipt.id);
  },

  async update(id: string, input: UpdateReceiptInput, actorId: string) {
    const existing = await receiptRepository.findById(id);
    if (!existing) {
      throw new AppError('Receipt not found', 404);
    }

    await receiptRepository.update(id, {
      amount: input.amount,
      receiptDate: input.receiptDate ? new Date(input.receiptDate) : undefined,
      paymentModeId: input.paymentModeId,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      updatedById: actorId,
    });

    if (input.amount !== undefined && existing.fundAccountType && existing.fundAccountId) {
      const delta = input.amount - Number(existing.amount);
      if (delta !== 0) await adjustFundAccountBalance(existing.fundAccountType, existing.fundAccountId, delta);
    }

    if (existing.invoiceId) {
      await invoiceService.recalc(existing.invoiceId, actorId);
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Receipt',
      entityId: id,
      description: `Updated receipt ${existing.receiptNumber}`,
    });

    return receiptService.getById(id);
  },

  async allocate(id: string, invoiceId: string, actorId: string) {
    const existing = await receiptRepository.findById(id);
    if (!existing) {
      throw new AppError('Receipt not found', 404);
    }
    if (!existing.isAdvance) {
      throw new AppError('Only advance receipts can be allocated', 400);
    }

    const invoice = await receiptRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    if (invoice.companyId !== existing.companyId) {
      throw new AppError('Invoice does not belong to the same company as the receipt', 400);
    }
    if (invoice.status === 'CANCELLED') {
      throw new AppError('Cannot allocate to a cancelled invoice', 400);
    }

    await receiptRepository.allocate(id, invoiceId, actorId);
    await invoiceService.recalc(invoiceId, actorId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Receipt',
      entityId: id,
      description: `Allocated advance receipt ${existing.receiptNumber} to invoice ${invoice.invoiceNumber}`,
    });

    return receiptService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await receiptRepository.findById(id);
    if (!existing) {
      throw new AppError('Receipt not found', 404);
    }

    await receiptRepository.softDelete(id, actorId);

    if (existing.fundAccountType && existing.fundAccountId) {
      await adjustFundAccountBalance(existing.fundAccountType, existing.fundAccountId, -Number(existing.amount));
    }

    if (existing.invoiceId) {
      await invoiceService.recalc(existing.invoiceId, actorId);
    }

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Receipt',
      entityId: id,
      description: `Deleted receipt ${existing.receiptNumber}`,
    });
  },
};
