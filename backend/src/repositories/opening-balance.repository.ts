import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const openingBalanceWithRelations = Prisma.validator<Prisma.OpeningBalanceInclude>()({
  bankAccount: { select: { id: true, accountHolderName: true, accountNumber: true, bankName: true } },
  cashAccount: { select: { id: true, cashAccountType: true } },
  company: { select: { id: true, name: true, code: true } },
  supplier: { select: { id: true, name: true, code: true } },
  capitalPartner: { select: { id: true, name: true } },
});

export type OpeningBalanceWithRelations = Prisma.OpeningBalanceGetPayload<{ include: typeof openingBalanceWithRelations }>;

export const openingBalanceRepository = {
  /**
   * The migration is a singleton in practice — one old system, one closing
   * position — so the newest non-deleted header is "the" migration and
   * every opening balance hangs off it.
   */
  findMigration() {
    return prisma.financialMigration.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  },

  createMigration(data: Prisma.FinancialMigrationUncheckedCreateInput) {
    return prisma.financialMigration.create({ data });
  },

  updateMigration(id: string, data: Prisma.FinancialMigrationUncheckedUpdateInput) {
    return prisma.financialMigration.update({ where: { id }, data });
  },

  findEntries(params: { migrationId?: string; category?: string; status?: string } = {}) {
    const where: Prisma.OpeningBalanceWhereInput = {
      deletedAt: null,
      AND: [
        params.migrationId ? { migrationId: params.migrationId } : {},
        params.category ? { category: params.category as never } : {},
        params.status ? { status: params.status as never } : {},
      ],
    };
    return prisma.openingBalance.findMany({
      where,
      include: openingBalanceWithRelations,
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    });
  },

  findEntryById(id: string) {
    return prisma.openingBalance.findFirst({ where: { id, deletedAt: null }, include: openingBalanceWithRelations });
  },

  findEntryByIdBasic(id: string) {
    return prisma.openingBalance.findFirst({ where: { id, deletedAt: null } });
  },

  /** One opening balance per bank/cash account — a second one would double the account's starting money. */
  findFundAccountEntry(params: { bankAccountId?: string; cashAccountId?: string }) {
    return prisma.openingBalance.findFirst({
      where: {
        deletedAt: null,
        ...(params.bankAccountId ? { bankAccountId: params.bankAccountId } : {}),
        ...(params.cashAccountId ? { cashAccountId: params.cashAccountId } : {}),
      },
    });
  },

  createEntry(data: Prisma.OpeningBalanceUncheckedCreateInput) {
    return prisma.openingBalance.create({ data, include: openingBalanceWithRelations });
  },

  updateEntry(id: string, data: Prisma.OpeningBalanceUncheckedUpdateInput) {
    return prisma.openingBalance.update({ where: { id }, data, include: openingBalanceWithRelations });
  },

  softDeleteEntry(id: string, updatedById: string) {
    return prisma.openingBalance.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, appliedAmount: 0, updatedById },
    });
  },

  /** Opening assets and loans live in their own registers, not in opening_balances. */
  findOpeningAssets() {
    return prisma.fixedAsset.findMany({
      where: { deletedAt: null, isActive: true, assetOrigin: 'OPENING' },
      include: {
        category: { select: { id: true, name: true, assetType: true } },
        vehicle: { select: { id: true, registrationNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  findOpeningLoans() {
    return prisma.loan.findMany({
      where: { deletedAt: null, origin: 'OPENING' },
      include: {
        vehicle: { select: { id: true, registrationNumber: true } },
        capitalPartner: { select: { id: true, name: true } },
        installments: { select: { status: true, principalComponent: true, paidDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Money that was already lent out on the migration date. An asset, the
   * mirror of findOpeningLoans above. Written-off loans are still returned —
   * the summary needs the full carried-over figure, and reports the
   * recoverable part separately.
   */
  findOpeningLoansGiven() {
    return prisma.loanGiven.findMany({
      where: { deletedAt: null, origin: 'OPENING' },
      include: { repayments: { select: { amount: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },
};
