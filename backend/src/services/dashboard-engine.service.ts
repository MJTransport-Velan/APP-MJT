import { AppError } from '../middlewares/error.middleware';
import { DateRange } from '../utils/dateRange';
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
  /**
   * The From/To window the user picked on the dashboard. Every widget
   * receives it; each decides which of its own figures are period
   * measures (money moved, trips run, expenses booked) and which are
   * live-state measures that a date range cannot sensibly narrow
   * (current bank balance, vehicles on the road right now).
   */
  range?: DateRange;
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
  'top-nav': (ctx) => dashboardService.getSummary(ctx.range ?? {}),
  accounts: (ctx) => accountsDashboardService.getSummary(ctx.range ?? {}),
  assets: (ctx) => assetDashboardService.get(ctx.range ?? {}),
  banking: (ctx) => bankingDashboardService.summary(ctx.organizationId, ctx.range ?? {}),
  fleet: (ctx) => fleetDashboardService.getSummary(ctx.range ?? {}),
  mis: (ctx) => misDashboardService.summary(ctx.range ?? {}),
  operations: (ctx) => operationsDashboardService.getSummary(ctx.range ?? {}),
  payroll: (ctx) => payrollDashboardService.getSummary(ctx.range ?? {}),
  // System health/metrics/readiness are live process readings — there is
  // no history behind them for a date range to select from.
  'system.health': () => systemDashboardService.health(),
  'system.metrics': () => systemDashboardService.metrics(),
  'system.readiness': () => systemDashboardService.readiness(),
};

/**
 * The permission each widget's own dedicated endpoint requires.
 *
 * /dashboard/widgets serves the same aggregations as those endpoints, so
 * without this it was a way around every one of them: an account with no
 * permissions at all could read Accounts, Banking and MIS in one call.
 * Keyed by the same widget key as `registry`, and the two are checked
 * against each other on startup so a widget added later cannot quietly
 * arrive unguarded.
 */
const WIDGET_PERMISSIONS: Record<string, string> = {
  'top-nav': 'dashboard.view',
  accounts: 'accounts.dashboard',
  assets: 'asset.view',
  banking: 'bankDashboard.view',
  fleet: 'fleet.view',
  mis: 'mis_dashboard.view',
  operations: 'operations.view',
  payroll: 'payrollDashboard.view',
  'system.health': 'system_dashboard.view',
  'system.metrics': 'system_dashboard.view',
  'system.readiness': 'system_dashboard.view',
};

const unguarded = Object.keys(registry).filter((key) => !WIDGET_PERMISSIONS[key]);
if (unguarded.length) {
  throw new Error(
    `Dashboard widgets with no permission mapping: ${unguarded.join(', ')}. ` +
      'Add them to WIDGET_PERMISSIONS in dashboard-engine.service.ts.'
  );
}

export const dashboardEngineService = {
  /** The permission a caller must hold to read this widget. */
  permissionFor(key: string): string | undefined {
    return WIDGET_PERMISSIONS[key];
  },

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
