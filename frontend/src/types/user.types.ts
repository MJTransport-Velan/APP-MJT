import type { Role } from './auth.types';

export interface UserRecord {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  isActive: boolean;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}
