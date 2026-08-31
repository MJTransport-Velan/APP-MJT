import { createRouter, createWebHistory, RouteRecordRaw, RouterView } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { recordVisit } from '@/composables/useRecentlyVisited';
import { firstAccessibleModulePath } from '@/config/moduleRegistry';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: () => {
          const authStore = useAuthStore();
          if (!authStore.isAuthenticated) {
            return { name: 'login' };
          }
          return firstAccessibleModulePath(authStore.hasPermission);
        },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/Dashboard.vue'),
        meta: { breadcrumb: 'Dashboard', permission: 'dashboard.view' },
      },
      {
        path: 'intents',
        name: 'intents',
        component: RouterView,
        meta: { breadcrumb: 'Intents', permission: 'intent.view' },
        children: [
          {
            path: '',
            name: 'intents-hub',
            component: () => import('@/pages/intents/IntentsHub.vue'),
            meta: { breadcrumb: 'Intents' },
          },
          {
            path: 'list',
            name: 'intents-list',
            component: () => import('@/pages/intents/IntentList.vue'),
            meta: { breadcrumb: 'Intent List' },
          },
          {
            path: 'create',
            name: 'intents-create',
            component: () => import('@/pages/intents/CreateIntent.vue'),
            meta: { breadcrumb: 'Create Intent' },
          },
        ],
      },
      {
        path: 'trips',
        name: 'trips',
        component: RouterView,
        meta: { breadcrumb: 'Trips', permission: 'trip.view' },
        children: [
          {
            path: '',
            name: 'trips-hub',
            component: () => import('@/pages/trips/TripsHub.vue'),
            meta: { breadcrumb: 'Trips' },
          },
          {
            path: 'list',
            name: 'trips-list',
            component: () => import('@/pages/trips/TripList.vue'),
            meta: { breadcrumb: 'Trip List' },
          },
        ],
      },
      {
        path: 'trips/:id',
        name: 'trips-detail',
        component: () => import('@/pages/trips/TripFollowUp.vue'),
        meta: {
          breadcrumb: 'Trip Follow-up',
          parentBreadcrumb: { title: 'Trip List', to: '/trips/list' },
          permission: 'trip.view',
        },
      },
      {
        path: 'bookings',
        name: 'bookings',
        component: RouterView,
        meta: { breadcrumb: 'Booking & LR', permission: 'booking.view' },
        children: [
          {
            path: '',
            name: 'bookings-hub',
            component: () => import('@/pages/bookings/BookingList.vue'),
            meta: { breadcrumb: 'Booking & LR' },
          },
          {
            path: 'list',
            name: 'bookings-list',
            component: () => import('@/pages/bookings/BookingList.vue'),
            meta: { breadcrumb: 'Booking List' },
          },
          {
            path: 'create',
            name: 'bookings-create',
            component: () => import('@/pages/bookings/CreateBooking.vue'),
            meta: { breadcrumb: 'New Booking', permission: 'booking.create' },
          },
        ],
      },
      // Sibling rather than a child of 'bookings', so the detail URL stays
      // /bookings/:id and does not collide with the 'list' child route.
      {
        path: 'bookings/:id',
        name: 'bookings-detail',
        component: () => import('@/pages/bookings/BookingDetails.vue'),
        meta: {
          breadcrumb: 'Booking Details',
          parentBreadcrumb: { title: 'Booking List', to: '/bookings/list' },
          permission: 'booking.view',
        },
      },
      {
        path: 'operations',
        name: 'operations',
        component: RouterView,
        meta: { breadcrumb: 'Operations', permission: 'operations.view' },
        children: [
          {
            path: '',
            name: 'operations-hub',
            component: () => import('@/pages/operations/OperationsHub.vue'),
            meta: { breadcrumb: 'Operations' },
          },
          {
            path: 'pod',
            name: 'operations-pod',
            component: () => import('@/pages/operations/PODManagement.vue'),
            meta: { breadcrumb: 'POD Management' },
          },
          {
            path: 'expenses',
            name: 'operations-expenses',
            component: () => import('@/pages/operations/TripExpenses.vue'),
            meta: { breadcrumb: 'Trip Expenses' },
          },
          {
            path: 'dashboard',
            name: 'operations-dashboard',
            component: () => import('@/pages/operations/OperationsDashboard.vue'),
            meta: { breadcrumb: 'Operations Dashboard' },
          },
          {
            // Gated on vehicle.view — the permission this page's API
            // actually authorizes on (/fleet/vehicles/tracking, /:id,
            // /:id/timeline, /:id/availability all use vehicle.view).
            // It used to require fleet.view, which OWN_FLEET_OPERATOR /
            // MARKET_FLEET_OPERATOR do not hold: they were shown the
            // Vehicles tile in Operations and bounced to Unauthorized on
            // click, even though every call the page makes was allowed.
            path: 'vehicles',
            name: 'operations-vehicles',
            component: () => import('@/pages/fleet/Vehicles.vue'),
            meta: { breadcrumb: 'Vehicles', permission: 'vehicle.view' },
          },
          {
            path: 'assignments',
            name: 'operations-assignments',
            component: () => import('@/pages/fleet/VehicleAssignments.vue'),
            meta: { breadcrumb: 'Vehicle Assignments', permission: 'fleet.view' },
          },
          {
            path: 'fuel',
            name: 'operations-fuel',
            component: () => import('@/pages/fleet/FuelManagement.vue'),
            meta: { breadcrumb: 'Diesel / Fuel', permission: 'fleet.view' },
          },
          {
            path: 'adblue',
            name: 'operations-adblue',
            component: () => import('@/pages/fleet/AdBlueManagement.vue'),
            meta: { breadcrumb: 'AdBlue', permission: 'adblue_entry.view' },
          },
          {
            path: 'fasttag',
            name: 'operations-fasttag',
            component: () => import('@/pages/accounts/FastTag.vue'),
            meta: { breadcrumb: 'FastTag', permission: 'fasttag.view' },
          },
          {
            path: 'maintenance',
            name: 'operations-maintenance',
            component: () => import('@/pages/fleet/Maintenance.vue'),
            meta: { breadcrumb: 'Maintenance', permission: 'fleet.view' },
          },
          {
            path: 'spare-parts-usage',
            name: 'operations-spare-parts-usage',
            component: () => import('@/pages/fleet/SparePartsUsage.vue'),
            meta: { breadcrumb: 'Spare Parts Usage', permission: 'fleet.view' },
          },
          // 'expenses' and 'dashboard' already belong to Trip Expenses and
          // the Operations Dashboard here, so these two take the names they
          // are actually known by rather than shadowing them.
          {
            path: 'vehicle-expenses',
            name: 'operations-vehicle-expenses',
            component: () => import('@/pages/fleet/VehicleExpenses.vue'),
            meta: { breadcrumb: 'Vehicle Expenses', permission: 'fleet.view' },
          },
          {
            path: 'fleet-dashboard',
            name: 'operations-fleet-dashboard',
            component: () => import('@/pages/fleet/FleetDashboard.vue'),
            meta: { breadcrumb: 'Fleet Dashboard', permission: 'fleet.view' },
          },
        ],
      },
      {
        // Legacy /fleet/... URLs. Fleet was merged into Operations, so these
        // only exist to carry old bookmarks and recorded visits across to
        // where the pages live now. Deliberately unnamed and ungated: a
        // redirect resolves before the navigation guard runs, so the target
        // route's own permission is what applies.
        path: 'fleet',
        component: RouterView,
        children: [
          { path: '', redirect: { name: 'operations-hub' } },
          { path: 'vehicles', redirect: { name: 'operations-vehicles' } },
          { path: 'assignments', redirect: { name: 'operations-assignments' } },
          { path: 'fuel', redirect: { name: 'operations-fuel' } },
          { path: 'fasttag', redirect: { name: 'operations-fasttag' } },
          { path: 'maintenance', redirect: { name: 'operations-maintenance' } },
          { path: 'spare-parts-usage', redirect: { name: 'operations-spare-parts-usage' } },
          { path: 'expenses', redirect: { name: 'operations-vehicle-expenses' } },
          { path: 'dashboard', redirect: { name: 'operations-fleet-dashboard' } },
        ],
      },
      {
        path: 'accounts',
        name: 'accounts',
        component: RouterView,
        meta: { breadcrumb: 'Finance', permission: 'accounts.view' },
        children: [
          {
            path: '',
            name: 'accounts-hub',
            component: () => import('@/pages/accounts/AccountsHub.vue'),
            meta: { breadcrumb: 'Finance' },
          },
          {
            path: 'financial-entry',
            name: 'accounts-financial-entry',
            component: () => import('@/pages/accounts/FinancialEntry.vue'),
            meta: { breadcrumb: 'Financial Entries', permission: 'financialEntry.view' },
          },
          // Loans & EMI — Vehicle/Bank/Business/Owner loans. The detail
          // route carries a parentBreadcrumb so Back always lands on the
          // module rather than wherever the user came from.
          {
            path: 'loans',
            name: 'accounts-loans',
            component: () => import('@/pages/accounts/Loans.vue'),
            meta: { breadcrumb: 'Loans & EMI', permission: 'loan.view' },
          },
          {
            path: 'loans/:id',
            name: 'accounts-loan-detail',
            component: () => import('@/pages/accounts/LoanDetail.vue'),
            meta: {
              breadcrumb: 'EMI Schedule',
              parentBreadcrumb: { title: 'Loans & EMI', to: '/accounts/loans' },
              permission: 'loan.view',
            },
          },
          // Opening Balance & Migration — the previous system's closing
          // position brought in as this system's opening position. Nothing
          // recorded there is a transaction.
          {
            path: 'loans-given',
            name: 'accounts-loans-given',
            component: () => import('@/pages/accounts/LoansGiven.vue'),
            meta: { breadcrumb: 'Loans & Advances Given', permission: 'loan_given.view' },
          },
          {
            path: 'opening-balance',
            name: 'accounts-opening-balance',
            component: () => import('@/pages/accounts/OpeningBalanceMigration.vue'),
            meta: { breadcrumb: 'Opening Balance & Migration', permission: 'opening_balance.view' },
          },
          {
            path: 'capital-account',
            name: 'accounts-capital-account',
            component: () => import('@/pages/accounts/CapitalAccount.vue'),
            meta: { breadcrumb: 'Capital & Owner Funds', permission: 'capital_transaction.view' },
          },
          {
            path: 'receivables',
            name: 'accounts-receivables-hub',
            component: () => import('@/pages/accounts/ReceivablesHub.vue'),
            meta: { breadcrumb: 'Receivables' },
          },
          {
            path: 'payables',
            name: 'accounts-payables-hub',
            component: () => import('@/pages/accounts/PayablesHub.vue'),
            meta: { breadcrumb: 'Payables' },
          },
          {
            path: 'driver-payroll',
            name: 'accounts-driver-payroll-hub',
            component: () => import('@/pages/accounts/DriverPayrollHub.vue'),
            meta: { breadcrumb: 'Driver & Employee Accounts' },
          },
          {
            path: 'vehicle-assets',
            name: 'accounts-vehicle-assets-hub',
            component: () => import('@/pages/accounts/AssetsHub.vue'),
            meta: { breadcrumb: 'Assets' },
          },
          {
            path: 'gst-taxation',
            name: 'accounts-gst-taxation-hub',
            component: () => import('@/pages/accounts/GstTaxationHub.vue'),
            meta: { breadcrumb: 'GST & Taxation' },
          },
          // GST Masters — previously only reachable at /masters/gst-masters,
          // which meant a user needed BOTH accounts.view (to see this hub's
          // card) AND masters.view (to pass that route's own guard) just to
          // open it. Moved under accounts/gst-taxation so it only needs
          // accounts.view, matching the fact its only real entry point is
          // this hub. Same generic config-driven page/pattern as
          // accounting-simple/masters-simple above.
          {
            path: 'gst-taxation/:module',
            name: 'accounts-gst-taxation-simple',
            component: () => import('@/pages/masters/SimpleMasterPage.vue'),
            meta: { breadcrumb: 'GST & Taxation' },
          },
          {
            path: 'financial-reporting',
            name: 'accounts-financial-reporting-hub',
            component: () => import('@/pages/accounts/FinancialReportingHub.vue'),
            meta: { breadcrumb: 'Balance Sheet & Reports' },
          },
          {
            path: 'invoices',
            name: 'accounts-invoices',
            component: () => import('@/pages/accounts/CustomerInvoicesReceipts.vue'),
            meta: { breadcrumb: 'Customer Invoices & Receipts' },
          },
          {
            path: 'receipts',
            redirect: { name: 'accounts-invoices' },
          },
          {
            path: 'supplier-bills',
            name: 'accounts-supplier-bills',
            component: () => import('@/pages/accounts/SupplierBillsPayments.vue'),
            meta: { breadcrumb: 'Supplier Bills & Payments' },
          },
          {
            path: 'supplier-payments',
            redirect: { name: 'accounts-supplier-bills' },
          },
          {
            // Superseded by the Outstanding tab on the Receivables/Payables
            // pages themselves — redirect any old link/bookmark there.
            path: 'outstanding-aging',
            redirect: { name: 'accounts-receivables-hub' },
          },
          {
            path: 'credit-control',
            name: 'accounts-credit-control',
            component: () => import('@/pages/accounts/CreditControl.vue'),
            meta: { breadcrumb: 'Credit Control' },
          },
          {
            path: 'collections',
            name: 'accounts-collections',
            component: () => import('@/pages/accounts/Collections.vue'),
            meta: { breadcrumb: 'Collections' },
          },
          {
            path: 'trip-financials',
            name: 'accounts-trip-financials',
            component: () => import('@/pages/accounts/TripFinancials.vue'),
            meta: { breadcrumb: 'Trip Financials' },
          },
          {
            path: 'dashboard',
            name: 'accounts-dashboard',
            component: () => import('@/pages/accounts/AccountsDashboard.vue'),
            meta: { breadcrumb: 'Finance Dashboard' },
          },
          // Phase 11 — Driver Accounts, Employee Payroll & Settlements
          // (docs Phase 5). Every transaction here still becomes a Voucher
          // through the unchanged Phase 8 engine.
          {
            path: 'driver-transactions',
            name: 'accounts-driver-transactions',
            component: () => import('@/pages/accounts/DriverTransactions.vue'),
            meta: { breadcrumb: 'Driver Advances & Allowances' },
          },
          {
            path: 'driver-settlements',
            name: 'accounts-driver-settlements',
            component: () => import('@/pages/accounts/DriverSettlements.vue'),
            meta: { breadcrumb: 'Driver Settlements' },
          },
          {
            path: 'driver-statement',
            name: 'accounts-driver-statement',
            component: () => import('@/pages/accounts/DriverStatement.vue'),
            meta: { breadcrumb: 'Driver Statement' },
          },
          {
            path: 'driver-salary-structures',
            name: 'accounts-driver-salary-structures',
            component: () => import('@/pages/accounts/DriverSalaryStructures.vue'),
            meta: { breadcrumb: 'Driver Salary Structures' },
          },
          {
            path: 'salary-structures',
            name: 'accounts-salary-structures',
            component: () => import('@/pages/accounts/SalaryStructures.vue'),
            meta: { breadcrumb: 'Salary Structures' },
          },
          {
            path: 'employee-advances',
            name: 'accounts-employee-advances',
            component: () => import('@/pages/accounts/EmployeeAdvances.vue'),
            meta: { breadcrumb: 'Employee Advances' },
          },
          {
            path: 'payroll-dashboard',
            name: 'accounts-payroll-dashboard',
            component: () => import('@/pages/accounts/PayrollDashboard.vue'),
            meta: { breadcrumb: 'Payroll Dashboard' },
          },
          // Phase 12 — Fixed Asset Register, FastTag & Expense
          // Management (docs Phase 6).
          {
            path: 'asset-categories',
            name: 'accounts-asset-categories',
            component: () => import('@/pages/accounts/AssetCategories.vue'),
            meta: { breadcrumb: 'Asset Categories' },
          },
          {
            path: 'assets',
            name: 'accounts-assets',
            component: () => import('@/pages/accounts/FixedAssets.vue'),
            meta: { breadcrumb: 'Asset Register' },
          },
          {
            path: 'asset-dashboard',
            name: 'accounts-asset-dashboard',
            component: () => import('@/pages/accounts/AssetDashboard.vue'),
            meta: { breadcrumb: 'Asset Dashboard' },
          },
          // Moved to /fleet/fasttag so the breadcrumb matches the module it
          // is reached from. Kept as a redirect: existing bookmarks and any
          // link still pointing here should land on the page, not a 404.
          {
            path: 'fasttag',
            redirect: { name: 'operations-fasttag' },
          },
          // The Diesel Card is now the Card Account tab of Diesel / Fuel —
          // one module for the fuel and the money that paid for it.
          {
            path: 'diesel-card',
            redirect: { name: 'operations-fuel' },
          },
          {
            path: 'profitability-reports',
            name: 'accounts-profitability-reports',
            component: () => import('@/pages/accounts/ProfitabilityReports.vue'),
            meta: { breadcrumb: 'Profitability Reports' },
          },
          {
            path: 'operational-reports',
            name: 'accounts-operational-reports',
            component: () => import('@/pages/accounts/OperationalReports.vue'),
            meta: { breadcrumb: 'Outstanding & Expense Reports' },
          },
          {
            path: 'mis-dashboard',
            name: 'accounts-mis-dashboard',
            component: () => import('@/pages/accounts/MisDashboard.vue'),
            meta: { breadcrumb: 'MIS Dashboard' },
          },
          {
            path: 'balance-sheet',
            name: 'accounts-balance-sheet',
            component: () => import('@/pages/accounts/BalanceSheet.vue'),
            meta: { breadcrumb: 'Balance Sheet', permission: 'balance_sheet.view' },
          },
          {
            path: 'profit-loss',
            name: 'accounts-profit-loss',
            component: () => import('@/pages/accounts/ProfitAndLoss.vue'),
            meta: { breadcrumb: 'Profit & Loss', permission: 'profit_loss.view' },
          },
          {
            path: 'audit-reports',
            name: 'accounts-audit-reports',
            component: () => import('@/pages/accounts/AuditReports.vue'),
            meta: { breadcrumb: 'Audit Reports' },
          },
          {
            path: 'report-schedules',
            name: 'accounts-report-schedules',
            component: () => import('@/pages/accounts/ReportSchedules.vue'),
            meta: { breadcrumb: 'Report Schedules' },
          },
        ],
      },
      {
        path: 'system',
        name: 'system',
        component: RouterView,
        meta: { breadcrumb: 'System', permission: 'system_dashboard.view' },
        children: [
          {
            path: '',
            name: 'system-hub',
            component: () => import('@/pages/system/SystemAdminHub.vue'),
            meta: { breadcrumb: 'System' },
          },
          {
            path: 'health',
            name: 'system-health',
            component: () => import('@/pages/system/SystemHealthDashboard.vue'),
            meta: { breadcrumb: 'System Health & Readiness' },
          },
          {
            path: 'automation-rules',
            name: 'system-automation-rules',
            component: () => import('@/pages/system/AutomationRules.vue'),
            meta: { breadcrumb: 'Automation Rules' },
          },
          {
            path: 'notifications',
            name: 'system-notifications',
            component: () => import('@/pages/system/NotificationCenter.vue'),
            meta: { breadcrumb: 'Notification Center' },
          },
          {
            path: 'audit-center',
            name: 'system-audit-center',
            component: () => import('@/pages/system/AuditCenter.vue'),
            meta: { breadcrumb: 'Enterprise Audit Center' },
          },
          {
            path: 'security',
            name: 'system-security',
            component: () => import('@/pages/system/SecurityCenter.vue'),
            meta: { breadcrumb: 'Security Center' },
          },
          {
            path: 'governance',
            name: 'system-governance',
            component: () => import('@/pages/system/GovernanceCenter.vue'),
            meta: { breadcrumb: 'Governance' },
          },
          {
            path: 'data-lifecycle',
            name: 'system-data-lifecycle',
            component: () => import('@/pages/system/DataLifecycle.vue'),
            meta: { breadcrumb: 'Data Lifecycle' },
          },
          {
            path: 'integrations',
            name: 'system-integrations',
            component: () => import('@/pages/system/IntegrationCenter.vue'),
            meta: { breadcrumb: 'Integration Center' },
          },
          {
            path: 'intelligence',
            name: 'system-intelligence',
            component: () => import('@/pages/system/IntelligenceCenter.vue'),
            meta: { breadcrumb: 'Intelligence Center' },
          },
          {
            path: 'settings',
            name: 'system-settings',
            component: () => import('@/pages/system/SystemSettings.vue'),
            meta: { breadcrumb: 'System Configuration' },
          },
        ],
      },
      {
        path: 'accounting',
        name: 'accounting',
        component: RouterView,
        // 'Accounting' stopped being a user-facing section when it was merged
        // into 'Finance' in the sidebar. The pages under here still live at
        // /accounting URLs, so the trail names their real parent explicitly and
        // links to the Finance hub that lists them.
        meta: { parentBreadcrumb: { title: 'Finance', to: '/accounts' }, permission: 'bankAccount.view' },
        children: [
          {
            path: '',
            name: 'accounting-hub',
            component: () => import('@/pages/accounting/AccountingHub.vue'),
            meta: { breadcrumb: 'Accounting' },
          },
          {
            path: 'organizations',
            name: 'accounting-organizations',
            component: () => import('@/pages/accounting/Organizations.vue'),
            meta: { breadcrumb: 'Organizations' },
          },
          // Banking & Cash Management
          {
            path: 'banking',
            name: 'accounting-banking-hub',
            component: () => import('@/pages/accounting/banking/BankingHub.vue'),
            meta: { breadcrumb: 'Banking' },
          },
          {
            path: 'banking/dashboard',
            name: 'accounting-banking-dashboard',
            component: () => import('@/pages/accounting/banking/BankingDashboard.vue'),
            meta: { breadcrumb: 'Bank Dashboard' },
          },
          {
            path: 'banking/bank-accounts',
            name: 'accounting-bank-accounts',
            component: () => import('@/pages/accounting/banking/BankAccounts.vue'),
            meta: { breadcrumb: 'Bank Accounts' },
          },
          {
            path: 'banking/cash-accounts',
            name: 'accounting-cash-accounts',
            component: () => import('@/pages/accounting/banking/CashAccounts.vue'),
            meta: { breadcrumb: 'Cash Accounts' },
          },
          {
            path: 'banking/transfers',
            name: 'accounting-bank-transfers',
            component: () => import('@/pages/accounting/banking/BankTransfers.vue'),
            meta: { breadcrumb: 'Bank Transfers' },
          },
          {
            path: 'banking/cheque-books',
            name: 'accounting-cheque-books',
            component: () => import('@/pages/accounting/banking/ChequeBooks.vue'),
            meta: { breadcrumb: 'Cheque Books' },
          },
          {
            path: 'banking/cheques',
            name: 'accounting-cheque-register',
            component: () => import('@/pages/accounting/banking/ChequeRegister.vue'),
            meta: { breadcrumb: 'Cheque Register' },
          },
          {
            path: 'banking/petty-cash',
            name: 'accounting-petty-cash',
            component: () => import('@/pages/accounting/banking/PettyCash.vue'),
            meta: { breadcrumb: 'Petty Cash' },
          },
          // Currencies, Cost Categories — served by the generic config-driven
          // page, same pattern as Masters' :module route.
          {
            path: ':module',
            name: 'accounting-simple',
            component: () => import('@/pages/masters/SimpleMasterPage.vue'),
            meta: { breadcrumb: 'Accounting' },
          },
        ],
      },
      {
        path: 'reports',
        name: 'reports',
        component: RouterView,
        meta: { breadcrumb: 'Reports', permission: 'reports.view' },
        children: [
          {
            path: '',
            name: 'reports-hub',
            component: () => import('@/pages/reports/ReportsHub.vue'),
            meta: { breadcrumb: 'Reports' },
          },
          {
            path: 'operations',
            name: 'reports-operations',
            component: () => import('@/pages/reports/OperationsReports.vue'),
            meta: { breadcrumb: 'Operations Reports' },
          },
          {
            path: 'fleet',
            name: 'reports-fleet',
            component: () => import('@/pages/reports/FleetReports.vue'),
            meta: { breadcrumb: 'Fleet Reports' },
          },
          {
            path: 'accounts',
            name: 'reports-accounts',
            component: () => import('@/pages/reports/AccountsReports.vue'),
            meta: { breadcrumb: 'Accounts Reports' },
          },
          {
            path: 'management',
            name: 'reports-management',
            component: () => import('@/pages/reports/ManagementReports.vue'),
            meta: { breadcrumb: 'Management Reports' },
          },
        ],
      },
      {
        path: 'performance',
        name: 'performance',
        component: RouterView,
        meta: { breadcrumb: 'Performance' },
        children: [
          {
            path: 'me',
            name: 'performance-me',
            component: () => import('@/pages/performance/MyPerformance.vue'),
            meta: { breadcrumb: 'My Performance', permission: 'performance.view' },
          },
          {
            path: 'team',
            name: 'performance-team',
            component: () => import('@/pages/performance/TeamPerformance.vue'),
            meta: { breadcrumb: 'Team Performance', permission: 'performance.team' },
          },
        ],
      },
      {
        path: 'masters',
        name: 'masters',
        component: RouterView,
        meta: { breadcrumb: 'Masters', permission: 'masters.view' },
        children: [
          {
            path: '',
            name: 'masters-hub',
            component: () => import('@/pages/masters/MastersHub.vue'),
            meta: { breadcrumb: 'Masters' },
          },
          {
            path: 'vehicles',
            name: 'masters-vehicles',
            component: () => import('@/pages/masters/Vehicles.vue'),
            meta: { breadcrumb: 'Vehicles' },
          },
          {
            path: 'drivers',
            name: 'masters-drivers',
            component: () => import('@/pages/masters/Drivers.vue'),
            meta: { breadcrumb: 'Drivers' },
          },
          {
            path: 'suppliers',
            name: 'masters-suppliers',
            component: () => import('@/pages/masters/Suppliers.vue'),
            meta: { breadcrumb: 'Suppliers' },
          },
          // Companies (clients) and the Groups they are bucketed into are
          // reference data, not administration. Both keep the permission
          // their API authorizes on, which overrides the parent's
          // masters.view — an admin managing clients need not hold the
          // whole Masters module.
          {
            path: 'companies',
            name: 'masters-companies',
            component: () => import('@/pages/masters/Companies.vue'),
            meta: { breadcrumb: 'Companies', permission: 'company.view' },
          },
          {
            path: 'groups',
            name: 'masters-groups',
            component: () => import('@/pages/masters/Groups.vue'),
            meta: { breadcrumb: 'Groups', permission: 'group.view' },
          },
          // Vehicle Types, Locations, Materials, Expense Categories,
          // Payment Modes, Tyres, Service Categories, Designations,
          // GST Masters — all served by the generic
          // config-driven page, keyed off the :module param.
          {
            path: ':module',
            name: 'masters-simple',
            component: () => import('@/pages/masters/SimpleMasterPage.vue'),
            meta: { breadcrumb: 'Masters' },
          },
        ],
      },
      {
        path: 'administration',
        name: 'administration',
        component: RouterView,
        meta: { breadcrumb: 'Administration' },
        children: [
          {
            path: '',
            name: 'administration-hub',
            component: () => import('@/pages/administration/AdministrationHub.vue'),
            meta: { breadcrumb: 'Administration', permission: 'administration.view' },
          },
          {
            path: 'users',
            name: 'administration-users',
            component: () => import('@/pages/administration/Users.vue'),
            meta: { breadcrumb: 'Users', permission: 'administration.view' },
          },
          {
            path: 'roles',
            name: 'administration-roles',
            component: () => import('@/pages/administration/Roles.vue'),
            meta: { breadcrumb: 'Roles', permission: 'administration.view' },
          },
          {
            path: 'permissions',
            name: 'administration-permissions',
            component: () => import('@/pages/administration/Permissions.vue'),
            meta: { breadcrumb: 'Permissions', permission: 'administration.view' },
          },
          {
            path: 'departments',
            name: 'administration-departments',
            component: () => import('@/pages/administration/Departments.vue'),
            meta: { breadcrumb: 'Departments', permission: 'administration.view' },
          },
          {
            path: 'teams',
            name: 'administration-teams',
            component: () => import('@/pages/administration/Teams.vue'),
            meta: { breadcrumb: 'Teams', permission: 'administration.view' },
          },
          {
            path: 'audit-logs',
            name: 'administration-audit-logs',
            component: () => import('@/pages/administration/AuditLogs.vue'),
            meta: { breadcrumb: 'Audit Logs', permission: 'administration.view' },
          },
          {
            // Every authenticated user can manage their own profile, regardless
            // of whether they have the Administration module's permission.
            path: 'profile',
            name: 'administration-profile',
            component: () => import('@/pages/administration/Profile.vue'),
            meta: { breadcrumb: 'Profile' },
          },
        ],
      },
    ],
  },
  {
    path: '/unauthorized',
    name: 'unauthorized',
    component: () => import('@/pages/Unauthorized.vue'),
    meta: { public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFound.vue'),
    meta: { public: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return next(firstAccessibleModulePath(authStore.hasPermission));
  }

  const requiredPermission = to.meta.permission as string | undefined;
  if (requiredPermission && !authStore.hasPermission(requiredPermission)) {
    return next({ name: 'unauthorized' });
  }

  return next();
});

router.afterEach((to) => {
  const breadcrumb = to.meta.breadcrumb as string | undefined;
  if (breadcrumb && !to.meta.public) {
    recordVisit({ path: to.fullPath, title: breadcrumb });
  }
});

export default router;
