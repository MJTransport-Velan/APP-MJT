/**
 * Loans & EMI dashboard (spec §8). Every figure is computed live from
 * Loan/LoanInstallment — there is no stored metric anywhere, same rule as
 * every other dashboard in this app.
 */
import { Request } from 'express';
import { loanRepository } from '../repositories/loan.repository';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function monthBounds(now: Date) {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

export const loanDashboardService = {
  async get(query: Request['query']) {
    const now = new Date();
    await loanRepository.markOverdue(now);

    const { start: monthStart, end: monthEnd } = monthBounds(now);

    const [loans, installments] = await Promise.all([
      loanRepository.findAllActiveWithInstallments(),
      loanRepository.findInstallmentsForDashboard({
        dateFrom: query.dateFrom ? new Date(`${String(query.dateFrom).slice(0, 10)}T00:00:00.000Z`) : undefined,
        dateTo: query.dateTo ? new Date(`${String(query.dateTo).slice(0, 10)}T23:59:59.999Z`) : undefined,
        vehicleId: (query.vehicleId as string) || undefined,
        loanType: (query.loanType as string) || undefined,
        status: (query.status as string) || undefined,
      }),
    ]);

    let totalOutstanding = 0;
    let totalOriginalAmount = 0;
    let totalOpeningOutstanding = 0;
    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    let totalMonthlyEmi = 0;
    for (const loan of loans) {
      const paid = loan.installments.filter((i) => i.status === 'PAID');
      const principalPaid = paid.reduce((s, i) => s + Number(i.principalComponent), 0);
      totalOutstanding += Math.max(Number(loan.principalAmount) - principalPaid, 0);
      totalPrincipalPaid += principalPaid;
      totalInterestPaid += paid.reduce((s, i) => s + Number(i.interestComponent), 0);
      totalMonthlyEmi += Number(loan.emiAmount);
      // What the lender originally sanctioned: for a loan carried over from
      // the old system that is originalPrincipal, and the balance it came
      // across with is principalAmount.
      totalOriginalAmount += Number(loan.originalPrincipal ?? loan.principalAmount);
      if (loan.origin === 'OPENING') totalOpeningOutstanding += Number(loan.principalAmount);
    }

    const thisMonth = installments.filter((i) => i.dueDate >= monthStart && i.dueDate <= monthEnd);
    const paidThisMonth = thisMonth.filter((i) => i.status === 'PAID');

    const upcoming = installments
      .filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE')
      .slice(0, 25)
      .map((i) => ({
        id: i.id,
        loanId: i.loan.id,
        dueDate: i.dueDate,
        installmentNo: i.installmentNo,
        vehicle: i.loan.vehicle ? i.loan.vehicle.registrationNumber : null,
        loanNumber: i.loan.loanNumber,
        loanName: i.loan.loanName,
        loanType: i.loan.loanType,
        lenderName: i.loan.lenderName,
        emiAmount: Number(i.emiAmount),
        principalComponent: Number(i.principalComponent),
        interestComponent: Number(i.interestComponent),
        status: i.status,
      }));

    const pending = installments.filter((i) => i.status === 'PENDING');
    const overdue = installments.filter((i) => i.status === 'OVERDUE');

    return {
      stats: {
        totalActiveLoans: loans.length,
        totalLoanOutstanding: round2(totalOutstanding),
        totalOriginalLoanAmount: round2(totalOriginalAmount),
        totalOpeningOutstanding: round2(totalOpeningOutstanding),
        totalPrincipalPaid: round2(totalPrincipalPaid),
        totalInterestPaid: round2(totalInterestPaid),
        monthlyEmiCommitment: round2(totalMonthlyEmi),
        thisMonthEmi: round2(thisMonth.reduce((s, i) => s + Number(i.emiAmount), 0)),
        thisMonthPrincipal: round2(thisMonth.reduce((s, i) => s + Number(i.principalComponent), 0)),
        thisMonthInterest: round2(thisMonth.reduce((s, i) => s + Number(i.interestComponent), 0)),
        paidEmiCount: paidThisMonth.length,
        pendingEmiCount: pending.length,
        overdueEmiCount: overdue.length,
        overdueEmiAmount: round2(overdue.reduce((s, i) => s + Number(i.emiAmount), 0)),
        nextEmiDate: upcoming[0]?.dueDate ?? null,
        nextEmiAmount: upcoming[0]?.emiAmount ?? null,
      },
      upcomingEmis: upcoming,
    };
  },
};
