/* Throwaway check for the LR financial-year label. Delete after use. */
import { financialYearLabel } from './repositories/booking.repository';

const cases: [string, string][] = [
  ['2026-04-01T00:00:00', '26-27'], // first day of FY 26-27
  ['2026-08-28T12:00:00', '26-27'], // today
  ['2027-03-31T23:59:00', '26-27'], // last day of FY 26-27
  ['2027-04-01T00:00:00', '27-28'], // rolls over
  ['2026-03-31T23:59:00', '25-26'], // previous FY
  ['2026-04-01T04:00:00', '26-27'], // early morning, local — must not read as March
  ['2030-01-15T09:00:00', '29-30'], // decade boundary
  ['2100-05-01T09:00:00', '00-01'], // century wrap, two-digit label
];

let failed = 0;
for (const [input, expected] of cases) {
  const actual = financialYearLabel(new Date(input));
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${input} -> ${actual} (expected ${expected})`);
}
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
