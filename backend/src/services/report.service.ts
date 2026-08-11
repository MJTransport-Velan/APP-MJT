import { Request, Response } from 'express';
import { ReportCategory } from '../reports/report.types';
import { getReportDefinition, listReportsForCategory, reportRegistry } from '../reports/report.registry';
import { parseReportFilters } from '../utils/reportFilters';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { AppError } from '../middlewares/error.middleware';
import { exportToExcel, exportToCsv, exportToPdf, buildPrintHtml } from '../utils/reportExport';

const MAX_EXPORT_ROWS = 5000;

export const reportService = {
  listAvailable() {
    return (Object.keys(reportRegistry) as ReportCategory[]).map((category) => ({
      category,
      reports: listReportsForCategory(category),
    }));
  },

  async run(category: ReportCategory, req: Request) {
    const reportKey = req.query.report as string;
    const definition = getReportDefinition(category, reportKey);
    if (!definition) {
      throw new AppError(`Unknown ${category} report: ${reportKey}`, 404);
    }

    const filters = parseReportFilters(req.query);
    const { page, pageSize, skip, take } = parsePagination(req.query);

    const { rows, total } = await definition.run(filters, skip, take);

    return {
      label: definition.label,
      columns: definition.columns,
      data: rows,
      meta: buildPaginationMeta(page, pageSize, total),
    };
  },

  async export(res: Response, req: Request) {
    const category = req.query.category as ReportCategory;
    const reportKey = req.query.report as string;
    const format = req.query.format as 'xlsx' | 'pdf' | 'csv' | 'print';

    const definition = getReportDefinition(category, reportKey);
    if (!definition) {
      throw new AppError(`Unknown ${category} report: ${reportKey}`, 404);
    }

    const filters = parseReportFilters(req.query);
    const { rows } = await definition.run(filters, 0, MAX_EXPORT_ROWS);

    if (format === 'xlsx') {
      await exportToExcel(res, definition.label, definition.columns, rows);
      return;
    }
    if (format === 'csv') {
      exportToCsv(res, definition.label, definition.columns, rows);
      return;
    }
    if (format === 'pdf') {
      exportToPdf(res, definition.label, definition.columns, rows);
      return;
    }

    const html = buildPrintHtml(definition.label, definition.columns, rows);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  },
};
