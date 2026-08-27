import { chequeBookRepository } from '../repositories/cheque-book.repository';
import { bankAccountRepository } from '../repositories/bank-account.repository';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { CreateChequeBookInput, UpdateChequeBookInput } from '../validators/cheque-book.validator';
import { hardDelete } from '../utils/hardDelete.util';

export const chequeBookService = {
  async list(organizationId: string | undefined, params: { bankAccountId?: string; isActive?: string }) {
    const orgId = await organizationService.resolveOrganizationId(organizationId);
    return chequeBookRepository.findManyForOrganization(orgId, {
      bankAccountId: params.bankAccountId,
      isActive: params.isActive === 'true' ? true : params.isActive === 'false' ? false : undefined,
    });
  },

  async create(input: CreateChequeBookInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(input.organizationId);

    const bankAccount = await bankAccountRepository.findByIdBasic(input.bankAccountId);
    if (!bankAccount || bankAccount.organizationId !== organizationId) {
      throw new AppError('Bank Account not found for this organization', 422);
    }

    const dup = await chequeBookRepository.findByBookNumber(input.bankAccountId, input.bookNumber);
    if (dup) throw new AppError('A cheque book with this book number already exists for this bank account', 409);

    const startNum = Number(input.startNumber);
    const endNum = Number(input.endNumber);
    const totalLeaves =
      Number.isFinite(startNum) && Number.isFinite(endNum) && endNum >= startNum
        ? endNum - startNum + 1
        : input.totalLeaves;
    if (!totalLeaves || totalLeaves <= 0) {
      throw new AppError('totalLeaves could not be determined — provide numeric startNumber/endNumber or totalLeaves explicitly', 422);
    }

    const chequeBook = await chequeBookRepository.create({
      organizationId,
      bankAccountId: input.bankAccountId,
      bookNumber: input.bookNumber,
      startNumber: input.startNumber,
      endNumber: input.endNumber,
      totalLeaves,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'ChequeBook',
      entityId: chequeBook.id,
      description: `Created cheque book ${chequeBook.bookNumber}`,
    });

    return chequeBook;
  },

  /** Read-only — the next unused numeric cheque leaf, padded to match startNumber's width. Returns null for non-numeric ranges (issued manually instead). */
  async nextAvailableNumber(chequeBookId: string): Promise<string | null> {
    const book = await chequeBookRepository.findById(chequeBookId);
    if (!book) throw new AppError('Cheque Book not found', 404);
    const startNum = Number(book.startNumber);
    if (!Number.isFinite(startNum)) return null;

    const issuedCount = await chequeBookRepository.countIssuedLeaves(chequeBookId);
    const next = startNum + issuedCount;
    if (next > Number(book.endNumber)) return null;
    return String(next).padStart(book.startNumber.length, '0');
  },

  /**
   * Book number and leaf range stay editable until the first leaf is used —
   * after that the range is what the issued cheque numbers were drawn from,
   * so moving it would leave those cheques outside their own book.
   */
  async update(id: string, input: UpdateChequeBookInput, actorId: string) {
    const existing = await chequeBookRepository.findById(id);
    if (!existing) throw new AppError('Cheque Book not found', 404);

    const rangeChanged =
      (input.startNumber !== undefined && input.startNumber !== existing.startNumber) ||
      (input.endNumber !== undefined && input.endNumber !== existing.endNumber);
    if (rangeChanged) {
      const issued = await chequeBookRepository.countIssuedLeaves(id);
      if (issued > 0) throw new AppError(`${issued} cheque(s) have already been issued from this book, so its number range can no longer be changed`, 409);
    }

    if (input.bookNumber && input.bookNumber !== existing.bookNumber) {
      const dup = await chequeBookRepository.findByBookNumber(existing.bankAccountId, input.bookNumber);
      if (dup) throw new AppError('A cheque book with this book number already exists for this bank account', 409);
    }

    const startNumber = input.startNumber ?? existing.startNumber;
    const endNumber = input.endNumber ?? existing.endNumber;
    const startNum = Number(startNumber);
    const endNum = Number(endNumber);
    const totalLeaves =
      Number.isFinite(startNum) && Number.isFinite(endNum) && endNum >= startNum
        ? endNum - startNum + 1
        : input.totalLeaves ?? existing.totalLeaves;

    const updated = await chequeBookRepository.update(id, {
      bookNumber: input.bookNumber,
      startNumber: input.startNumber,
      endNumber: input.endNumber,
      totalLeaves,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'ChequeBook',
      entityId: id,
      description: `Updated cheque book ${existing.bookNumber}`,
    });

    return updated;
  },

  /** Only an unused book can go — a used one is the record of where its cheque numbers came from. */
  async remove(id: string, actorId: string) {
    const existing = await chequeBookRepository.findById(id);
    if (!existing) throw new AppError('Cheque Book not found', 404);

    const cheques = await chequeBookRepository.countCheques(id);
    if (cheques > 0) {
      throw new AppError(`This book has ${cheques} cheque(s) recorded against it and cannot be deleted. Deactivate it instead.`, 409);
    }

    await hardDelete('Cheque Book', () => chequeBookRepository.hardDelete(id));

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'ChequeBook',
      entityId: id,
      description: `Deleted cheque book ${existing.bookNumber}`,
    });
  },

  async toggleStatus(id: string, actorId: string) {
    const existing = await chequeBookRepository.findById(id);
    if (!existing) throw new AppError('Cheque Book not found', 404);

    const updated = await chequeBookRepository.update(id, { isActive: !existing.isActive, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'ChequeBook',
      entityId: id,
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} cheque book ${existing.bookNumber}`,
    });

    return updated;
  },
};
