import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type {
  Invoice,
  Receipt,
  SupplierBill,
  SupplierPayment,
  TripFinancialLine,
  VehicleProfitLine,
  SupplierProfitLine,
  CustomerProfitLine,
  AccountsDashboardSummary,
  AccountsDashboardTrends,
  CreditControl,
  CollectionActivity,
  PaginationMeta,
} from '@/types/accounts.types';

export const invoiceApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<Invoice[]> & { meta: PaginationMeta }>('/accounts/invoices', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<Invoice>>(`/accounts/invoices/${id}`);
  },
  generate(payload: Record<string, unknown>) {
    return api.post<ApiResponse<Invoice>>('/accounts/invoices', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<Invoice>>(`/accounts/invoices/${id}`, payload);
  },
  send(id: string) {
    return api.patch<ApiResponse<Invoice>>(`/accounts/invoices/${id}/send`);
  },
  cancel(id: string) {
    return api.patch<ApiResponse<Invoice>>(`/accounts/invoices/${id}/cancel`);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/invoices/${id}`);
  },
  addCreditNote(id: string, payload: Record<string, unknown>) {
    return api.post<ApiResponse<Invoice>>(`/accounts/invoices/${id}/credit-notes`, payload);
  },
  addDebitNote(id: string, payload: Record<string, unknown>) {
    return api.post<ApiResponse<Invoice>>(`/accounts/invoices/${id}/debit-notes`, payload);
  },
};

export const receiptApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<Receipt[]> & { meta: PaginationMeta }>('/accounts/receipts', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<Receipt>>(`/accounts/receipts/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<Receipt>>('/accounts/receipts', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<Receipt>>(`/accounts/receipts/${id}`, payload);
  },
  allocate(id: string, invoiceId: string) {
    return api.patch<ApiResponse<Receipt>>(`/accounts/receipts/${id}/allocate`, { invoiceId });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/receipts/${id}`);
  },
};

export const supplierBillApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<SupplierBill[]> & { meta: PaginationMeta }>('/accounts/supplier-bills', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<SupplierBill>>(`/accounts/supplier-bills/${id}`);
  },
  generate(payload: Record<string, unknown>) {
    return api.post<ApiResponse<SupplierBill>>('/accounts/supplier-bills', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<SupplierBill>>(`/accounts/supplier-bills/${id}`, payload);
  },
  cancel(id: string) {
    return api.patch<ApiResponse<SupplierBill>>(`/accounts/supplier-bills/${id}/cancel`);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/supplier-bills/${id}`);
  },
  addCreditNote(id: string, payload: Record<string, unknown>) {
    return api.post<ApiResponse<SupplierBill>>(`/accounts/supplier-bills/${id}/credit-notes`, payload);
  },
  addDebitNote(id: string, payload: Record<string, unknown>) {
    return api.post<ApiResponse<SupplierBill>>(`/accounts/supplier-bills/${id}/debit-notes`, payload);
  },
};

export const supplierPaymentApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<SupplierPayment[]> & { meta: PaginationMeta }>('/accounts/supplier-payments', {
      params,
    });
  },
  getById(id: string) {
    return api.get<ApiResponse<SupplierPayment>>(`/accounts/supplier-payments/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<SupplierPayment>>('/accounts/supplier-payments', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<SupplierPayment>>(`/accounts/supplier-payments/${id}`, payload);
  },
  allocate(id: string, billId: string) {
    return api.patch<ApiResponse<SupplierPayment>>(`/accounts/supplier-payments/${id}/allocate`, { billId });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/supplier-payments/${id}`);
  },
};

export const tripFinancialApi = {
  getForTrip(tripId: string) {
    return api.get<ApiResponse<TripFinancialLine>>(`/accounts/trip-financials/${tripId}`);
  },
  vehicleWise(params: { from?: string; to?: string } = {}) {
    return api.get<ApiResponse<VehicleProfitLine[]>>('/accounts/trip-financials/vehicle-wise', { params });
  },
  supplierWise(params: { from?: string; to?: string } = {}) {
    return api.get<ApiResponse<SupplierProfitLine[]>>('/accounts/trip-financials/supplier-wise', { params });
  },
  customerWise(params: { from?: string; to?: string } = {}) {
    return api.get<ApiResponse<CustomerProfitLine[]>>('/accounts/trip-financials/customer-wise', { params });
  },
};

export const accountsDashboardApi = {
  getSummary() {
    return api.get<ApiResponse<AccountsDashboardSummary>>('/accounts/dashboard');
  },
  getTrends(params: { monthsBack?: number; monthsAhead?: number } = {}) {
    return api.get<ApiResponse<AccountsDashboardTrends>>('/accounts/dashboard/trends', { params });
  },
};

export const creditControlApi = {
  get(companyId: string) {
    return api.get<ApiResponse<CreditControl>>(`/accounts/companies/${companyId}/credit-control`);
  },
  set(companyId: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<CreditControl>>(`/accounts/companies/${companyId}/credit-control`, payload);
  },
};

export const collectionActivityApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<CollectionActivity[]> & { meta: PaginationMeta }>('/accounts/collections', { params });
  },
  upcoming(days = 3) {
    return api.get<ApiResponse<CollectionActivity[]>>('/accounts/collections/upcoming', { params: { days } });
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<CollectionActivity>>('/accounts/collections', payload);
  },
};
