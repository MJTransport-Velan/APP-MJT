import { computed, ref } from 'vue';
import { localDateStr } from '@/utils/format';

export interface DateRangePreset {
  label: string;
  range: () => { from: string; to: string };
}

function shiftDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function startOfMonth(monthOffset = 0): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
}

function endOfMonth(monthOffset = 0): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);
}

/**
 * The Indian financial year containing `date` runs 1 April to 31 March, which
 * is the year every figure in this business is actually reported against.
 */
function financialYear(): { from: Date; to: Date } {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: new Date(startYear, 3, 1), to: new Date(startYear + 1, 2, 31) };
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { label: 'Today', range: () => ({ from: localDateStr(), to: localDateStr() }) },
  { label: 'Last 7 Days', range: () => ({ from: localDateStr(shiftDays(-6)), to: localDateStr() }) },
  { label: 'Last 30 Days', range: () => ({ from: localDateStr(shiftDays(-29)), to: localDateStr() }) },
  { label: 'This Month', range: () => ({ from: localDateStr(startOfMonth()), to: localDateStr() }) },
  { label: 'Last Month', range: () => ({ from: localDateStr(startOfMonth(-1)), to: localDateStr(endOfMonth(-1)) }) },
  {
    label: 'This FY',
    range: () => {
      const fy = financialYear();
      return { from: localDateStr(fy.from), to: localDateStr(fy.to) };
    },
  },
];

export interface UseDateRangeFilterOptions {
  /** Preload a window instead of starting unfiltered. */
  initial?: { from?: string | null; to?: string | null };
  /** Runs whenever the window changes — normally the page's fetch. */
  onChange?: () => void;
}

/**
 * The From/To window shared by every dashboard and report screen.
 *
 * It starts empty on purpose: each backend widget then keeps the period it
 * was already built around ("this month", "today", all-time), so an
 * untouched dashboard shows exactly what it showed before, and the window
 * only takes over once the user picks one.
 */
export function useDateRangeFilter(options: UseDateRangeFilterOptions = {}) {
  const dateFrom = ref<string | null>(options.initial?.from ?? null);
  const dateTo = ref<string | null>(options.initial?.to ?? null);

  // A native date input emits on every edit, so typing a date rather than
  // picking one fires several changes in a row. Settling first keeps that
  // from becoming a burst of dashboard requests, only the last of which
  // was ever going to be shown.
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  function notify(immediate = false) {
    if (settleTimer) clearTimeout(settleTimer);
    if (immediate) {
      options.onChange?.();
      return;
    }
    settleTimer = setTimeout(() => options.onChange?.(), 350);
  }

  const isActive = computed(() => Boolean(dateFrom.value || dateTo.value));

  /** Query params for the API — omitted entirely when no window is set. */
  const params = computed<Record<string, string>>(() => ({
    ...(dateFrom.value ? { dateFrom: dateFrom.value } : {}),
    ...(dateTo.value ? { dateTo: dateTo.value } : {}),
  }));

  function setFrom(value: string) {
    dateFrom.value = value || null;
    notify();
  }

  function setTo(value: string) {
    dateTo.value = value || null;
    notify();
  }

  // A preset or a clear is a single deliberate click — nothing to settle.
  function apply(preset: DateRangePreset) {
    const { from, to } = preset.range();
    dateFrom.value = from;
    dateTo.value = to;
    notify(true);
  }

  function clear() {
    dateFrom.value = null;
    dateTo.value = null;
    notify(true);
  }

  return { dateFrom, dateTo, isActive, params, setFrom, setTo, apply, clear, presets: DATE_RANGE_PRESETS };
}
