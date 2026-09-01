import { Request } from 'express';

/**
 * The From/To window every dashboard and report is filtered by. `to` is
 * always stored already pushed to the last millisecond of its day, so a
 * `lte` comparison includes the whole of the To day rather than only a
 * record stamped exactly 00:00:00.000.
 */
export interface DateRange {
  from?: Date;
  to?: Date;
}

/** Whether either end of the window was supplied. */
export function hasRange(range: DateRange): boolean {
  return Boolean(range.from || range.to);
}

/**
 * A date-only value ("2026-08-31") parses as UTC midnight per the
 * YYYY-MM-DD spec. Ends of the window therefore have to be widened
 * explicitly or the From day starts late / the To day is cut short.
 */
function startOfDay(value: string): Date | undefined {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value: string): Date | undefined {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Reads the shared `dateFrom`/`dateTo` query pair. `from`/`to` are accepted
 * as aliases because several finance screens (Profit & Loss, Driver
 * Statement, Profitability) already call their params that way.
 *
 * A From later than a To is swapped rather than rejected — every consumer
 * is a read-only aggregation, so the user simply sees the window they
 * plainly meant instead of an empty screen.
 */
export function parseDateRange(query: Request['query']): DateRange {
  let rawFrom = (query.dateFrom ?? query.from) as string | undefined;
  let rawTo = (query.dateTo ?? query.to) as string | undefined;

  // Swap before widening, not after: widening first would leave From sitting
  // at the end of its day and To at the start of its day, so the window
  // would miss most of both.
  if (rawFrom && rawTo && new Date(String(rawFrom)) > new Date(String(rawTo))) {
    [rawFrom, rawTo] = [rawTo, rawFrom];
  }

  const from = rawFrom ? startOfDay(String(rawFrom)) : undefined;
  const to = rawTo ? endOfDay(String(rawTo)) : undefined;
  return { from, to };
}

/**
 * A Prisma `where` fragment scoping `field` to the window — `{}` when
 * neither end was given, so callers can spread it unconditionally and an
 * unfiltered dashboard keeps its existing all-time behaviour.
 */
export function rangeWhere(field: string, range: DateRange): Record<string, unknown> {
  if (!hasRange(range)) return {};
  return {
    [field]: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    },
  };
}

/**
 * The window a dashboard should actually aggregate over. Dashboards that
 * previously reported "this month" or "today" keep doing so when the user
 * has not picked a range, so an untouched screen shows what it always did.
 */
export function resolveRange(range: DateRange, fallback: () => DateRange): Required<DateRange> {
  const base = hasRange(range) ? range : fallback();
  return {
    from: base.from ?? new Date(0),
    to: base.to ?? endOfToday(),
  };
}

/**
 * Today and this month are measured in UTC, matching the UTC day boundaries
 * parseDateRange puts on a picked window — mixing the two would leave the
 * filtered and unfiltered views of the same screen disagreeing by the
 * server's offset. It also matches how a date-only field is stored: an
 * entry dated "31 July" is UTC midnight on the 31st, and a local-time month
 * boundary would file it under August.
 */
export function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export function startOfThisMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Start of the UTC month `monthsBack` months before the current one. */
export function startOfMonthsAgo(monthsBack: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1));
}

/** Start of the UTC day `daysBack` days before today. */
export function startOfDaysAgo(daysBack: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d;
}

/** "This month so far" — the default period for money figures on dashboards. */
export function currentMonthRange(): DateRange {
  return { from: startOfThisMonth(), to: endOfToday() };
}

/** "Today" — the default period for the day's collection/payment tiles. */
export function todayRange(): DateRange {
  return { from: startOfToday(), to: endOfToday() };
}
