import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type {
  AssetCategory,
  FixedAsset,
  VehicleLoan,
  VehicleTyre,
  VehicleBattery,
  VehicleComplianceRecord,
  FastTagWallet,
  FastTagTransaction,
  FastTagWalletSummary,
  AssetTransfer,
  AssetDisposal,
  DepreciationRun,
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
  dashboard() {
    return api.get<ApiResponse<AssetDashboardSummary>>('/accounts/assets/dashboard');
  },
};

export const vehicleLoanApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<VehicleLoan[]> & { meta: PaginationMeta }>('/accounts/vehicle-loans', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<VehicleLoan>>(`/accounts/vehicle-loans/${id}`);
  },
  request(payload: Record<string, unknown>) {
    return api.post<ApiResponse<VehicleLoan>>('/accounts/vehicle-loans', payload);
  },
  approve(id: string) {
    return api.patch<ApiResponse<VehicleLoan>>(`/accounts/vehicle-loans/${id}/approve`);
  },
  reject(id: string, reason?: string) {
    return api.patch<ApiResponse<VehicleLoan>>(`/accounts/vehicle-loans/${id}/reject`, { reason });
  },
  disburse(id: string, payload: Record<string, unknown>) {
    return api.post<ApiResponse<VehicleLoan>>(`/accounts/vehicle-loans/${id}/disbursements`, payload);
  },
  payInstallment(id: string, installmentId: string, payload: Record<string, unknown> = {}) {
    return api.patch<ApiResponse<VehicleLoan>>(`/accounts/vehicle-loans/${id}/installments/${installmentId}/pay`, payload);
  },
  foreclose(id: string, payload: Record<string, unknown> = {}) {
    return api.patch<ApiResponse<VehicleLoan>>(`/accounts/vehicle-loans/${id}/foreclose`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/vehicle-loans/${id}`);
  },
};

export const vehicleTyreApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<VehicleTyre[]> & { meta: PaginationMeta }>('/accounts/vehicle-tyres', { params });
  },
  install(payload: Record<string, unknown>) {
    return api.post<ApiResponse<VehicleTyre>>('/accounts/vehicle-tyres', payload);
  },
  rotate(id: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<VehicleTyre>>(`/accounts/vehicle-tyres/${id}/rotate`, payload);
  },
  remove(id: string, payload: Record<string, unknown> = {}) {
    return api.patch<ApiResponse<VehicleTyre>>(`/accounts/vehicle-tyres/${id}/remove`, payload);
  },
  scrap(id: string) {
    return api.patch<ApiResponse<VehicleTyre>>(`/accounts/vehicle-tyres/${id}/scrap`);
  },
};

export const vehicleBatteryApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<VehicleBattery[]> & { meta: PaginationMeta }>('/accounts/vehicle-batteries', { params });
  },
  install(payload: Record<string, unknown>) {
    return api.post<ApiResponse<VehicleBattery>>('/accounts/vehicle-batteries', payload);
  },
  dispose(id: string) {
    return api.patch<ApiResponse<VehicleBattery>>(`/accounts/vehicle-batteries/${id}/dispose`);
  },
};

export const vehicleComplianceApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<VehicleComplianceRecord[]> & { meta: PaginationMeta }>('/accounts/vehicle-compliance', { params });
  },
  expiringWithin(days = 30) {
    return api.get<ApiResponse<VehicleComplianceRecord[]>>('/accounts/vehicle-compliance/expiring', { params: { days } });
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<VehicleComplianceRecord>>('/accounts/vehicle-compliance', payload);
  },
  fileClaim(id: string, payload: Record<string, unknown>) {
    return api.post<ApiResponse<VehicleComplianceRecord>>(`/accounts/vehicle-compliance/${id}/claims`, payload);
  },
  settleClaim(claimId: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<VehicleComplianceRecord>>(`/accounts/vehicle-compliance/claims/${claimId}`, payload);
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

export const assetTransferApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<AssetTransfer[]> & { meta: PaginationMeta }>('/accounts/assets/transfers', { params });
  },
  request(payload: Record<string, unknown>) {
    return api.post<ApiResponse<AssetTransfer>>('/accounts/assets/transfers', payload);
  },
  approve(id: string) {
    return api.patch<ApiResponse<AssetTransfer>>(`/accounts/assets/transfers/${id}/approve`);
  },
  reject(id: string, reason?: string) {
    return api.patch<ApiResponse<AssetTransfer>>(`/accounts/assets/transfers/${id}/reject`, { reason });
  },
};

export const assetDisposalApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<AssetDisposal[]> & { meta: PaginationMeta }>('/accounts/assets/disposals', { params });
  },
  raise(payload: Record<string, unknown>) {
    return api.post<ApiResponse<AssetDisposal>>('/accounts/assets/disposals', payload);
  },
  approve(id: string, payload: Record<string, unknown> = {}) {
    return api.patch<ApiResponse<AssetDisposal>>(`/accounts/assets/disposals/${id}/approve`, payload);
  },
  reject(id: string, reason?: string) {
    return api.patch<ApiResponse<AssetDisposal>>(`/accounts/assets/disposals/${id}/reject`, { reason });
  },
};

export const depreciationRunApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<DepreciationRun[]> & { meta: PaginationMeta }>('/accounts/depreciation/runs', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<DepreciationRun>>(`/accounts/depreciation/runs/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<DepreciationRun>>('/accounts/depreciation/runs', payload);
  },
  calculate(id: string) {
    return api.post<ApiResponse<DepreciationRun>>(`/accounts/depreciation/runs/${id}/calculate`);
  },
  approve(id: string) {
    return api.patch<ApiResponse<DepreciationRun>>(`/accounts/depreciation/runs/${id}/approve`);
  },
};
