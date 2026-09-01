import { Request } from 'express';
import { DateRange, rangeWhere } from './dateRange';

export interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  companyId?: string;
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
 * company/customer/supplier/vehicle/driver/route, trip status,
 * vehicle type, payment status, search, sort). Individual report
 * definitions pick whichever of these apply to their query.
 */
export function parseReportFilters(query: Request['query']): ReportFilters {
  return {
    dateFrom: query.dateFrom ? new Date(query.dateFrom as string) : undefined,
    dateTo: query.dateTo ? new Date(query.dateTo as string) : undefined,
    companyId: (query.companyId as string) || undefined,
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
  return rangeWhere(field, toDateRange(filters));
}

/**
 * The report filter set carries `dateTo` as parsed (UTC midnight for a
 * date-only value); the shared range type carries it already widened to the
 * end of that day. Converting here keeps one implementation of the
 * inclusive-To rule in dateRange.ts.
 */
export function toDateRange(filters: ReportFilters): DateRange {
  let to: Date | undefined;
  if (filters.dateTo) {
    to = new Date(filters.dateTo);
    to.setUTCHours(23, 59, 59, 999);
  }
  return { from: filters.dateFrom, to };
}
