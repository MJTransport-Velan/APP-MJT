// Shared types for the Phase 2 Administration module (Users, Roles,
// Permissions, Departments, Teams, Companies, Groups, Audit Logs).

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminRoleRef {
  id: string;
  name: string;
}

export interface AdminTeamRef {
  id: string;
  name: string;
  department?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  isActive: boolean;
  profilePhoto: string | null;
  roles: AdminRoleRef[];
  teams: AdminTeamRef[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminPermissionRef {
  id: string;
  name: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissions: AdminPermissionRef[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminPermission {
  id: string;
  name: string;
  module: string;
  action: string;
  description: string | null;
  createdAt: string;
}

export interface AdminPermissionGroup {
  module: string;
  permissions: AdminPermission[];
}

export interface AdminDepartment {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  teamCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTeamMember {
  id: string;
  username: string;
  fullName: string;
}

export interface AdminTeam {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  department: { id: string; name: string };
  memberCount?: number;
  members?: AdminTeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminGroupRef {
  id: string;
  name: string;
}

export interface AdminCompany {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  isActive: boolean;
  group: AdminGroupRef;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGroupMember {
  id: string;
  username: string;
  fullName: string;
  roles: string[];
}

export interface AdminGroupCompanyRef {
  id: string;
  name: string;
  code: string;
}

export interface AdminGroup {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  companyCount?: number;
  memberCount?: number;
  companies?: AdminGroupCompanyRef[];
  members?: AdminGroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  performedBy: { id: string; username: string; fullName: string } | null;
  createdAt: string;
}
