import { Request } from 'express';
import { vehicleLoanService } from './vehicle-loan.service';

/**
 * Reports on the Vehicle Loan book (Phase 6, reducing-balance), reusing its
 * own serialize()/outstandingPrincipal computation rather than re-deriving
 * the math a second time (design doc §Loan Reports). Driver/Employee loans
 * were removed from the product entirely — this report used to combine all
 * three loan books, now it's vehicle-only.
 */
function isOverdue(nextDueDate: string | Date | null | undefined): boolean {
  if (!nextDueDate) return false;
  return new Date(nextDueDate).getTime() < Date.now();
}

export const loanReportService = {
  async summary(query: Request['query']) {
    const listQuery = { page: '1', pageSize: '500', status: (query.status as string) || 'ACTIVE' } as unknown as Request['query'];
    const vehicleLoans = await vehicleLoanService.list(listQuery);

    const rows = vehicleLoans.data
      .map((l: any) => ({
        category: 'VEHICLE' as const,
        loanNumber: l.loanNumber,
        borrower: l.vehicle.registrationNumber,
        principalAmount: Number(l.principalAmount),
        emiAmount: Number(l.emiAmount),
        outstandingPrincipal: Number(l.outstandingPrincipal),
        status: l.status,
        nextDueDate: l.installments.find((i: any) => i.status === 'PENDING' || i.status === 'OVERDUE')?.dueDate ?? null,
      }))
      .map((r) => ({ ...r, isOverdue: isOverdue(r.nextDueDate) }));

    return {
      rows: rows.sort((a, b) => b.outstandingPrincipal - a.outstandingPrincipal),
      totals: {
        principalAmount: Math.round(rows.reduce((s, r) => s + r.principalAmount, 0) * 100) / 100,
        outstandingPrincipal: Math.round(rows.reduce((s, r) => s + r.outstandingPrincipal, 0) * 100) / 100,
        overdueCount: rows.filter((r) => r.isOverdue).length,
      },
    };
  },
};
