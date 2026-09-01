import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type {
  AssetCategory,
  FixedAsset,
  FastTagWallet,
  FastTagTransaction,
  FastTagWalletSummary,
  VehicleCostSummary,
  AssetDashboardSummary,
  PaginationMeta,
} from '@/types/phase6.types';

export const assetCategoryApi = {
  list(isActive?: boolean) {
    return api.get<ApiResponse<AssetCategory[]>>('/accounts/assets/categories', { params: { isActive } });
  },
  getById(id: string) {
    return api.get<ApiResponse<AssetCategory>>(`/accounts/assets/categories/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<AssetCategory>>('/accounts/assets/categories', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<AssetCategory>>(`/accounts/assets/categories/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/assets/categories/${id}`);
  },
};

export const fixedAssetApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<FixedAsset[]> & { meta: PaginationMeta }>('/accounts/assets', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<FixedAsset>>(`/accounts/assets/${id}`);
  },
  register(payload: Record<string, unknown>) {
    return api.post<ApiResponse<FixedAsset>>('/accounts/assets', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<FixedAsset>>(`/accounts/assets/${id}`, payload);
  },
  approve(id: string, fundingLines: Record<string, unknown>[]) {
    return api.patch<ApiResponse<FixedAsset>>(`/accounts/assets/${id}/approve`, { fundingLines });
  },
  reject(id: string, reason?: string) {
    return api.patch<ApiResponse<FixedAsset>>(`/accounts/assets/${id}/reject`, { reason });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/assets/${id}`);
  },
  costSummary(id: string) {
    return api.get<ApiResponse<VehicleCostSummary>>(`/accounts/assets/${id}/cost-summary`);
  },
  dashboard(params: Record<string, string> = {}) {
    return api.get<ApiResponse<AssetDashboardSummary>>('/accounts/assets/dashboard', { params });
  },
};

// The wallet is a fleet-wide singleton — no account id in any of these paths.
export const fastTagApi = {
  getWallet() {
    return api.get<ApiResponse<FastTagWallet>>('/accounts/fasttag-accounts/wallet');
  },
  walletSummary() {
    return api.get<ApiResponse<FastTagWalletSummary>>('/accounts/fasttag-accounts/wallet/summary');
  },
  listTransactions(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<FastTagTransaction[]> & { meta: PaginationMeta }>('/accounts/fasttag-accounts/transactions', { params });
  },
  recharge(payload: Record<string, unknown>) {
    return api.post<ApiResponse<FastTagWallet>>('/accounts/fasttag-accounts/recharge', payload);
  },
  logUsage(payload: Record<string, unknown>) {
    return api.post<ApiResponse<FastTagWallet>>('/accounts/fasttag-accounts/usage', payload);
  },
  refund(payload: Record<string, unknown>) {
    return api.post<ApiResponse<FastTagWallet>>('/accounts/fasttag-accounts/refund', payload);
  },
  adjust(payload: Record<string, unknown>) {
    return api.post<ApiResponse<FastTagWallet>>('/accounts/fasttag-accounts/adjust', payload);
  },
  updateTransaction(transactionId: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<FastTagTransaction>>(`/accounts/fasttag-accounts/transactions/${transactionId}`, payload);
  },
  removeTransaction(transactionId: string) {
    return api.delete<ApiResponse<null>>(`/accounts/fasttag-accounts/transactions/${transactionId}`);
  },
  updateTransactionStatus(transactionId: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<FastTagTransaction>>(`/accounts/fasttag-accounts/transactions/${transactionId}/status`, payload);
  },
  uploadTransactionAttachment(transactionId: string, file: File) {
    const formData = new FormData();
    formData.append('attachment', file);
    return api.post<ApiResponse<FastTagTransaction>>(`/accounts/fasttag-accounts/transactions/${transactionId}/attachment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
