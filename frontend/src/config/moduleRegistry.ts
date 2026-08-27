export interface ModuleQuickLink {
  title: string;
  icon: string;
  to: string;
}

export interface ModuleDef {
  key: string;
  title: string;
  icon: string;
  path: string;
  /**
   * Permission(s) that unlock this module's sidebar entry. A single
   * string requires that exact permission; an array is "any of" —
   * used by 'finance' below, which merges what used to be two separate
   * modules (Accounts, Accounting) gated on two different permissions.
   */
  permission: string | string[];
  /** Real leaf pages inside this module, shown in the sidebar's quick-link flyout. */
  quickLinks?: ModuleQuickLink[];
}

export function moduleGrantsAccess(module: ModuleDef, hasPermission: (permission: string) => boolean): boolean {
  return Array.isArray(module.permission) ? module.permission.some(hasPermission) : hasPermission(module.permission);
}

export const moduleRegistry: ModuleDef[] = [
  { key: 'dashboard', title: 'Dashboard', icon: 'mdi-view-dashboard-outline', path: '/dashboard', permission: 'dashboard.view' },
  {
    key: 'intents',
    title: 'Intents',
    icon: 'mdi-file-document-outline',
    path: '/intents',
    permission: 'intent.view',
    quickLinks: [
      { title: 'Create Intent', icon: 'mdi-plus-box-outline', to: '/intents/create' },
      { title: 'Intent List', icon: 'mdi-format-list-bulleted', to: '/intents/list' },
    ],
  },
  {
    key: 'trips',
    title: 'Trips',
    icon: 'mdi-truck-fast-outline',
    path: '/trips',
    permission: 'trip.view',
    quickLinks: [
      { title: 'Trip List', icon: 'mdi-format-list-bulleted', to: '/trips/list' },
      { title: 'Trip Expenses', icon: 'mdi-cash-multiple', to: '/operations/expenses' },
      { title: 'POD Management', icon: 'mdi-file-check-outline', to: '/operations/pod' },
    ],
  },
  // Parcel bookings taken on the public MJ Express website, worked through to
  // a Lorry Receipt. Deliberately its own top-level entry rather than a page
  // inside Operations: it is a distinct intake-to-LR workflow with its own
  // permissions, and the brief calls for it to stay off the dashboard.
  {
    key: 'booking-lr',
    title: 'Booking & LR',
    icon: 'mdi-package-variant-closed',
    path: '/bookings',
    permission: 'booking.view',
    quickLinks: [
      { title: 'Booking List', icon: 'mdi-format-list-bulleted', to: '/bookings/list' },
      { title: 'New Booking', icon: 'mdi-plus-box-outline', to: '/bookings/create' },
    ],
  },
  // 'Operations' (trip execution/POD/expenses) and 'Fleet' (vehicles, fuel,
  // maintenance, spare parts) used to be two separate sidebar sections —
  // Fleet has no independent workflow of its own; every fleet page exists to
  // support trip execution. Merged into one 'Operations' entry, and the
  // fleet pages moved to /operations/... to match: while they sat at
  // /fleet/..., the breadcrumb named a module that is not in the sidebar.
  // Gated on either permission ("any of") so nobody who could see either
  // half before loses access now; each moved route keeps its own fleet.view
  // gate so the move changed nothing about who can open it.
  {
    key: 'operations',
    title: 'Operations',
    icon: 'mdi-clipboard-list-outline',
    path: '/operations',
    permission: ['operations.view', 'fleet.view'],
    quickLinks: [
      { title: 'POD Management', icon: 'mdi-file-check-outline', to: '/operations/pod' },
      { title: 'Trip Expenses', icon: 'mdi-cash-multiple', to: '/operations/expenses' },
      { title: 'Operations Dashboard', icon: 'mdi-view-dashboard-variant-outline', to: '/operations/dashboard' },
      { title: 'Vehicles', icon: 'mdi-truck-outline', to: '/operations/vehicles' },
      { title: 'Vehicle Assignments', icon: 'mdi-account-switch-outline', to: '/operations/assignments' },
      { title: 'Diesel / Fuel', icon: 'mdi-gas-station-outline', to: '/operations/fuel' },
      { title: 'FASTag', icon: 'mdi-credit-card-wireless-outline', to: '/operations/fasttag' },
      { title: 'Maintenance', icon: 'mdi-wrench-outline', to: '/operations/maintenance' },
      { title: 'Spare Parts Usage', icon: 'mdi-cog-outline', to: '/operations/spare-parts-usage' },
      { title: 'Vehicle Expenses', icon: 'mdi-cash-multiple', to: '/operations/vehicle-expenses' },
      { title: 'Fleet Dashboard', icon: 'mdi-view-dashboard-variant-outline', to: '/operations/fleet-dashboard' },
    ],
  },
  // 'Accounts' (business documents) and 'Accounting' (Banking/Organizations)
  // used to be two separate sidebar sections with near-identical names — a
  // confusing split along an internal build-phase boundary that meant
  // nothing to the person using the app. Merged into one 'Finance' entry;
  // every underlying route/page/URL is unchanged, only the sidebar
  // presentation is unified. Gated on either permission ("any of") so
  // nobody who could see either half before loses access now.
  {
    key: 'finance',
    title: 'Finance',
    icon: 'mdi-bank-outline',
    path: '/accounts',
    permission: ['accounts.view', 'bankAccount.view'],
    quickLinks: [
      // Business Financial Entry — the everyday front door (money in/out/
      // transfer/expense/advance/refund/loan/settlement), first in the list
      // on purpose. Everything below still works exactly as before; this
      // is what a non-accountant should reach for first.
      { title: 'Financial Entries', icon: 'mdi-cash-fast', to: '/accounts/financial-entry' },
      { title: 'Loans & EMI', icon: 'mdi-bank-outline', to: '/accounts/loans' },
      { title: 'Capital & Owner Funds', icon: 'mdi-wallet-outline', to: '/accounts/capital-account' },
      { title: 'Opening Balance & Migration', icon: 'mdi-database-import-outline', to: '/accounts/opening-balance' },
      { title: 'Finance Dashboard', icon: 'mdi-view-dashboard-variant-outline', to: '/accounts/dashboard' },
      // Transactions
      { title: 'Customer Invoices & Receipts', icon: 'mdi-receipt-text-outline', to: '/accounts/invoices' },
      { title: 'Supplier Bills & Payments', icon: 'mdi-file-document-outline', to: '/accounts/supplier-bills' },
      { title: 'Credit Control', icon: 'mdi-shield-check-outline', to: '/accounts/credit-control' },
      { title: 'Collections', icon: 'mdi-phone-outline', to: '/accounts/collections' },
      { title: 'Trip Financials', icon: 'mdi-chart-line', to: '/accounts/trip-financials' },
      { title: 'Balance Sheet', icon: 'mdi-book-open-page-variant-outline', to: '/accounts/balance-sheet' },
      { title: 'Profit & Loss', icon: 'mdi-chart-bell-curve-cumulative', to: '/accounts/profit-loss' },
      // Driver & Payroll
      { title: 'Driver Advances & Allowances', icon: 'mdi-truck-fast-outline', to: '/accounts/driver-transactions' },
      { title: 'Driver Settlements', icon: 'mdi-file-document-check-outline', to: '/accounts/driver-settlements' },
      { title: 'Driver Salary Structures', icon: 'mdi-account-cash-outline', to: '/accounts/driver-salary-structures' },
      { title: 'Salary Structures', icon: 'mdi-cash-sync', to: '/accounts/salary-structures' },
      { title: 'Employee Advances', icon: 'mdi-account-cash-outline', to: '/accounts/employee-advances' },
      { title: 'Payroll Dashboard', icon: 'mdi-view-dashboard-outline', to: '/accounts/payroll-dashboard' },
      // Banking — everyday bank/cash position, no ledger jargon
      { title: 'Bank Dashboard', icon: 'mdi-view-dashboard-variant-outline', to: '/accounting/banking/dashboard' },
      { title: 'Bank Accounts', icon: 'mdi-bank-outline', to: '/accounting/banking/bank-accounts' },
      { title: 'Cash Accounts', icon: 'mdi-cash-multiple', to: '/accounting/banking/cash-accounts' },
      { title: 'Cheque Register', icon: 'mdi-checkbook', to: '/accounting/banking/cheques' },
      { title: 'Bank Transfers', icon: 'mdi-bank-transfer', to: '/accounting/banking/transfers' },
    ],
  },
  {
    key: 'masters',
    title: 'Masters',
    icon: 'mdi-database-outline',
    path: '/masters',
    permission: 'masters.view',
    quickLinks: [
      { title: 'Companies', icon: 'mdi-domain', to: '/masters/companies' },
      { title: 'Groups', icon: 'mdi-account-multiple-outline', to: '/masters/groups' },
      { title: 'Vehicles', icon: 'mdi-truck', to: '/masters/vehicles' },
      { title: 'Drivers', icon: 'mdi-card-account-details-outline', to: '/masters/drivers' },
      { title: 'Suppliers', icon: 'mdi-account-tie-outline', to: '/masters/suppliers' },
    ],
  },
  {
    key: 'administration',
    title: 'Administration',
    icon: 'mdi-shield-account-outline',
    path: '/administration',
    permission: 'administration.view',
    quickLinks: [
      { title: 'Users', icon: 'mdi-account-multiple-outline', to: '/administration/users' },
      { title: 'Roles', icon: 'mdi-account-key-outline', to: '/administration/roles' },
      { title: 'Permissions', icon: 'mdi-lock-check-outline', to: '/administration/permissions' },
      { title: 'Departments', icon: 'mdi-office-building-outline', to: '/administration/departments' },
      { title: 'Teams', icon: 'mdi-account-group-outline', to: '/administration/teams' },
      { title: 'Audit Logs', icon: 'mdi-history', to: '/administration/audit-logs' },
    ],
  },
  {
    key: 'reports',
    title: 'Reports',
    icon: 'mdi-chart-bar',
    path: '/reports',
    permission: 'reports.view',
    quickLinks: [
      { title: 'Operations Reports', icon: 'mdi-truck-fast-outline', to: '/reports/operations' },
      { title: 'Fleet Reports', icon: 'mdi-truck-outline', to: '/reports/fleet' },
      { title: 'Accounts Reports', icon: 'mdi-bank-outline', to: '/reports/accounts' },
      { title: 'Management Reports', icon: 'mdi-briefcase-outline', to: '/reports/management' },
    ],
  },
  {
    key: 'system',
    title: 'System',
    icon: 'mdi-cog-sync-outline',
    path: '/system',
    permission: 'system_dashboard.view',
    quickLinks: [
      { title: 'System Health & Readiness', icon: 'mdi-heart-pulse', to: '/system/health' },
      { title: 'Automation Rules', icon: 'mdi-cog-sync-outline', to: '/system/automation-rules' },
      { title: 'Notification Center', icon: 'mdi-bell-outline', to: '/system/notifications' },
      { title: 'Enterprise Audit Center', icon: 'mdi-shield-search', to: '/system/audit-center' },
      { title: 'Security Center', icon: 'mdi-lock-outline', to: '/system/security' },
      { title: 'Governance', icon: 'mdi-gavel', to: '/system/governance' },
      { title: 'Data Lifecycle', icon: 'mdi-database-sync-outline', to: '/system/data-lifecycle' },
      { title: 'Integration Center', icon: 'mdi-lan-connect', to: '/system/integrations' },
      { title: 'Intelligence Center', icon: 'mdi-brain', to: '/system/intelligence' },
      { title: 'System Configuration', icon: 'mdi-tune', to: '/system/settings' },
    ],
  },
  {
    key: 'my-performance',
    title: 'My Performance',
    icon: 'mdi-account-star-outline',
    path: '/performance/me',
    permission: 'performance.view',
  },
  {
    key: 'team-performance',
    title: 'Team Performance',
    icon: 'mdi-account-group-outline',
    path: '/performance/team',
    permission: 'performance.team',
  },
];

// Where to land a user after login (or at '/'): the first module in registry
// order that they have permission for. '/dashboard' can't be hardcoded here —
// most non-admin roles (e.g. INTENT_CREATOR) aren't granted dashboard.view.
export function firstAccessibleModulePath(hasPermission: (permission: string) => boolean): string {
  const match = moduleRegistry.find((module) => moduleGrantsAccess(module, hasPermission));
  return match ? match.path : '/unauthorized';
}
