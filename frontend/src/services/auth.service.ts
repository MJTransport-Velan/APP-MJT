import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { AuthUser, LoginPayload, LoginResponse } from '@/types/auth.types';

export const authApi = {
  login(payload: LoginPayload) {
    return api.post<ApiResponse<LoginResponse>>('/auth/login', payload);
  },
  logout() {
    return api.post<ApiResponse<null>>('/auth/logout');
  },
  refresh(refreshToken: string) {
    return api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', {
      refreshToken,
    });
  },
  me() {
    return api.get<ApiResponse<AuthUser>>('/auth/me');
  },
  updateProfile(payload: { fullName?: string; email?: string; phone?: string }) {
    return api.put<ApiResponse<AuthUser>>('/auth/profile', payload);
  },
  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return api.put<ApiResponse<null>>('/auth/change-password', payload);
  },
  uploadPhoto(file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post<ApiResponse<AuthUser>>('/auth/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
