import { Request } from 'express';

export interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  companyId?: string;
  branchId?: string;
  customerId?: string;
  supplierId?: string;
  vehicleId?: string;
  driverId?: string;
  tripStatus?: string;
  vehicleTypeId?: string;
  paymentStatus?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  year?: number;
  month?: number;
}

/**
 * Parses the common filter set shared across every report (date range,
 * company/branch/customer/supplier/vehicle/driver/route, trip status,
 * vehicle type, payment status, search, sort). Individual report
 * definitions pick whichever of these apply to their query.
 */
export function parseReportFilters(query: Request['query']): ReportFilters {
  return {
    dateFrom: query.dateFrom ? new Date(query.dateFrom as string) : undefined,
    dateTo: query.dateTo ? new Date(query.dateTo as string) : undefined,
    companyId: (query.companyId as string) || undefined,
    branchId: (query.branchId as string) || undefined,
    customerId: (query.customerId as string) || (query.companyId as string) || undefined,
    supplierId: (query.supplierId as string) || undefined,
    vehicleId: (query.vehicleId as string) || undefined,
    driverId: (query.driverId as string) || undefined,
    tripStatus: (query.tripStatus as string) || undefined,
    vehicleTypeId: (query.vehicleTypeId as string) || undefined,
    paymentStatus: (query.paymentStatus as string) || undefined,
    search: (query.search as string) || undefined,
    sortBy: (query.sortBy as string) || undefined,
    sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
    year: query.year ? parseInt(query.year as string, 10) : undefined,
    month: query.month ? parseInt(query.month as string, 10) : undefined,
  };
}

export function dateRangeWhere(field: string, filters: ReportFilters) {
  if (!filters.dateFrom && !filters.dateTo) return {};
  // dateTo arrives as a date-only value (parsed as UTC midnight, per the
  // YYYY-MM-DD spec) — without pushing it to the end of that day, `lte`
  // would exclude every record from "dateTo" itself except one at exactly
  // 00:00:00.000. Push to 23:59:59.999 UTC so the whole day is inclusive.
  let dateTo: Date | undefined;
  if (filters.dateTo) {
    dateTo = new Date(filters.dateTo);
    dateTo.setUTCHours(23, 59, 59, 999);
  }
  return {
    [field]: {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    },
  };
}
