import { defineStore } from 'pinia';
import { authApi } from '@/services/auth.service';
import type { AuthUser } from '@/types/auth.types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: JSON.parse(localStorage.getItem('mj_user') || 'null'),
    accessToken: localStorage.getItem('mj_access_token'),
    refreshToken: localStorage.getItem('mj_refresh_token'),
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    hasPermission: (state) => (permission: string) => {
      if (!state.user) return false;
      if (state.user.roles.includes('SUPER_ADMIN')) return true;
      return state.user.permissions.includes(permission);
    },
  },

  actions: {
    async login(username: string, password: string) {
      const response = await authApi.login({ username, password });
      const { accessToken, refreshToken, user } = response.data.data;
      this.setSession(accessToken, refreshToken, user);
    },

    async logout() {
      try {
        await authApi.logout();
      } finally {
        this.clearSession();
      }
    },

    async fetchCurrentUser() {
      const response = await authApi.me();
      this.user = response.data.data;
      localStorage.setItem('mj_user', JSON.stringify(this.user));
    },

    async updateProfile(payload: { fullName?: string; email?: string; phone?: string }) {
      const response = await authApi.updateProfile(payload);
      this.user = response.data.data;
      localStorage.setItem('mj_user', JSON.stringify(this.user));
      return this.user;
    },

    async changePassword(currentPassword: string, newPassword: string) {
      await authApi.changePassword({ currentPassword, newPassword });
    },

    async uploadPhoto(file: File) {
      const response = await authApi.uploadPhoto(file);
      this.user = response.data.data;
      localStorage.setItem('mj_user', JSON.stringify(this.user));
      return this.user;
    },

    async refreshAccessToken() {
      if (!this.refreshToken) throw new Error('No refresh token available');
      const response = await authApi.refresh(this.refreshToken);
      const { accessToken, refreshToken } = response.data.data;
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      localStorage.setItem('mj_access_token', accessToken);
      localStorage.setItem('mj_refresh_token', refreshToken);
    },

    setSession(accessToken: string, refreshToken: string, user: AuthUser) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.user = user;
      localStorage.setItem('mj_access_token', accessToken);
      localStorage.setItem('mj_refresh_token', refreshToken);
      localStorage.setItem('mj_user', JSON.stringify(user));
    },

    clearSession() {
      this.accessToken = null;
      this.refreshToken = null;
      this.user = null;
      localStorage.removeItem('mj_access_token');
      localStorage.removeItem('mj_refresh_token');
      localStorage.removeItem('mj_user');
    },

    // Re-reads tokens from localStorage. Used to pick up a login/logout/refresh
    // that happened in another browser tab, so this tab doesn't keep acting on a
    // stale refresh token that the server has already rotated or revoked.
    syncFromStorage() {
      this.accessToken = localStorage.getItem('mj_access_token');
      this.refreshToken = localStorage.getItem('mj_refresh_token');
      this.user = JSON.parse(localStorage.getItem('mj_user') || 'null');
    },
  },
});
