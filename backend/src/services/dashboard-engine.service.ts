import { AppError } from '../middlewares/error.middleware';
import { dashboardService } from './dashboard.service';
import { accountsDashboardService } from './accounts-dashboard.service';
import { assetDashboardService } from './asset-dashboard.service';
import { bankingDashboardService } from './banking-dashboard.service';
import { fleetDashboardService } from './fleet-dashboard.service';
import { misDashboardService } from './mis-dashboard.service';
import { operationsDashboardService } from './operations-dashboard.service';
import { payrollDashboardService } from './payroll-dashboard.service';
import { systemDashboardService } from './system-dashboard.service';

export interface WidgetContext {
  organizationId?: string;
}

/**
 * Dashboard Engine — a widget-key registry replacing nine independently
 * hand-rolled dashboard services + endpoints (architecture optimization
 * pass). Every existing dashboard route keeps its exact own URL and
 * response shape; each controller now calls dashboardEngineService.get()
 * instead of its own service directly, so there is one place (this file)
 * that knows "how many dashboards exist and what each one is called."
 * None of the underlying aggregation logic moved — that stays in each
 * domain's own service, which is exactly where Trip/Voucher/Ledger
 * queries belong.
 */
const registry: Record<string, (ctx: WidgetContext) => Promise<unknown>> = {
  'top-nav': () => dashboardService.getSummary(),
  accounts: () => accountsDashboardService.getSummary(),
  assets: () => assetDashboardService.get(),
  banking: (ctx) => bankingDashboardService.summary(ctx.organizationId),
  fleet: () => fleetDashboardService.getSummary(),
  mis: () => misDashboardService.summary(),
  operations: () => operationsDashboardService.getSummary(),
  payroll: () => payrollDashboardService.getSummary(),
  'system.health': () => systemDashboardService.health(),
  'system.metrics': () => systemDashboardService.metrics(),
  'system.readiness': () => systemDashboardService.readiness(),
};

export const dashboardEngineService = {
  async getWidget(key: string, ctx: WidgetContext = {}) {
    const provider = registry[key];
    if (!provider) throw new AppError(`Unknown dashboard widget: "${key}"`, 404);
    return provider(ctx);
  },

  async getWidgets(keys: string[], ctx: WidgetContext = {}) {
    const entries = await Promise.all(keys.map(async (key) => [key, await this.getWidget(key, ctx)] as const));
    return Object.fromEntries(entries);
  },

  listKeys() {
    return Object.keys(registry);
  },
};
