import { defineStore } from 'pinia';
import { reportsApi } from '@/services/reports';
import type { ReportCategory, ReportListItem, ReportColumn, PaginationMeta } from '@/types/reports.types';

/**
 * Generic report store factory — every category's store is identical in
 * shape (available reports for the picker + the currently-loaded report's
 * rows/columns/pagination). Mirrors the masterStoreFactory pattern used
 * throughout Masters/Fleet/Operations/Accounts.
 */
export function createReportStore(storeId: string, category: ReportCategory) {
  return defineStore(storeId, {
    state: () => ({
      availableReports: [] as ReportListItem[],
      columns: [] as ReportColumn[],
      label: '',
      rows: [] as Record<string, unknown>[],
      meta: null as PaginationMeta | null,
      loading: false,
    }),

    actions: {
      async fetchAvailable() {
        const response = await reportsApi.listAvailable();
        const match = response.data.data.find((c) => c.category === category);
        this.availableReports = match?.reports || [];
      },

      async run(params: Record<string, unknown>) {
        this.loading = true;
        try {
          const response = await reportsApi.run(category, params);
          this.rows = response.data.data;
          this.columns = response.data.meta.columns;
          this.label = response.data.meta.label;
          this.meta = {
            page: response.data.meta.page,
            pageSize: response.data.meta.pageSize,
            total: response.data.meta.total,
            totalPages: response.data.meta.totalPages,
          };
        } finally {
          this.loading = false;
        }
      },

      async exportFile(reportKey: string, format: 'xlsx' | 'pdf' | 'csv', filters: Record<string, unknown>) {
        await reportsApi.exportFile(category, reportKey, format, filters);
      },

      async printReport(reportKey: string, filters: Record<string, unknown>) {
        await reportsApi.openPrintView(category, reportKey, filters);
      },
    },
  });
}
