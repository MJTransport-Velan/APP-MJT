import { bankAccountRepository } from '../repositories/bank-account.repository';
import { organizationService } from './organization.service';
import { adjustFundAccountBalance } from '../utils/fundAccount.util';
import { auditService } from './audit.service';
import { AppError } from '../middlewares/error.middleware';
import { CreateBankChargeInput, CreateInterestInput } from '../validators/bank-charge-interest.validator';

async function assertBankAccount(organizationId: string, bankAccountId: string) {
  const bankAccount = await bankAccountRepository.findByIdBasic(bankAccountId);
  if (!bankAccount || bankAccount.organizationId !== organizationId) {
    throw new AppError('Bank Account not found for this organization', 422);
  }
  return bankAccount;
}

export const bankChargeInterestService = {
  /** Bank Charges — a real cash outflow, straight off the Bank Account's balance. */
  async createBankCharge(input: CreateBankChargeInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(input.organizationId);
    const bankAccount = await assertBankAccount(organizationId, input.bankAccountId);

    await adjustFundAccountBalance('BANK', bankAccount.id, -input.amount);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'BankAccount',
      entityId: bankAccount.id,
      description: `Bank charge of ${input.amount} on ${bankAccount.accountHolderName}${input.narration ? `: ${input.narration}` : ''}`,
    });

    return bankAccountRepository.findByIdBasic(bankAccount.id);
  },

  /** Interest Received/Paid — direction-aware balance movement on the Bank Account. */
  async createInterest(input: CreateInterestInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(input.organizationId);
    const bankAccount = await assertBankAccount(organizationId, input.bankAccountId);

    const delta = input.direction === 'RECEIVED' ? input.amount : -input.amount;
    await adjustFundAccountBalance('BANK', bankAccount.id, delta);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'BankAccount',
      entityId: bankAccount.id,
      description: `Interest ${input.direction.toLowerCase()} of ${input.amount} on ${bankAccount.accountHolderName}${input.narration ? `: ${input.narration}` : ''}`,
    });

    return bankAccountRepository.findByIdBasic(bankAccount.id);
  },
};
