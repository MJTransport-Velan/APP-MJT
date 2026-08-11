import { ReportFilters } from '../utils/reportFilters';

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportRunResult {
  rows: Record<string, unknown>[];
  total: number;
}

export interface ReportDefinition {
  key: string;
  label: string;
  columns: ReportColumn[];
  /**
   * Executes the report query. `skip`/`take` are only meaningful for
   * list-style reports — summary-style reports (KPI Summary, Monthly/
   * Yearly Business Summary) ignore them and return their fixed row set.
   */
  run: (filters: ReportFilters, skip: number, take: number) => Promise<ReportRunResult>;
}

export type ReportCategory = 'operations' | 'fleet' | 'accounts' | 'management';
