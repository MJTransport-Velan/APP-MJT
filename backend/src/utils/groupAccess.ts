import { prisma } from '../config/db';

// Roles that bypass group scoping entirely and retain full visibility
// across all companies/groups.
export const UNRESTRICTED_MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATION_MANAGER', 'ACCOUNTING_MANAGER'];

const GROUP_SCOPED_ROLES = ['INTENT_CREATOR', 'OWN_FLEET_OPERATOR', 'MARKET_FLEET_OPERATOR', 'ACCOUNTS_EXECUTIVE'];

export function isGroupScopedRole(roles: string[] = []) {
  if (roles.some((r) => UNRESTRICTED_MANAGER_ROLES.includes(r))) return false;
  return roles.some((r) => GROUP_SCOPED_ROLES.includes(r));
}

/**
 * Returns the companyIds a user may see/act on, or `undefined` if the user
 * is unrestricted (no filter should be applied). Returns [] — fail closed —
 * if the user holds a group-scoped role but isn't a member of any group yet.
 */
export async function forcedCompanyScope(roles: string[] = [], userId: string): Promise<string[] | undefined> {
  if (!isGroupScopedRole(roles)) return undefined;

  const membership = await prisma.groupMembership.findUnique({
    where: { userId },
    include: { group: { include: { companies: { select: { id: true } } } } },
  });
  if (!membership) return [];
  return membership.group.companies.map((c) => c.id);
}

/**
 * Returns the requesting user's own id if they hold the INTENT_CREATOR role
 * (and no unrestricted manager role), so intent list/stats can be narrowed to
 * only intents they personally created. Other group-scoped roles (e.g.
 * ACCOUNTS_EXECUTIVE) don't create intents at all and still need to see every
 * intent in their group's companies, so this stays undefined for them —
 * intentionally narrower than isGroupScopedRole/forcedCompanyScope.
 */
export function forcedCreatedByScope(roles: string[] = [], userId: string): string | undefined {
  if (roles.some((r) => UNRESTRICTED_MANAGER_ROLES.includes(r))) return undefined;
  if (roles.includes('INTENT_CREATOR')) return userId;
  return undefined;
}
