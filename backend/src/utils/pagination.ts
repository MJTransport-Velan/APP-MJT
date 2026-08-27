import { Request } from 'express';

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 10;
/**
 * Dropdown/option loaders across the app fetch a whole master in one shot
 * (`pageSize: 200`, and 5000 for the client-side-filtered trip/booking/intent
 * lists). A cap of 100 silently truncated every one of them — e.g. only 100 of
 * the 134 suppliers ever reached the supplier dropdowns — so the ceiling has to
 * clear the largest deliberate full-load, not the largest comfortable table page.
 */
const MAX_PAGE_SIZE = 5000;

export function parsePagination(query: Request['query']): PaginationParams {
  const rawPage = parseInt((query.page as string) || '1', 10);
  const rawPageSize = parseInt((query.pageSize as string) || String(DEFAULT_PAGE_SIZE), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(rawPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function buildPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}
