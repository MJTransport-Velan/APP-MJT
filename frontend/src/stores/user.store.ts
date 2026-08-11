import { defineStore } from 'pinia';
import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type { UserRecord } from '@/types/user.types';

interface UserState {
  users: UserRecord[];
  loading: boolean;
}

export const useUserStore = defineStore('users', {
  state: (): UserState => ({
    users: [],
    loading: false,
  }),

  actions: {
    async fetchUsers() {
      this.loading = true;
      try {
        const response = await api.get<ApiResponse<UserRecord[]>>('/users');
        this.users = response.data.data;
      } finally {
        this.loading = false;
      }
    },
  },
});
