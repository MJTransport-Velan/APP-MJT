import type { PaginationMeta } from './admin.types';

export type ReportCategory = 'operations' | 'fleet' | 'accounts' | 'management';

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportListItem {
  key: string;
  label: string;
  columns: ReportColumn[];
}

export interface ReportCategoryList {
  category: ReportCategory;
  reports: ReportListItem[];
}

export interface ReportRunMeta extends PaginationMeta {
  columns: ReportColumn[];
  label: string;
}

export type ExportFormat = 'xlsx' | 'pdf' | 'csv';

export type { PaginationMeta };
