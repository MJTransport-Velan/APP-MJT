/**
 * Customer credit control — Phase 10 design doc §13. Pure service-layer
 * validation; no new engine, no new schema beyond the additive Company
 * columns (creditLimit/creditDays/isBlocked).
 */
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { partyOutstandingService } from './party-outstanding.service';

interface CompanyCreditFields {
  id: string;
  name: string;
  isBlocked: boolean;
  blockedReason: string | null;
  creditLimit: unknown;
}

export const creditControlService = {
  /**
   * Live-computed — never a stored "customer balance" column (the core
   * mandate, carried from Phase 7 through here).
   *
   * Includes the opening balance carried over from the old system: a
   * customer already at their limit on migrated debt was previously read
   * as owing nothing, so the credit hold never fired for them.
   */
  async computeLiveOutstanding(companyId: string): Promise<number> {
    return (await partyOutstandingService.customerTotal(companyId)).total;
  },

  async assertInvoiceAllowed(company: CompanyCreditFields, newInvoiceAmount: number, override: boolean): Promise<void> {
    if (company.isBlocked && !override) {
      throw new AppError(
        `Customer "${company.name}" is blocked${company.blockedReason ? `: ${company.blockedReason}` : ''} — requires invoice.override_credit_hold to proceed`,
        409
      );
    }

    const limit = company.creditLimit !== null && company.creditLimit !== undefined ? Number(company.creditLimit) : null;
    if (limit === null) return;

    const currentOutstanding = await creditControlService.computeLiveOutstanding(company.id);
    const projected = currentOutstanding + newInvoiceAmount;
    if (projected > limit && !override) {
      throw new AppError(
        `This invoice would take "${company.name}" to ${projected.toFixed(2)}, over its credit limit of ${limit.toFixed(2)} — requires invoice.override_credit_hold to proceed`,
        409
      );
    }
  },

  async setCreditControl(
    companyId: string,
    input: { creditLimit?: number | null; creditDays?: number | null; isBlocked?: boolean; blockedReason?: string },
    actorId: string
  ) {
    const company = await prisma.company.findFirst({ where: { id: companyId, deletedAt: null } });
    if (!company) throw new AppError('Company not found', 404);

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        creditLimit: input.creditLimit,
        creditDays: input.creditDays,
        isBlocked: input.isBlocked,
        blockedReason: input.isBlocked ? input.blockedReason : null,
        blockedAt: input.isBlocked ? new Date() : null,
        blockedById: input.isBlocked ? actorId : null,
        updatedById: actorId,
      },
    });

    return updated;
  },
};
