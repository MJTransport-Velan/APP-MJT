import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type {
  Intent,
  IntentStats,
  Trip,
  TripStats,
  TripStatusHistoryEntry,
  TripDocument,
  TripExpense,
  TripNote,
  OperationsDashboardSummary,
  PaginationMeta,
  AvailableVehicle,
  AvailableDriver,
  FleetType,
} from '@/types/operations.types';

export const intentApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<Intent[]> & { meta: PaginationMeta }>('/operations/intents', { params });
  },
  stats() {
    return api.get<ApiResponse<IntentStats>>('/operations/intents/stats');
  },
  getById(id: string) {
    return api.get<ApiResponse<Intent>>(`/operations/intents/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<Intent>>('/operations/intents', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<Intent>>(`/operations/intents/${id}`, payload);
  },
  submit(id: string) {
    return api.patch<ApiResponse<Intent>>(`/operations/intents/${id}/submit`);
  },
  approve(id: string, opsAmount: number, fleetType: FleetType) {
    return api.patch<ApiResponse<Intent>>(`/operations/intents/${id}/approve`, { opsAmount, fleetType });
  },
  reject(id: string, rejectionReason: string) {
    return api.patch<ApiResponse<Intent>>(`/operations/intents/${id}/reject`, { rejectionReason });
  },
  cancel(id: string, remarks?: string) {
    return api.patch<ApiResponse<Intent>>(`/operations/intents/${id}/cancel`, { remarks });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/operations/intents/${id}`);
  },
};

export const tripApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<Trip[]> & { meta: PaginationMeta }>('/operations/trips', { params });
  },
  stats() {
    return api.get<ApiResponse<TripStats>>('/operations/trips/stats');
  },
  /** Which trip a vehicle was actually on at a given date/time, if any — lets a form preview the trip (and driver) it's about to auto-attach. */
  activeForVehicle(vehicleId: string, at: string) {
    return api.get<ApiResponse<{ id: string; tripNumber: string; driver: { id: string; name: string; code: string } | null } | null>>(
      '/operations/trips/active-for-vehicle',
      { params: { vehicleId, at } }
    );
  },
  /** The vehicle's current trip, else its last trip — what a FASTag toll usage entry always attaches to; lets the form preview it before submit. */
  currentOrLastForVehicle(vehicleId: string) {
    return api.get<ApiResponse<{ id: string; tripNumber: string; driver: { id: string; name: string; code: string } | null } | null>>(
      '/operations/trips/current-or-last-for-vehicle',
      { params: { vehicleId } }
    );
  },
  getById(id: string) {
    return api.get<ApiResponse<Trip>>(`/operations/trips/${id}`);
  },
  timeline(id: string) {
    return api.get<ApiResponse<TripStatusHistoryEntry[]>>(`/operations/trips/${id}/timeline`);
  },
  availableResources(excludeTripId?: string) {
    return api.get<ApiResponse<{ vehicles: AvailableVehicle[]; drivers: AvailableDriver[] }>>(
      '/operations/trips/available-resources',
      { params: excludeTripId ? { excludeTripId } : {} }
    );
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<Trip>>('/operations/trips', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<Trip>>(`/operations/trips/${id}`, payload);
  },
  assign(id: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<Trip>>(`/operations/trips/${id}/assign`, payload);
  },
  allocate(id: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<Trip>>(`/operations/trips/${id}/allocate`, payload);
  },
  updateStatus(id: string, status: string, notes?: string, additionalCharge?: number) {
    return api.patch<ApiResponse<Trip>>(`/operations/trips/${id}/status`, { status, notes, additionalCharge });
  },
  start(id: string, notes?: string) {
    return api.patch<ApiResponse<Trip>>(`/operations/trips/${id}/start`, { notes });
  },
  complete(id: string, notes?: string) {
    return api.patch<ApiResponse<Trip>>(`/operations/trips/${id}/complete`, { notes });
  },
  cancel(id: string, cancelReason: string) {
    return api.patch<ApiResponse<Trip>>(`/operations/trips/${id}/cancel`, { cancelReason });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/operations/trips/${id}`);
  },
};

export const tripDocumentApi = {
  list(params: { tripId?: string; type?: string } = {}) {
    return api.get<ApiResponse<TripDocument[]>>('/operations/trip-documents', { params });
  },
  upload(tripId: string, type: string, file: File, remarks?: string) {
    const formData = new FormData();
    formData.append('tripId', tripId);
    formData.append('type', type);
    if (remarks) formData.append('remarks', remarks);
    formData.append('file', file);
    return api.post<ApiResponse<TripDocument>>('/operations/trip-documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  verify(id: string, status: 'VERIFIED' | 'REJECTED', remarks?: string) {
    return api.patch<ApiResponse<TripDocument>>(`/operations/trip-documents/${id}/verify`, { status, remarks });
  },
};

export const tripExpenseApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<TripExpense[]> & { meta: PaginationMeta }>('/operations/trip-expenses', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<TripExpense>>(`/operations/trip-expenses/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<TripExpense>>('/operations/trip-expenses', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<TripExpense>>(`/operations/trip-expenses/${id}`, payload);
  },
  uploadBill(id: string, file: File) {
    const formData = new FormData();
    formData.append('billDocument', file);
    return api.post<ApiResponse<TripExpense>>(`/operations/trip-expenses/${id}/bill`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/operations/trip-expenses/${id}`);
  },
};

export const tripNoteApi = {
  list(tripId: string) {
    return api.get<ApiResponse<TripNote[]>>('/operations/trip-notes', { params: { tripId } });
  },
  create(tripId: string, note: string) {
    return api.post<ApiResponse<TripNote>>('/operations/trip-notes', { tripId, note });
  },
};

export const operationsDashboardApi = {
  getSummary(params: Record<string, string> = {}) {
    return api.get<ApiResponse<OperationsDashboardSummary>>('/operations/dashboard', { params });
  },
};
