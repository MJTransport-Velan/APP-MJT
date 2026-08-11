import api from '../api';
import { createMasterApi } from '../masterApiFactory';
import type { ApiResponse } from '@/types/api.types';

// Companies API is intentionally omitted here — Companies continue to
// be managed via the existing Phase 2 admin-company service
// (@/services/admin-company.service), not duplicated.

export const branchApi = createMasterApi('/masters/branches');
export const locationApi = createMasterApi('/masters/locations');
export const routeApi = createMasterApi('/masters/routes');
export const vehicleTypeApi = createMasterApi('/masters/vehicle-types');
export const vehicleApi = createMasterApi('/masters/vehicles');
export const driverApi = createMasterApi('/masters/drivers');
export const supplierApi = createMasterApi('/masters/suppliers');
export const materialApi = createMasterApi('/masters/materials');
export const expenseCategoryApi = createMasterApi('/masters/expense-categories');
export const fuelStationApi = createMasterApi('/masters/fuel-stations');
export const bankApi = createMasterApi('/masters/banks');
export const paymentModeApi = createMasterApi('/masters/payment-modes');
export const tyreApi = createMasterApi('/masters/tyres');
export const serviceCategoryApi = createMasterApi('/masters/service-categories');
export const trailerTypeApi = createMasterApi('/masters/trailer-types');
export const designationApi = createMasterApi('/masters/designations');
export const gstMasterApi = createMasterApi('/masters/gst-masters');
export const employeeApi = createMasterApi('/masters/employees');

// --- Bespoke document-upload endpoints (not part of the generic factory) ---

export function uploadVehicleDocuments(
  id: string,
  files: { rcDocument?: File; insuranceDocument?: File; permitDocument?: File }
) {
  const formData = new FormData();
  if (files.rcDocument) formData.append('rcDocument', files.rcDocument);
  if (files.insuranceDocument) formData.append('insuranceDocument', files.insuranceDocument);
  if (files.permitDocument) formData.append('permitDocument', files.permitDocument);
  return api.post<ApiResponse<Record<string, unknown>>>(`/masters/vehicles/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function uploadDriverLicense(id: string, file: File) {
  const formData = new FormData();
  formData.append('licenseDocument', file);
  return api.post<ApiResponse<Record<string, unknown>>>(`/masters/drivers/${id}/license`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function uploadSupplierDocument(id: string, file: File) {
  const formData = new FormData();
  formData.append('document', file);
  return api.post<ApiResponse<Record<string, unknown>>>(`/masters/suppliers/${id}/document`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
