import { organizationService } from './organization.service';
import { prisma } from '../config/db';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Bank/Cash balances are read directly off BankAccount.currentBalance /
 * CashAccount.currentBalance — there is no ledger to recompute them from
 * in this model (mirrors financial-state.service.ts's bankAndCashState()).
 * Today's money-in/out is read off FinancialEntry, the same generic
 * money-movement table financial-state.service.ts's dashboard() uses for
 * "Money In / Money Out".
 */
export const bankingDashboardService = {
  async summary(organizationId: string | undefined) {
    const orgId = await organizationService.resolveOrganizationId(organizationId);

    const [bankAccounts, cashAccounts] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { organizationId: orgId, deletedAt: null, isActive: true },
        select: { id: true, accountHolderName: true, accountNumber: true, currentBalance: true },
      }),
      prisma.cashAccount.findMany({
        where: { organizationId: orgId, deletedAt: null, isActive: true },
        select: { id: true, cashAccountType: true, currentBalance: true },
      }),
    ]);

    const bankBalances = bankAccounts.map((b) => ({
      id: b.id,
      accountHolderName: b.accountHolderName,
      accountNumber: b.accountNumber,
      bookBalance: round2(Number(b.currentBalance)),
    }));
    const cashBalances = cashAccounts.map((c) => ({
      id: c.id,
      cashAccountType: c.cashAccountType,
      balance: round2(Number(c.currentBalance)),
    }));

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const [moneyIn, moneyOut] = await Promise.all([
      prisma.financialEntry.aggregate({
        where: {
          organizationId: orgId,
          entryDate: { gte: startOfDay, lte: endOfDay },
          entryType: { in: ['MONEY_RECEIVED', 'ADVANCE_RECEIVED', 'REFUND_RECEIVED', 'LOAN_RECEIVED'] },
          status: { notIn: ['CANCELLED'] },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
      prisma.financialEntry.aggregate({
        where: {
          organizationId: orgId,
          entryDate: { gte: startOfDay, lte: endOfDay },
          entryType: { in: ['MONEY_PAID', 'ADVANCE_GIVEN', 'REFUND_PAID', 'LOAN_REPAYMENT', 'EXPENSE', 'SALARY_SETTLEMENT'] },
          status: { notIn: ['CANCELLED'] },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
    ]);

    const pendingCheques = await prisma.cheque.count({
      where: { organizationId: orgId, status: { in: ['ISSUED', 'RECEIVED', 'DEPOSITED', 'PRESENTED'] } },
    });
    const pendingPettyCashApprovals = await prisma.pettyCashRequest.count({
      where: { organizationId: orgId, status: 'PENDING' },
    });

    const recentTransfers = await prisma.bankTransfer.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, transferNumber: true, transferDate: true, amount: true, fromAccountType: true, toAccountType: true },
    });

    return {
      bankAccounts: bankBalances,
      cashAccounts: cashBalances,
      todaysReceipts: round2(Number(moneyIn._sum.amount ?? 0)),
      todaysPayments: round2(Number(moneyOut._sum.amount ?? 0)),
      pendingCheques,
      pendingApprovals: pendingPettyCashApprovals,
      recentTransfers,
    };
  },
};
