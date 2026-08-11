import { chequeBookRepository } from '../repositories/cheque-book.repository';
import { bankAccountRepository } from '../repositories/bank-account.repository';
import { organizationService } from './organization.service';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { CreateChequeBookInput } from '../validators/cheque-book.validator';

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
