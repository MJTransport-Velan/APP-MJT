import { defineStore } from 'pinia';
import { reportScheduleApi } from '@/services/accounts/financialReporting';
import type { ReportScheduleDefinition } from '@/types/phase7.types';

export const useReportScheduleStore = defineStore('reportSchedules', {
  state: () => ({ items: [] as ReportScheduleDefinition[], loading: false }),
  actions: {
    async fetchList(isActive?: boolean, category?: string) {
      this.loading = true;
      try {
        const response = await reportScheduleApi.list(isActive, category);
        this.items = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await reportScheduleApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await reportScheduleApi.update(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await reportScheduleApi.remove(id);
    },
  },
});
