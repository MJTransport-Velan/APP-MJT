export interface Role {
  id: string;
  name: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  phone?: string | null;
  fullName: string;
  profilePhoto?: string | null;
  roles: string[];
  permissions: string[];
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
