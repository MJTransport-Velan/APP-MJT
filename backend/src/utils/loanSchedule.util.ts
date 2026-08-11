/**
 * Shared EMI-schedule calculator for DriverLoan and EmployeeLoan — schema
 * layer keeps the two tables separate (design doc §14), but the
 * calculation is written once and consumed by both loan services rather
 * than duplicated. interestRate is currently always 0 (flat-principal
 * split, last installment absorbs the rounding remainder); the column
 * exists on both loan tables so interest math can be added later without
 * a breaking schema change.
 */
export interface LoanInstallmentPlan {
  installmentNo: number;
  dueDate: Date;
  emiAmount: number;
}

export function calculateEmiAmount(principal: number, tenureMonths: number): number {
  if (tenureMonths <= 0) throw new Error('Tenure must be at least 1 month');
  return Math.round((principal / tenureMonths) * 100) / 100;
}

export function generateEmiSchedule(principal: number, tenureMonths: number, emiAmount: number, startDate: Date): LoanInstallmentPlan[] {
  const schedule: LoanInstallmentPlan[] = [];
  let remaining = Math.round(principal * 100) / 100;

  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const isLast = i === tenureMonths;
    const amount = isLast ? Math.round(remaining * 100) / 100 : emiAmount;
    remaining = Math.round((remaining - amount) * 100) / 100;

    schedule.push({ installmentNo: i, dueDate, emiAmount: amount });
  }

  return schedule;
}
