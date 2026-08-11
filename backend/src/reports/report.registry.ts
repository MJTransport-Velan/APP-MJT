import { operationsReportRepository } from '../repositories/operations-report.repository';
import { fleetReportRepository } from '../repositories/fleet-report.repository';
import { accountsReportRepository } from '../repositories/accounts-report.repository';
import { managementReportRepository } from '../repositories/management-report.repository';
import { ReportCategory, ReportDefinition } from './report.types';

export const reportRegistry: Record<ReportCategory, Record<string, ReportDefinition>> = {
  operations: operationsReportRepository,
  fleet: fleetReportRepository,
  accounts: accountsReportRepository,
  management: managementReportRepository,
};

export const REPORT_PERMISSION_BY_CATEGORY: Record<ReportCategory, string> = {
  operations: 'reports.operations',
  fleet: 'reports.fleet',
  accounts: 'reports.accounts',
  management: 'reports.management',
};

export function getReportDefinition(category: ReportCategory, reportKey: string): ReportDefinition | undefined {
  return reportRegistry[category]?.[reportKey];
}

export function listReportsForCategory(category: ReportCategory) {
  return Object.values(reportRegistry[category] || {}).map((r) => ({ key: r.key, label: r.label, columns: r.columns }));
}
