import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type {
  Booking,
  BookingStats,
  AssignVehiclePayload,
  CounterBookingPayload,
  DeliveryStatus,
  PaginationMeta,
} from '@/types/bookings.types';

export const bookingApi = {
  /** Counter entry — a booking keyed in by staff rather than the website. */
  create(payload: CounterBookingPayload) {
    return api.post<ApiResponse<Booking>>('/bookings', payload);
  },
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<Booking[]> & { meta: PaginationMeta }>('/bookings', { params });
  },
  stats() {
    return api.get<ApiResponse<BookingStats>>('/bookings/stats');
  },
  getById(id: string) {
    return api.get<ApiResponse<Booking>>(`/bookings/${id}`);
  },
  confirm(id: string, fromLocationId: string, toLocationId: string) {
    return api.patch<ApiResponse<Booking>>(`/bookings/${id}/confirm`, { fromLocationId, toLocationId });
  },
  /** Sets or corrects the route after confirmation. */
  updateRoute(id: string, fromLocationId: string, toLocationId: string) {
    return api.patch<ApiResponse<Booking>>(`/bookings/${id}/route`, { fromLocationId, toLocationId });
  },
  reject(id: string, rejectionReason?: string) {
    return api.patch<ApiResponse<Booking>>(`/bookings/${id}/reject`, { rejectionReason });
  },
  assignVehicle(id: string, payload: AssignVehiclePayload) {
    return api.patch<ApiResponse<Booking>>(`/bookings/${id}/vehicle`, payload);
  },
  generateLr(id: string) {
    return api.patch<ApiResponse<Booking>>(`/bookings/${id}/generate-lr`);
  },
  updateStatus(id: string, status: DeliveryStatus, note?: string) {
    return api.patch<ApiResponse<Booking>>(`/bookings/${id}/status`, { status, note });
  },
  getLr(id: string) {
    return api.get<ApiResponse<Booking>>(`/bookings/${id}/lr`);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/bookings/${id}`);
  },

  /**
   * Streams the backend-rendered LR PDF and hands it to the browser as a
   * download. The PDF is always produced server-side — the frontend never
   * renders the document itself.
   */
  async downloadLrPdf(id: string, filename: string) {
    const response = await api.get(`/bookings/${id}/lr/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
