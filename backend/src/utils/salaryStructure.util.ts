const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface SalaryComponentLike {
  componentType: string;
  calculationType: string;
  value: unknown;
  isEarning: boolean;
}

export interface SalaryBreakdown {
  /** Sum of every earning component, after evaluating percentages. */
  grossEarnings: number;
  /** Sum of every deduction component, after evaluating percentages. */
  totalDeductions: number;
  /** grossEarnings − totalDeductions. */
  netAmount: number;
}

/**
 * Evaluates a Salary Structure's components into real rupee amounts.
 *
 * `calculationType` exists precisely so a component can be a percentage
 * rather than an amount, but nothing in the backend was evaluating it — every
 * component's raw `value` was summed as if it were rupees, so an HRA of
 * "20 percent of basic" added ₹20 and a PF deduction of "12 percent" took
 * ₹12. A structure of BASIC 30,000 + HRA 20% − PF 12% quoted ₹30,008
 * instead of ₹32,400, and that quote is the figure the salary-entry screen
 * submits, so the miscalculation reached real payments.
 *
 * Order matters: PERCENT_OF_BASIC resolves against the summed BASIC
 * components, and PERCENT_OF_GROSS against the gross of everything that is
 * not itself a percent-of-gross, so the two cannot define each other
 * circularly.
 */
export function computeSalaryBreakdown(components: SalaryComponentLike[]): SalaryBreakdown {
  const val = (c: SalaryComponentLike) => Number(c.value ?? 0);

  const basic = components
    .filter((c) => c.componentType === 'BASIC' && c.calculationType === 'FIXED_AMOUNT')
    .reduce((s, c) => s + val(c), 0);

  const amountOf = (c: SalaryComponentLike, grossBase: number): number => {
    switch (c.calculationType) {
      case 'PERCENT_OF_BASIC':
        return (basic * val(c)) / 100;
      case 'PERCENT_OF_GROSS':
        return (grossBase * val(c)) / 100;
      default:
        return val(c);
    }
  };

  // Everything that isn't itself a percent-of-gross forms the base that
  // percent-of-gross components are measured against.
  const grossBase = components
    .filter((c) => c.isEarning && c.calculationType !== 'PERCENT_OF_GROSS')
    .reduce((s, c) => s + amountOf(c, 0), 0);

  let grossEarnings = 0;
  let totalDeductions = 0;
  for (const c of components) {
    const amount = amountOf(c, grossBase);
    if (c.isEarning) grossEarnings += amount;
    else totalDeductions += amount;
  }

  grossEarnings = round2(grossEarnings);
  totalDeductions = round2(totalDeductions);
  return { grossEarnings, totalDeductions, netAmount: round2(grossEarnings - totalDeductions) };
}
