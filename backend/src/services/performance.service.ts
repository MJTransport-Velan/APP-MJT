import {
  performanceRepository,
  OPERATIONS_TEAM_ROLES,
  ACCOUNTS_TEAM_ROLES,
} from '../repositories/performance.repository';
import { ReportFilters } from '../utils/reportFilters';

export const performanceService = {
  async getMyPerformance(userId: string, roles: string[], filters: ReportFilters) {
    const isOperations = roles.some((r) => OPERATIONS_TEAM_ROLES.includes(r));
    const isAccounts = roles.some((r) => ACCOUNTS_TEAM_ROLES.includes(r));

    const [opsMap, acctMap] = await Promise.all([
      isOperations ? performanceRepository.getOperationsPerformance([userId], filters) : Promise.resolve(new Map()),
      isAccounts ? performanceRepository.getAccountsPerformance([userId], filters) : Promise.resolve(new Map()),
    ]);

    return {
      operations: opsMap.get(userId) || null,
      accounts: acctMap.get(userId) || null,
    };
  },

  async getTeamPerformance(params: {
    team: 'all' | 'operations' | 'accounts';
    search?: string;
    filters: ReportFilters;
    skip: number;
    take: number;
  }) {
    const { rows, total } = await performanceRepository.findTeamUsers({
      team: params.team,
      search: params.search,
      skip: params.skip,
      take: params.take,
    });
    const userIds = rows.map((u) => u.id);

    const [opsMap, acctMap] = await Promise.all([
      performanceRepository.getOperationsPerformance(userIds, params.filters),
      performanceRepository.getAccountsPerformance(userIds, params.filters),
    ]);

    const data = rows.map((u) => {
      const roleNames = u.userRoles.map((ur) => ur.role.name);
      const isOperations = roleNames.some((r) => OPERATIONS_TEAM_ROLES.includes(r));
      const isAccounts = roleNames.some((r) => ACCOUNTS_TEAM_ROLES.includes(r));

      return {
        userId: u.id,
        username: u.username,
        fullName: u.fullName,
        roles: roleNames,
        operations: isOperations ? opsMap.get(u.id) || null : null,
        accounts: isAccounts ? acctMap.get(u.id) || null : null,
      };
    });

    return { rows: data, total };
  },
};
