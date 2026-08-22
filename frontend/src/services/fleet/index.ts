import api from '../api';
import { createMasterApi } from '../masterApiFactory';
import type { ApiResponse } from '@/types/api.types';
import type {
  FleetVehicle,
  VehicleAvailability,
  VehicleTracking,
  VehicleAssignment,
  FuelEntry,
  VehicleFuelSummary,
  FuelSummary,
  DriverMileageRow,
  FuelAdvanceBalance,
  MaintenanceRecord,
  SparePartUsage,
  VehicleExpense,
  FleetDashboardSummary,
  TimelineEvent,
  PaginationMeta,
} from '@/types/fleet.types';

// Fuel Cards & Spare Parts are simple catalogs — reuse the generic factory
// from the Masters module rather than duplicating CRUD service code.
export const fuelCardApi = createMasterApi('/fleet/fuel-cards');
export const sparePartApi = createMasterApi('/fleet/spare-parts');

export const vehicleFleetApi = {
  tracking() {
    return api.get<ApiResponse<VehicleTracking[]>>('/fleet/vehicles/tracking');
  },
  getById(id: string) {
    return api.get<ApiResponse<FleetVehicle>>(`/fleet/vehicles/${id}`);
  },
  availability(id: string) {
    return api.get<ApiResponse<VehicleAvailability>>(`/fleet/vehicles/${id}/availability`);
  },
  timeline(id: string) {
    return api.get<ApiResponse<TimelineEvent[]>>(`/fleet/vehicles/${id}/timeline`);
  },
  setStatus(id: string, status: string) {
    return api.patch<ApiResponse<FleetVehicle>>(`/fleet/vehicles/${id}/status`, { status });
  },
  updateCompliance(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<FleetVehicle>>(`/fleet/vehicles/${id}/compliance`, payload);
  },
  uploadPhoto(id: string, file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post<ApiResponse<FleetVehicle>>(`/fleet/vehicles/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadFitness(id: string, file: File) {
    const formData = new FormData();
    formData.append('fitnessDocument', file);
    return api.post<ApiResponse<FleetVehicle>>(`/fleet/vehicles/${id}/fitness`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadPuc(id: string, file: File) {
    const formData = new FormData();
    formData.append('pucDocument', file);
    return api.post<ApiResponse<FleetVehicle>>(`/fleet/vehicles/${id}/puc`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const vehicleAssignmentApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<VehicleAssignment[]> & { meta: PaginationMeta }>('/fleet/assignments', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<VehicleAssignment>>(`/fleet/assignments/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<VehicleAssignment>>('/fleet/assignments', payload);
  },
  complete(id: string, notes?: string) {
    return api.patch<ApiResponse<VehicleAssignment>>(`/fleet/assignments/${id}/complete`, { notes });
  },
  cancel(id: string) {
    return api.patch<ApiResponse<VehicleAssignment>>(`/fleet/assignments/${id}/cancel`);
  },
  update(id: string, notes?: string) {
    return api.patch<ApiResponse<VehicleAssignment>>(`/fleet/assignments/${id}`, { notes });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/fleet/assignments/${id}`);
  },
};

export const fuelEntryApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<FuelEntry[]> & { meta: PaginationMeta }>('/fleet/fuel-entries', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<FuelEntry>>(`/fleet/fuel-entries/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<FuelEntry>>('/fleet/fuel-entries', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<FuelEntry>>(`/fleet/fuel-entries/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/fleet/fuel-entries/${id}`);
  },
  uploadBill(id: string, file: File) {
    const formData = new FormData();
    formData.append('billDocument', file);
    return api.post<ApiResponse<FuelEntry>>(`/fleet/fuel-entries/${id}/bill`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  vehicleSummary(vehicleId: string, params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<VehicleFuelSummary>>(`/fleet/fuel-entries/vehicle-summary/${vehicleId}`, { params });
  },
  summary(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<FuelSummary>>('/fleet/fuel-entries/summary', { params });
  },
  driverMileage(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<DriverMileageRow[]>>('/fleet/fuel-entries/driver-mileage', { params });
  },
  advanceBalance(advanceId: string) {
    return api.get<ApiResponse<FuelAdvanceBalance>>(`/fleet/fuel-entries/advance-balance/${advanceId}`);
  },
};

export const maintenanceApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<MaintenanceRecord[]> & { meta: PaginationMeta }>('/fleet/maintenance', { params });
  },
  upcomingDue() {
    return api.get<ApiResponse<MaintenanceRecord[]>>('/fleet/maintenance/upcoming-due');
  },
  getById(id: string) {
    return api.get<ApiResponse<MaintenanceRecord>>(`/fleet/maintenance/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<MaintenanceRecord>>('/fleet/maintenance', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<MaintenanceRecord>>(`/fleet/maintenance/${id}`, payload);
  },
  uploadBill(id: string, file: File) {
    const formData = new FormData();
    formData.append('attachment', file);
    return api.post<ApiResponse<MaintenanceRecord>>(`/fleet/maintenance/${id}/bill`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadAccidentPhoto(id: string, file: File) {
    const formData = new FormData();
    formData.append('attachment', file);
    return api.post<ApiResponse<MaintenanceRecord>>(`/fleet/maintenance/${id}/accident-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/fleet/maintenance/${id}`);
  },
};

export const sparePartUsageApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<SparePartUsage[]> & { meta: PaginationMeta }>('/fleet/spare-part-usage', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<SparePartUsage>>(`/fleet/spare-part-usage/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<SparePartUsage>>('/fleet/spare-part-usage', payload);
  },
};

export const vehicleExpenseApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<VehicleExpense[]> & { meta: PaginationMeta }>('/fleet/expenses', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<VehicleExpense>>(`/fleet/expenses/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<VehicleExpense>>('/fleet/expenses', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<VehicleExpense>>(`/fleet/expenses/${id}`, payload);
  },
  uploadBill(id: string, file: File) {
    const formData = new FormData();
    formData.append('billDocument', file);
    return api.post<ApiResponse<VehicleExpense>>(`/fleet/expenses/${id}/bill`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  approve(id: string, payload: Record<string, unknown> = {}) {
    return api.patch<ApiResponse<VehicleExpense>>(`/fleet/expenses/${id}/approve`, payload);
  },
  reject(id: string, reason?: string) {
    return api.patch<ApiResponse<VehicleExpense>>(`/fleet/expenses/${id}/reject`, { reason });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/fleet/expenses/${id}`);
  },
};

export const fleetDashboardApi = {
  getSummary() {
    return api.get<ApiResponse<FleetDashboardSummary>>('/fleet/dashboard');
  },
};
