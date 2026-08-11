/**
 * Ordinary least-squares over evenly-spaced points (x = 0..n-1) — the
 * simplest honest STATISTICAL forecasting method, matching the AiInsight
 * schema's method enum (STATISTICAL vs future ML/LLM). Returns the fitted
 * slope/intercept plus the next `periodsAhead` projected values.
 */
export function linearForecast(values: number[], periodsAhead: number): { slope: number; intercept: number; forecast: number[]; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, forecast: Array(periodsAhead).fill(values[0] ?? 0), r2: 0 };

  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = values.reduce((s, y) => s + y, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (values[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  const forecast = Array.from({ length: periodsAhead }, (_, k) => Math.round((slope * (n + k) + intercept) * 100) / 100);
  return { slope, intercept, forecast, r2 };
}
