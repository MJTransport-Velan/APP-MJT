import { Request } from 'express';
import { pettyCashRequestRepository } from '../repositories/petty-cash-request.repository';
import { cashAccountRepository } from '../repositories/cash-account.repository';
import { organizationService } from './organization.service';
import { bankTransferService } from './bank-transfer.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { adjustFundAccountBalance } from '../utils/fundAccount.util';
import { CreatePettyCashRequestInput, DisbursePettyCashRequestInput, ClosePettyCashRequestInput } from '../validators/petty-cash-request.validator';

export const pettyCashRequestService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const organizationId = await organizationService.resolveOrganizationId(query.organizationId as string | undefined);
    const { rows, total } = await pettyCashRequestRepository.findManyPaginated({
      organizationId,
      skip,
      take,
      status: query.status as string | undefined,
      cashAccountId: query.cashAccountId as string | undefined,
    });
    return { data: rows, meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const request = await pettyCashRequestRepository.findById(id);
    if (!request) throw new AppError('Petty Cash Request not found', 404);
    return request;
  },

  /** Every request starts PENDING — a single approve/reject decision, no multi-level rule engine. */
  async create(input: CreatePettyCashRequestInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(input.organizationId);

    const cashAccount = await cashAccountRepository.findByIdBasic(input.cashAccountId);
    if (!cashAccount || cashAccount.organizationId !== organizationId) {
      throw new AppError('Cash Account not found for this organization', 422);
    }
    if (!cashAccount.isActive) throw new AppError('Cash Account is inactive', 409);

    const request = await pettyCashRequestRepository.create({
      organizationId,
      cashAccountId: input.cashAccountId,
      requestedById: actorId,
      amount: input.amount,
      purpose: input.purpose,
      status: 'PENDING',
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'PettyCashRequest',
      entityId: request.id,
      description: `Requested petty cash ${input.amount} for "${input.purpose}"`,
    });

    return request;
  },

  async decide(id: string, decision: 'APPROVED' | 'REJECTED', remarks: string | undefined, actorId: string) {
    const request = await pettyCashRequestRepository.findByIdBasic(id);
    if (!request) throw new AppError('Petty Cash Request not found', 404);
    if (request.status !== 'PENDING') throw new AppError(`Request is ${request.status}, not PENDING`, 409);

    if (decision === 'REJECTED') {
      const updated = await pettyCashRequestRepository.update(id, {
        status: 'REJECTED',
        rejectedById: actorId,
        rejectedAt: new Date(),
        rejectionReason: remarks,
        updatedById: actorId,
      });
      await auditService.record({ userId: actorId, action: 'REJECT', entityType: 'PettyCashRequest', entityId: id, description: `Rejected petty cash request: ${remarks ?? ''}` });
      return updated;
    }

    const updated = await pettyCashRequestRepository.update(id, {
      status: 'APPROVED',
      approvedById: actorId,
      approvedAt: new Date(),
      updatedById: actorId,
    });
    await auditService.record({ userId: actorId, action: 'APPROVE', entityType: 'PettyCashRequest', entityId: id, description: 'Approved petty cash request' });
    return updated;
  },

  /** Funds an APPROVED request with a Bank -> Cash transfer (reused, not a second "allocation" mechanism). */
  async disburse(id: string, input: DisbursePettyCashRequestInput, actorId: string) {
    const request = await pettyCashRequestRepository.findByIdBasic(id);
    if (!request) throw new AppError('Petty Cash Request not found', 404);
    if (request.status !== 'APPROVED') throw new AppError(`Request is ${request.status}, not APPROVED`, 409);

    const transfer = await bankTransferService.create(
      {
        organizationId: request.organizationId,
        transferDate: input.transferDate ?? new Date().toISOString().slice(0, 10),
        fromAccountType: 'BANK',
        fromAccountId: input.fromBankAccountId,
        toAccountType: 'CASH',
        toAccountId: request.cashAccountId,
        amount: Number(request.amount),
        narration: `Petty cash disbursement: ${request.purpose}`,
      },
      actorId
    );

    const updated = await pettyCashRequestRepository.update(id, {
      status: 'DISBURSED',
      disbursementTransferId: transfer!.id,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'PettyCashRequest',
      entityId: id,
      description: `Disbursed petty cash request via transfer ${transfer!.transferNumber}`,
    });

    return updated;
  },

  /** Closes a DISBURSED request. If the settled amount differs from what was disbursed, the difference is returned to (or drawn from) the Cash Account balance directly and recorded on the audit trail. */
  async close(id: string, input: ClosePettyCashRequestInput, actorId: string) {
    const request = await pettyCashRequestRepository.findByIdBasic(id);
    if (!request) throw new AppError('Petty Cash Request not found', 404);
    if (request.status !== 'DISBURSED') throw new AppError(`Request is ${request.status}, not DISBURSED`, 409);

    const variance = Number(request.amount) - input.settledAmount;
    if (Math.abs(variance) > 0.01) {
      // Positive variance = cash left over, returned to the account; negative = overspent, drawn from it.
      await adjustFundAccountBalance('CASH', request.cashAccountId, variance);
    }

    const updated = await pettyCashRequestRepository.update(id, { status: 'CLOSED', updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'PettyCashRequest',
      entityId: id,
      description: `Closed petty cash request — settled ${input.settledAmount} against requested ${request.amount}${Math.abs(variance) > 0.01 ? ` (variance ${variance.toFixed(2)})` : ''}`,
    });

    return updated;
  },
};
