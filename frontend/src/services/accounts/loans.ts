import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type { Loan, LoanDashboard, PaginationMeta } from '@/types/loans.types';

export const loanApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<Loan[]> & { meta: PaginationMeta }>('/accounts/loans', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<Loan>>(`/accounts/loans/${id}`);
  },
  dashboard(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<LoanDashboard>>('/accounts/loans/dashboard', { params });
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<Loan>>('/accounts/loans', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<Loan>>(`/accounts/loans/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/loans/${id}`);
  },
  // Paying an EMI is what moves money: the server debits the fund account,
  // reduces the loan outstanding and writes the Financial Entry itself.
  payEmi(loanId: string, installmentId: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<Loan>>(`/accounts/loans/${loanId}/installments/${installmentId}/pay`, payload);
  },
  reverseEmi(loanId: string, installmentId: string) {
    return api.patch<ApiResponse<Loan>>(`/accounts/loans/${loanId}/installments/${installmentId}/reverse`);
  },
};
