/**
 * Reducing-balance EMI calculator, shared by every Loan type (Vehicle /
 * Bank / Business / Owner / Other). Each installment's interest is
 * computed on the outstanding balance at that point, not a fixed split,
 * so the schedule matches what a bank's own amortization table shows.
 *
 * A 0% loan (common for an interest-free Owner Loan) degrades to a plain
 * equal-principal split rather than dividing by zero.
 */
export interface LoanInstallmentPlan {
  installmentNo: number;
  dueDate: Date;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
}

/** Standard EMI formula: P × r × (1+r)^n / ((1+r)^n − 1), r = monthly rate. */
export function calculateEmi(principal: number, annualRatePercent: number, tenureMonths: number): number {
  if (tenureMonths <= 0) throw new Error('Tenure must be at least 1 month');
  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate === 0) return Math.round((principal / tenureMonths) * 100) / 100;

  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi * 100) / 100;
}

export function generateLoanSchedule(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
  emiAmount: number,
  startDate: Date
): LoanInstallmentPlan[] {
  const monthlyRate = annualRatePercent / 12 / 100;
  const schedule: LoanInstallmentPlan[] = [];
  let outstanding = Math.round(principal * 100) / 100;

  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));

    const interestComponent = Math.round(outstanding * monthlyRate * 100) / 100;
    const isLast = i === tenureMonths;
    let principalComponent = Math.round((emiAmount - interestComponent) * 100) / 100;
    let installmentEmi = emiAmount;

    if (isLast || principalComponent > outstanding) {
      // Last installment (or a rounding overshoot) settles the exact
      // remaining balance rather than the nominal EMI, so the schedule
      // always fully amortizes to zero.
      principalComponent = outstanding;
      installmentEmi = Math.round((principalComponent + interestComponent) * 100) / 100;
    }

    outstanding = Math.round((outstanding - principalComponent) * 100) / 100;
    schedule.push({ installmentNo: i, dueDate, emiAmount: installmentEmi, principalComponent, interestComponent });

    if (outstanding <= 0) break;
  }

  return schedule;
}
