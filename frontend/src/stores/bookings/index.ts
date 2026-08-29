import { defineStore } from 'pinia';
import { bookingApi } from '@/services/bookings';
import type {
  Booking,
  BookingStats,
  AssignVehiclePayload,
  CounterBookingPayload,
  DeliveryStatus,
  LrDetailsPayload,
  PaginationMeta,
} from '@/types/bookings.types';

export const useBookingStore = defineStore('bookings', {
  state: () => ({
    items: [] as Booking[],
    meta: null as PaginationMeta | null,
    stats: null as BookingStats | null,
    loading: false,
  }),
  actions: {
    async create(payload: CounterBookingPayload) {
      const response = await bookingApi.create(payload);
      return response.data.data;
    },
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await bookingApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async fetchStats() {
      const response = await bookingApi.stats();
      this.stats = response.data.data;
    },
    async getById(id: string) {
      const response = await bookingApi.getById(id);
      return response.data.data;
    },
    async confirm(id: string, fromLocationId: string, toLocationId: string) {
      const response = await bookingApi.confirm(id, fromLocationId, toLocationId);
      return response.data.data;
    },
    async reject(id: string, rejectionReason?: string) {
      const response = await bookingApi.reject(id, rejectionReason);
      return response.data.data;
    },
    async assignVehicle(id: string, payload: AssignVehiclePayload) {
      const response = await bookingApi.assignVehicle(id, payload);
      return response.data.data;
    },
    async generateLr(id: string) {
      const response = await bookingApi.generateLr(id);
      return response.data.data;
    },
    async updateLrDetails(id: string, payload: LrDetailsPayload) {
      const response = await bookingApi.updateLrDetails(id, payload);
      return response.data.data;
    },
    async updateStatus(id: string, status: DeliveryStatus, note?: string) {
      const response = await bookingApi.updateStatus(id, status, note);
      return response.data.data;
    },
    async remove(id: string) {
      await bookingApi.remove(id);
    },
  },
});
