import api from '../api';
import { createMasterApi } from '../masterApiFactory';
import type { ApiResponse } from '@/types/api.types';
import type {
  BankAccount,
  CashAccount,
  BankTransfer,
  ChequeBook,
  Cheque,
  PettyCashRequest,
  BankingDashboardSummary,
  PaginationMeta,
} from '@/types/banking.types';

export const bankAccountApi = {
  ...createMasterApi<BankAccount>('/accounting/banking/bank-accounts'),
};

export const cashAccountApi = {
  ...createMasterApi<CashAccount>('/accounting/banking/cash-accounts'),
};

export const chequeBookApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<ChequeBook[]>>('/accounting/banking/cheque-books', { params });
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<ChequeBook>>('/accounting/banking/cheque-books', payload);
  },
  nextAvailable(id: string) {
    return api.get<ApiResponse<{ nextNumber: string | null }>>(`/accounting/banking/cheque-books/${id}/next-available`);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<ChequeBook>>(`/accounting/banking/cheque-books/${id}`, payload);
  },
  toggleStatus(id: string) {
    return api.patch<ApiResponse<ChequeBook>>(`/accounting/banking/cheque-books/${id}/status`);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounting/banking/cheque-books/${id}`);
  },
};

export const bankTransferApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<BankTransfer[]> & { meta: PaginationMeta }>('/accounting/banking/transfers', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<BankTransfer>>(`/accounting/banking/transfers/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<BankTransfer>>('/accounting/banking/transfers', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<BankTransfer>>(`/accounting/banking/transfers/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounting/banking/transfers/${id}`);
  },
};

export const chequeApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<Cheque[]> & { meta: PaginationMeta }>('/accounting/banking/cheques', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<Cheque>>(`/accounting/banking/cheques/${id}`);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<Cheque>>(`/accounting/banking/cheques/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounting/banking/cheques/${id}`);
  },
  issue(payload: Record<string, unknown>) {
    return api.post<ApiResponse<Cheque>>('/accounting/banking/cheques/issue', payload);
  },
  receive(payload: Record<string, unknown>) {
    return api.post<ApiResponse<Cheque>>('/accounting/banking/cheques/receive', payload);
  },
  deposit(id: string, payload: Record<string, unknown> = {}) {
    return api.post<ApiResponse<Cheque>>(`/accounting/banking/cheques/${id}/deposit`, payload);
  },
  markPresented(id: string) {
    return api.post<ApiResponse<Cheque>>(`/accounting/banking/cheques/${id}/present`);
  },
  clear(id: string, payload: Record<string, unknown> = {}) {
    return api.post<ApiResponse<Cheque>>(`/accounting/banking/cheques/${id}/clear`, payload);
  },
  bounce(id: string, payload: Record<string, unknown>) {
    return api.post<ApiResponse<Cheque>>(`/accounting/banking/cheques/${id}/bounce`, payload);
  },
  cancel(id: string, reason: string) {
    return api.post<ApiResponse<Cheque>>(`/accounting/banking/cheques/${id}/cancel`, { reason });
  },
  stopPayment(id: string, reason: string) {
    return api.post<ApiResponse<Cheque>>(`/accounting/banking/cheques/${id}/stop-payment`, { reason });
  },
};

export const bankChargeApi = {
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<Record<string, unknown>>>('/accounting/banking/bank-charges', payload);
  },
};

export const interestApi = {
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<Record<string, unknown>>>('/accounting/banking/interest', payload);
  },
};

export const pettyCashRequestApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<PettyCashRequest[]> & { meta: PaginationMeta }>('/accounting/banking/petty-cash/requests', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<PettyCashRequest>>(`/accounting/banking/petty-cash/requests/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<PettyCashRequest>>('/accounting/banking/petty-cash/requests', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<PettyCashRequest>>(`/accounting/banking/petty-cash/requests/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounting/banking/petty-cash/requests/${id}`);
  },
  decide(id: string, decision: 'APPROVED' | 'REJECTED', remarks?: string) {
    return api.post<ApiResponse<PettyCashRequest>>(`/accounting/banking/petty-cash/requests/${id}/decide`, { decision, remarks });
  },
  disburse(id: string, payload: Record<string, unknown>) {
    return api.post<ApiResponse<PettyCashRequest>>(`/accounting/banking/petty-cash/requests/${id}/disburse`, payload);
  },
  close(id: string, payload: Record<string, unknown>) {
    return api.post<ApiResponse<PettyCashRequest>>(`/accounting/banking/petty-cash/requests/${id}/close`, payload);
  },
};

export const bankingDashboardApi = {
  summary(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<BankingDashboardSummary>>('/accounting/banking/dashboard', { params });
  },
};
