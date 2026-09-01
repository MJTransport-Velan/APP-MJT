import { DateRange } from './dateRange';

export interface DateBuckets {
  /** Stable key per bucket, in chronological order. */
  keys: string[];
  /** Axis label per bucket, aligned with `keys`. */
  labels: string[];
  /** Which bucket a record's date falls into, or null if outside the window. */
  keyOf: (date: Date | string) => string | null;
  granularity: 'day' | 'month';
}

const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Above roughly two months a per-day series is unreadable on a dashboard
 * card, so the same chart switches to per-month bars. Two months of days
 * (62) still plots cleanly, which is where the cut-off sits.
 */
const MAX_DAY_BUCKETS = 62;
/**
 * An open-ended From (a To with no From resolves the start to the epoch)
 * would otherwise plot every month since 1970. Keeping the most recent
 * months is the readable half of that window.
 */
const MAX_MONTH_BUCKETS = 36;

/*
 * Buckets are cut on UTC boundaries because the window that selected the
 * rows was (see dateRange.ts). Cutting them locally instead shifts every
 * edge by the server's offset, which both spills an extra bucket past the
 * end of the window and files records into the neighbouring bucket.
 */
function dayKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Splits a From/To window into the chart buckets a dashboard series is
 * summed into. Granularity follows the span rather than being fixed, so
 * "this week" and "this financial year" both produce a readable chart from
 * the same code path.
 */
export function buildDateBuckets(range: Required<DateRange>): DateBuckets {
  const spanDays = Math.floor((range.to.getTime() - range.from.getTime()) / DAY_MS) + 1;
  const granularity: 'day' | 'month' = spanDays <= MAX_DAY_BUCKETS ? 'day' : 'month';

  const keys: string[] = [];
  const labels: string[] = [];

  if (granularity === 'day') {
    const cursor = new Date(Date.UTC(range.from.getUTCFullYear(), range.from.getUTCMonth(), range.from.getUTCDate()));
    while (cursor <= range.to) {
      keys.push(dayKey(cursor));
      labels.push(cursor.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' }));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    const last = Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth(), 1);
    const earliest = Date.UTC(range.from.getUTCFullYear(), range.from.getUTCMonth(), 1);
    const capped = Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth() - (MAX_MONTH_BUCKETS - 1), 1);
    const cursor = new Date(Math.max(earliest, capped));
    while (cursor.getTime() <= last) {
      keys.push(monthKey(cursor));
      labels.push(cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }

  const known = new Set(keys);
  const keyOf = (value: Date | string) => {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const key = granularity === 'day' ? dayKey(d) : monthKey(d);
    return known.has(key) ? key : null;
  };

  return { keys, labels, keyOf, granularity };
}

/** A zeroed accumulator shaped like the buckets, ready to sum into. */
export function zeroSeries(buckets: DateBuckets): Map<string, number> {
  return new Map(buckets.keys.map((k) => [k, 0]));
}

export function seriesValues(buckets: DateBuckets, totals: Map<string, number>, round = true): number[] {
  return buckets.keys.map((k) => {
    const v = totals.get(k) ?? 0;
    return round ? Math.round(v) : v;
  });
}
