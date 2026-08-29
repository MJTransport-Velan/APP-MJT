import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type { PaginationMeta } from '@/types/phase6.types';
import type { LoanGiven, LoanGivenSummary } from '@/types/loansGiven.types';

export const loanGivenApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<LoanGiven[]> & { meta: PaginationMeta }>('/accounts/loans-given', { params });
  },
  summary() {
    return api.get<ApiResponse<LoanGivenSummary>>('/accounts/loans-given/summary');
  },
  getById(id: string) {
    return api.get<ApiResponse<LoanGiven>>(`/accounts/loans-given/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<LoanGiven>>('/accounts/loans-given', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<LoanGiven>>(`/accounts/loans-given/${id}`, payload);
  },
  // Money coming back credits the Bank/Cash account named on the repayment —
  // it does not have to be the one the money left from.
  recordRepayment(id: string, payload: Record<string, unknown>) {
    return api.post<ApiResponse<LoanGiven>>(`/accounts/loans-given/${id}/repayments`, payload);
  },
  removeRepayment(id: string, repaymentId: string) {
    return api.delete<ApiResponse<LoanGiven>>(`/accounts/loans-given/${id}/repayments/${repaymentId}`);
  },
  writeOff(id: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<LoanGiven>>(`/accounts/loans-given/${id}/write-off`, payload);
  },
  reopen(id: string) {
    return api.patch<ApiResponse<LoanGiven>>(`/accounts/loans-given/${id}/reopen`);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/loans-given/${id}`);
  },
};
