import { Request } from 'express';
import { driverLoanService } from './driver-loan.service';
import { employeeLoanService } from './employee-loan.service';
import { vehicleLoanService } from './vehicle-loan.service';

/**
 * Combines the three loan books this ERP already tracks end-to-end
 * (Driver/Employee — flat-principal, Phase 5; Vehicle — reducing-balance,
 * Phase 6) into one consolidated view, reusing each module's own
 * serialize()/outstandingPrincipal computation rather than re-deriving the
 * math a second time (design doc §Loan Reports).
 */
function isOverdue(nextDueDate: string | Date | null | undefined): boolean {
  if (!nextDueDate) return false;
  return new Date(nextDueDate).getTime() < Date.now();
}

export const loanReportService = {
  async summary(query: Request['query']) {
    const listQuery = { page: '1', pageSize: '500', status: (query.status as string) || 'ACTIVE' } as unknown as Request['query'];
    const [driverLoans, employeeLoans, vehicleLoans] = await Promise.all([
      driverLoanService.list(listQuery),
      employeeLoanService.list(listQuery),
      vehicleLoanService.list(listQuery),
    ]);

    const rows = [
      ...driverLoans.data.map((l: any) => ({
        category: 'DRIVER' as const,
        loanNumber: l.loanNumber,
        borrower: l.driver.name,
        principalAmount: Number(l.principalAmount),
        emiAmount: Number(l.emiAmount),
        outstandingPrincipal: Number(l.outstandingPrincipal),
        status: l.status,
        nextDueDate: l.installments.find((i: any) => i.status === 'PENDING')?.dueDate ?? null,
      })),
      ...employeeLoans.data.map((l: any) => ({
        category: 'EMPLOYEE' as const,
        loanNumber: l.loanNumber,
        borrower: l.employee.name,
        principalAmount: Number(l.principalAmount),
        emiAmount: Number(l.emiAmount),
        outstandingPrincipal: Number(l.outstandingPrincipal),
        status: l.status,
        nextDueDate: l.installments.find((i: any) => i.status === 'PENDING')?.dueDate ?? null,
      })),
      ...vehicleLoans.data.map((l: any) => ({
        category: 'VEHICLE' as const,
        loanNumber: l.loanNumber,
        borrower: l.vehicle.registrationNumber,
        principalAmount: Number(l.principalAmount),
        emiAmount: Number(l.emiAmount),
        outstandingPrincipal: Number(l.outstandingPrincipal),
        status: l.status,
        nextDueDate: l.installments.find((i: any) => i.status === 'PENDING' || i.status === 'OVERDUE')?.dueDate ?? null,
      })),
    ].map((r) => ({ ...r, isOverdue: isOverdue(r.nextDueDate) }));

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
