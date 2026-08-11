import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type { ReportCategory, ReportCategoryList, ReportRunMeta, ExportFormat } from '@/types/reports.types';

export const reportsApi = {
  listAvailable() {
    return api.get<ApiResponse<ReportCategoryList[]>>('/reports');
  },
  run(category: ReportCategory, params: Record<string, unknown>) {
    return api.get<ApiResponse<Record<string, unknown>[]> & { meta: ReportRunMeta }>(`/reports/${category}`, {
      params,
    });
  },
  async exportFile(
    category: ReportCategory,
    report: string,
    format: ExportFormat,
    filters: Record<string, unknown>
  ) {
    const response = await api.get('/reports/export', {
      params: { category, report, format, ...filters },
      responseType: 'blob',
    });

    const disposition = response.headers['content-disposition'] as string | undefined;
    const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch?.[1] || `${report}.${format}`;

    const url = window.URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  async openPrintView(category: ReportCategory, report: string, filters: Record<string, unknown>) {
    const response = await api.get<string>('/reports/export', {
      params: { category, report, format: 'print', ...filters },
      responseType: 'text',
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(response.data);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  },
};
