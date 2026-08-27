import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ROLES = [
  { name: 'SUPER_ADMIN', description: 'Super Administrator with full access' },
  { name: 'ADMIN', description: 'Administrator' },
  { name: 'DRIVER', description: 'Driver' },
  { name: 'CUSTOMER', description: 'Customer' },
  { name: 'OPERATION_MANAGER', description: 'Operation Manager (oversees Intent + Vehicle Operation teams)' },
  { name: 'ACCOUNTING_MANAGER', description: 'Accounting Manager (oversees Accounts team)' },
  { name: 'INTENT_CREATOR', description: 'Intent Creation Team member' },
  { name: 'OWN_FLEET_OPERATOR', description: 'Vehicle Operations — Own Fleet Team member' },
  { name: 'MARKET_FLEET_OPERATOR', description: 'Vehicle Operations — Market Fleet Team member' },
  { name: 'ACCOUNTS_EXECUTIVE', description: 'Accounts Team member' },
];

// Phase 3 — Masters. Each prefix gets .view/.create/.edit/.delete permissions.
// (company.* already existed from Phase 2 and is intentionally excluded here.)
const MASTER_MODULE_LABELS: Record<string, string> = {
  location: 'Locations',
  vehicle_type: 'Vehicle Types',
  vehicle: 'Vehicles',
  driver: 'Drivers',
  supplier: 'Suppliers',
  material: 'Materials',
  expense_category: 'Expense Categories',
  payment_mode: 'Payment Modes',
  tyre: 'Tyres',
  service_category: 'Service Categories',
  designation: 'Designations',
  gst_master: 'GST Masters',
  employee: 'Employees',
};
const MASTER_MODULE_PREFIXES = Object.keys(MASTER_MODULE_LABELS);

// Phase 4 — Fleet Management. Each prefix gets .view/.create/.edit/.delete.
const FLEET_MODULE_LABELS: Record<string, string> = {
  fuel_card: 'Fuel Cards',
  fuel_entry: 'Fuel Entries',
  maintenance: 'Maintenance Records',
  spare_part: 'Spare Parts',
  spare_part_usage: 'Spare Part Usage',
  vehicle_expense: 'Vehicle Expenses',
};
const FLEET_MODULE_PREFIXES = Object.keys(FLEET_MODULE_LABELS);

// Phase 5 — Operations. Intent and Trip get bespoke action permissions
// (not a uniform view/create/edit/delete set) since the business workflow
// has specific verbs (approve, reject, start, complete, assign...).
const OPERATIONS_PERMISSIONS = [
  { name: 'intent.view', description: 'View Customer Intents' },
  { name: 'intent.create', description: 'Create Customer Intents' },
  { name: 'intent.edit', description: 'Edit Customer Intents' },
  { name: 'intent.delete', description: 'Delete Customer Intents' },
  { name: 'intent.approve', description: 'Approve Customer Intents (Operation Manager)' },
  { name: 'intent.reject', description: 'Reject Customer Intents (Operation Manager)' },
  { name: 'intent.cancel', description: 'Cancel Customer Intents' },
  { name: 'trip.view', description: 'View Trips' },
  { name: 'trip.create', description: 'Create Trips (Trip Planning)' },
  { name: 'trip.edit', description: 'Edit Trip Planning Details' },
  { name: 'trip.delete', description: 'Delete Trips' },
  { name: 'trip.assign', description: 'Assign Vehicle/Driver to a Trip' },
  { name: 'trip.start', description: 'Start a Trip' },
  { name: 'trip.track', description: 'Update Trip Tracking Status' },
  { name: 'trip.complete', description: 'Complete a Trip' },
  { name: 'trip.cancel', description: 'Cancel a Trip' },
  { name: 'pod.upload', description: 'Upload Trip Documents (POD/LR/Invoice/Delivery Proof)' },
  { name: 'pod.verify', description: 'Verify Trip Documents' },
  { name: 'trip_expense.view', description: 'View Trip Expenses' },
  { name: 'trip_expense.create', description: 'Create Trip Expenses' },
  { name: 'trip_expense.edit', description: 'Edit Trip Expenses' },
  { name: 'trip_expense.delete', description: 'Delete Trip Expenses' },
  { name: 'operations.view', description: 'View Operations Dashboard' },
];

// Phase 16 — Booking & LR. Parcel bookings taken on the public MJ Express
// website and worked through to a Lorry Receipt here. Like Intent/Trip above,
// the workflow verbs are bespoke rather than a uniform CRUD set, so that
// confirming a booking and issuing an LR can be granted separately.
const BOOKING_PERMISSIONS = [
  { name: 'booking.view', description: 'View Bookings and Lorry Receipts' },
  { name: 'booking.create', description: 'Enter Counter Bookings (walk-in / phone)' },
  { name: 'booking.confirm', description: 'Confirm Bookings (issues the LR and tracking numbers)' },
  { name: 'booking.reject', description: 'Reject Bookings' },
  { name: 'booking.assign_vehicle', description: 'Assign Vehicle and Driver to a Booking' },
  { name: 'booking.generate_lr', description: 'Generate the Lorry Receipt for a Booking' },
  { name: 'booking.track', description: 'Update Booking Delivery Status (Picked Up ... Delivered)' },
  { name: 'booking.delete', description: 'Delete Bookings' },
];

// Phase 6 — Accounts. Deliberately uses the same camelCase multi-word
// style as the brief's own examples (supplierPayment.create,
// tripFinancial.view) rather than the snake_case used elsewhere, since
// those exact strings were specified.
const ACCOUNTS_PERMISSIONS = [
  { name: 'invoice.view', description: 'View Customer Invoices' },
  { name: 'invoice.create', description: 'Generate Customer Invoices' },
  { name: 'invoice.edit', description: 'Edit Customer Invoices' },
  { name: 'invoice.delete', description: 'Delete Customer Invoices' },
  { name: 'invoice.cancel', description: 'Cancel Customer Invoices' },
  { name: 'invoice.override_credit_hold', description: 'Override a blocked/over-limit customer to invoice anyway' },
  { name: 'creditNote.view', description: 'View Credit Notes' },
  { name: 'creditNote.create', description: 'Create Credit Notes' },
  { name: 'customerDebitNote.create', description: 'Create Customer Debit Notes' },
  { name: 'receipt.view', description: 'View Customer Receipts' },
  { name: 'receipt.create', description: 'Create Customer Receipts' },
  { name: 'receipt.edit', description: 'Edit Customer Receipts' },
  { name: 'receipt.allocate', description: 'Allocate an Advance Receipt to an Invoice' },
  { name: 'supplierBill.view', description: 'View Supplier Bills' },
  { name: 'supplierBill.create', description: 'Generate Supplier Bills' },
  { name: 'supplierBill.edit', description: 'Edit / Cancel Supplier Bills' },
  { name: 'supplierBill.delete', description: 'Delete a Supplier Bill with no payments or notes against it' },
  { name: 'supplierCreditNote.create', description: 'Create Supplier Credit Notes' },
  { name: 'supplierDebitNote.create', description: 'Create Supplier Debit Notes' },
  { name: 'supplierPayment.view', description: 'View Supplier Payments' },
  { name: 'supplierPayment.create', description: 'Create Supplier Payments' },
  { name: 'supplierPayment.edit', description: 'Edit Supplier Payments' },
  { name: 'supplierPayment.allocate', description: 'Allocate an Advance Supplier Payment to a Bill' },
  { name: 'collectionActivity.view', description: 'View Collection Activities' },
  { name: 'collectionActivity.create', description: 'Log Collection Activities (calls, reminders, promises to pay)' },
  { name: 'tripFinancial.view', description: 'View Trip Financials (Income/Expenses/P&L)' },
  { name: 'accounts.dashboard', description: 'View Accounts Dashboard' },
  // Capital Account — partner contribution/withdrawal transactions (money
  // movement); the CapitalPartner master itself is an Accounting
  // Foundation simple-master permission (capital_partner.*), see below.
  { name: 'capital_transaction.view', description: 'View Capital Account transactions (partner contributions/withdrawals)' },
  { name: 'capital_transaction.create', description: 'Record a Capital Contribution or Withdrawal' },
  { name: 'capital_transaction.edit', description: 'Correct a Capital Transaction (re-posts its fund movement)' },
  { name: 'capital_transaction.delete', description: 'Delete a Capital Transaction' },
  // Loans & EMI — one module covering Vehicle/Bank/Business/Owner/Other
  // loans. Paying an EMI is its own permission because it moves real money
  // out of a bank account, unlike editing a loan's descriptive fields.
  { name: 'loan.view', description: 'View Loans & EMI schedules' },
  { name: 'loan.create', description: 'Create a Loan (generates its EMI schedule)' },
  { name: 'loan.edit', description: 'Edit a Loan / close or foreclose it' },
  { name: 'loan.delete', description: 'Delete a Loan that has no paid EMI' },
  { name: 'loan_emi.pay', description: 'Pay a Loan EMI installment' },
  { name: 'loan_emi.reverse', description: 'Reverse a paid Loan EMI installment' },
  // Opening Balance & Migration - bringing the closing position of the old
  // Tally books in as this system's opening position. Finalizing is its own
  // permission because it locks the opening figures against further edits.
  { name: 'opening_balance.view', description: 'View Opening Balance & Migration' },
  { name: 'opening_balance.create', description: 'Record an opening balance brought over from the old system' },
  { name: 'opening_balance.edit', description: 'Edit / reclassify an opening balance' },
  { name: 'opening_balance.delete', description: 'Delete an opening balance' },
  { name: 'opening_balance.finalize', description: 'Finalize or reopen the migration' },
];

// Phase 7 — Accounting Foundation. Reduced to just Organization (the legal
// entity these books belong to) and Currency after the Voucher/Ledger
// double-entry engine (Chart of Accounts, Ledgers, Financial Years, Cost
// Centers, Number Series, Opening Balances, Approval Rules) was removed in
// favor of directly-stored BankAccount/CashAccount balances.
const ACCOUNTING_FOUNDATION_SIMPLE_LABELS: Record<string, string> = {
  currency: 'Currencies',
  capital_partner: 'Capital Partners',
};
const ACCOUNTING_FOUNDATION_SIMPLE_PREFIXES = Object.keys(ACCOUNTING_FOUNDATION_SIMPLE_LABELS);

const ACCOUNTING_FOUNDATION_PERMISSIONS = [
  { name: 'organization.view', description: 'View Organizations (accounting legal entities)' },
  { name: 'organization.create', description: 'Create Organizations' },
  { name: 'organization.edit', description: 'Edit Organizations' },
  ...ACCOUNTING_FOUNDATION_SIMPLE_PREFIXES.flatMap((prefix) => [
    { name: `${prefix}.view`, description: `View ${ACCOUNTING_FOUNDATION_SIMPLE_LABELS[prefix]}` },
    { name: `${prefix}.create`, description: `Create ${ACCOUNTING_FOUNDATION_SIMPLE_LABELS[prefix]}` },
    { name: `${prefix}.edit`, description: `Edit ${ACCOUNTING_FOUNDATION_SIMPLE_LABELS[prefix]}` },
    { name: `${prefix}.delete`, description: `Delete ${ACCOUNTING_FOUNDATION_SIMPLE_LABELS[prefix]}` },
  ]),
];

// Accounting Phase 3 — Banking & Cash Management. bankAccount/cashAccount
// now carry their balance directly (BankAccount.currentBalance /
// CashAccount.currentBalance) — no Voucher/Ledger engine underneath.
const BANKING_PERMISSIONS = [
  { name: 'bankAccount.view', description: 'View Bank Accounts' },
  { name: 'bankAccount.create', description: 'Create Bank Accounts' },
  { name: 'bankAccount.edit', description: 'Edit / Activate / Deactivate Bank Accounts' },
  { name: 'bankAccount.delete', description: 'Delete a Bank Account (only one never used by a transaction)' },
  { name: 'cashAccount.view', description: 'View Cash Accounts' },
  { name: 'cashAccount.create', description: 'Create Cash Accounts' },
  { name: 'cashAccount.edit', description: 'Edit / Activate / Deactivate Cash Accounts' },
  { name: 'cashAccount.delete', description: 'Delete a Cash Account (only one never used by a transaction)' },
  { name: 'bankTransfer.view', description: 'View Bank Transfers' },
  { name: 'bankTransfer.create', description: 'Create Bank Transfers (Bank/Cash Deposit, Withdrawal, Transfer)' },
  { name: 'bankTransfer.edit', description: 'Edit a Bank Transfer (re-posts the money it moved)' },
  { name: 'bankTransfer.delete', description: 'Delete a Bank Transfer (puts the money back)' },
  { name: 'chequeBook.view', description: 'View Cheque Books' },
  { name: 'chequeBook.create', description: 'Create Cheque Books' },
  { name: 'chequeBook.edit', description: 'Edit / Activate / Deactivate Cheque Books' },
  { name: 'chequeBook.delete', description: 'Delete an unused Cheque Book' },
  { name: 'cheque.view', description: 'View Cheques / Cheque Register' },
  { name: 'cheque.create', description: 'Issue or Record a Received Cheque' },
  { name: 'cheque.edit', description: 'Edit, Deposit or mark a Cheque as Presented' },
  { name: 'cheque.delete', description: 'Delete a Cheque that never cleared or bounced' },
  { name: 'cheque.clear', description: 'Clear a Cheque' },
  { name: 'cheque.bounce', description: 'Record a Cheque Bounce' },
  { name: 'cheque.cancel', description: 'Cancel a Cheque or record Stop Payment' },
  { name: 'bankCharge.create', description: 'Record Bank Charges' },
  { name: 'interest.create', description: 'Record Interest Received/Paid' },
  { name: 'pettyCashRequest.view', description: 'View Petty Cash Requests' },
  { name: 'pettyCashRequest.create', description: 'Create Petty Cash Requests' },
  { name: 'pettyCashRequest.edit', description: 'Edit a pending Petty Cash Request' },
  { name: 'pettyCashRequest.delete', description: 'Delete a Petty Cash Request that never disbursed' },
  { name: 'pettyCashRequest.approve', description: 'Approve/Reject a Petty Cash Request' },
  { name: 'pettyCashRequest.disburse', description: 'Disburse or Close a Petty Cash Request' },
  { name: 'bankDashboard.view', description: 'View the Bank Dashboard' },
];

// Phase 8 — Reports. Reports read existing data only (no new business
// tables) — reports.view gates the "available reports" index endpoint,
// the four category permissions gate their respective report queries,
// and reports.export gates every export format (xlsx/pdf/csv/print).
const REPORTS_PERMISSIONS = [
  { name: 'reports.view', description: 'View list of available reports' },
  { name: 'reports.operations', description: 'Run Operations Reports' },
  { name: 'reports.fleet', description: 'Run Fleet Reports' },
  { name: 'reports.accounts', description: 'Run Accounts Reports' },
  { name: 'reports.management', description: 'Run Management Reports' },
  { name: 'reports.export', description: 'Export any report (Excel/PDF/CSV/Print)' },
];

// Phase 9 — Performance. performance.view is granted to every role (every
// user can see their own performance); performance.team is Admin-only
// (Operations + Accounts team performance rollup).
const PERFORMANCE_PERMISSIONS = [
  { name: 'performance.view', description: 'View Own Performance Report' },
  { name: 'performance.team', description: 'View Operations/Accounts Team Performance (Admin)' },
];

// Phase 11 — Driver Accounts, Employee Payroll & Settlements (docs Phase
// 5). Same camelCase multi-word .verb style as ACCOUNTS_PERMISSIONS above,
// since this is another Accounts-track sub-phase. `employee.*` itself is
// NOT listed here — Employee rides the generic masterCrudFactory
// (masters-simple.routes.ts), which derives employee.view/create/edit/
// delete from its permissionPrefix automatically.
const DRIVER_PAYROLL_PERMISSIONS = [
  { name: 'driverAdvance.view', description: 'View Driver Advances' },
  { name: 'driverAdvance.create', description: 'Request a Driver Advance' },
  { name: 'driverAdvance.approve', description: 'Approve/Reject a Driver Advance' },
  { name: 'driverAdvance.delete', description: 'Delete a Driver Advance' },
  { name: 'driverEarning.view', description: 'View Driver Allowances/Incentives' },
  { name: 'driverEarning.create', description: 'Record a Driver Allowance/Incentive' },
  { name: 'driverEarning.approve', description: 'Approve/Reject a Driver Allowance/Incentive' },
  { name: 'driverEarning.delete', description: 'Delete a Driver Allowance/Incentive' },
  { name: 'driverEarningRule.view', description: 'View Driver Allowance/Incentive Rate Cards' },
  { name: 'driverEarningRule.create', description: 'Create a Driver Allowance/Incentive Rate Card' },
  { name: 'driverEarningRule.edit', description: 'Edit a Driver Allowance/Incentive Rate Card' },
  { name: 'driverEarningRule.delete', description: 'Delete a Driver Allowance/Incentive Rate Card' },
  { name: 'driverPenalty.view', description: 'View Driver Penalties & Recoveries' },
  { name: 'driverPenalty.create', description: 'Record a Driver Penalty/Recovery' },
  { name: 'driverPenalty.approve', description: 'Approve/Reject a Driver Penalty/Recovery' },
  { name: 'driverPenalty.delete', description: 'Delete a Driver Penalty/Recovery' },
  { name: 'driverSettlement.view', description: 'View Driver Settlements' },
  { name: 'driverSettlement.create', description: 'Create/Calculate a Driver Settlement' },
  { name: 'driverSettlement.approve', description: 'Approve a Driver Settlement' },
  { name: 'driverSettlement.pay', description: 'Pay a Driver Settlement' },
  { name: 'driverSettlement.delete', description: 'Delete an unpaid Driver Settlement' },
  { name: 'driverStatement.view', description: 'View a Driver Ledger Statement' },
  { name: 'driverSalaryStructure.view', description: 'View Driver Salary Structures' },
  { name: 'driverSalaryStructure.create', description: 'Create a Driver Salary Structure' },
  { name: 'driverSalaryStructure.edit', description: 'Edit a Driver Salary Structure' },
  { name: 'driverSalaryStructure.delete', description: 'Delete a Driver Salary Structure' },
  { name: 'salaryStructure.view', description: 'View Salary Structures' },
  { name: 'salaryStructure.create', description: 'Create a Salary Structure' },
  { name: 'salaryStructure.edit', description: 'Edit a Salary Structure' },
  { name: 'salaryStructure.delete', description: 'Delete a Salary Structure' },
  { name: 'employeeAdvance.view', description: 'View Employee (Salary) Advances' },
  { name: 'employeeAdvance.create', description: 'Request an Employee Advance' },
  { name: 'employeeAdvance.approve', description: 'Approve/Reject an Employee Advance' },
  { name: 'employeeAdvance.delete', description: 'Delete an Employee Advance' },
  { name: 'payrollDashboard.view', description: 'View the Payroll Dashboard' },
];

// Phase 12 — Vehicle Assets, Loans & Expense Management (docs Phase 6).
// Follows FLEET_MODULE_LABELS' snake_case convention (design doc §18) —
// these prefixes don't collide with any existing fuel_card/fuel_entry/
// maintenance/spare_part/vehicle_expense/fleet/vehicle.assign keys.
// vehicle_expense.* already exists from Phase 4 (Fleet); only the new
// .approve verb is added here, alongside every genuinely new prefix.
const VEHICLE_ASSET_PERMISSIONS = [
  { name: 'asset_category.view', description: 'View Asset Categories' },
  { name: 'asset_category.create', description: 'Create Asset Categories' },
  { name: 'asset_category.edit', description: 'Edit Asset Categories' },
  { name: 'asset_category.delete', description: 'Delete Asset Categories' },
  { name: 'asset.view', description: 'View the Fixed Asset Register' },
  { name: 'asset.create', description: 'Register a Fixed Asset (purchase)' },
  { name: 'asset.edit', description: 'Edit a Fixed Asset register entry' },
  { name: 'asset.approve', description: 'Approve a Fixed Asset purchase (records how it was funded)' },
  { name: 'asset.delete', description: 'Delete an unapproved Fixed Asset' },
  { name: 'vehicle_expense.approve', description: 'Approve/Reject a Vehicle Expense' },
  { name: 'fasttag.view', description: 'View FastTag Accounts & Transactions' },
  { name: 'fasttag.create', description: 'Create a FastTag Account' },
  { name: 'fasttag.edit', description: 'Recharge the FastTag wallet / Log FastTag Usage / Refund / Adjust / Edit a transaction' },
  { name: 'fasttag.delete', description: 'Delete a FastTag transaction' },
  // The diesel/fuel card prepaid account. fuel_card.* already exists as the
  // card catalog's own CRUD prefix, so the shared account gets its own.
  { name: 'fuel_card_account.view', description: 'View the Diesel Card account & its transactions' },
  { name: 'fuel_card_account.edit', description: 'Recharge the Diesel Card account / Refund / Adjust / Edit a transaction' },
  { name: 'fuel_card_account.delete', description: 'Delete a Diesel Card transaction' },
];

// Phase 13 — Financial Reporting. GST/TDS compliance, financial-statement
// and Budget/Year-End-Closing permissions were removed with the
// Voucher/Ledger double-entry engine they depended on; the reports below
// read directly from Invoice/SupplierBill/Driver/Vehicle data instead.
const FINANCIAL_REPORTING_PERMISSIONS = [
  { name: 'profitability_report.view', description: 'View Customer/Supplier/Vehicle/Driver Profitability' },
  { name: 'outstanding_report.view', description: 'View Driver/Employee Outstanding Reports' },
  { name: 'expense_analysis.view', description: 'View category-wise Expense Analysis' },
  { name: 'mis_dashboard.view', description: 'View the MIS Dashboard' },
  { name: 'report_schedule.view', description: 'View Report Schedule definitions' },
  { name: 'report_schedule.create', description: 'Create a Report Schedule definition' },
  { name: 'report_schedule.edit', description: 'Edit a Report Schedule definition' },
  { name: 'report_schedule.delete', description: 'Delete a Report Schedule definition' },
  { name: 'balance_sheet.view', description: 'View the Balance Sheet (Assets/Liabilities financial position report)' },
  { name: 'profit_loss.view', description: 'View the Profit & Loss report' },
];

// Phase 14 (docs Phase 8) — Enterprise Integration, Automation, Audit,
// Security & Final Optimization (the final phase).
const ENTERPRISE_PERMISSIONS = [
  { name: 'system_setting.view', description: 'View System Configuration settings' },
  { name: 'system_setting.edit', description: 'Edit System Configuration settings' },
  { name: 'system_exception.view', description: 'View Exception Management' },
  { name: 'system_exception.manage', description: 'Acknowledge / Resolve exceptions' },
  { name: 'business_rule.view', description: 'View Business Rules' },
  { name: 'business_rule.create', description: 'Create a Business Rule' },
  { name: 'business_rule.edit', description: 'Edit a Business Rule' },
  { name: 'business_rule.delete', description: 'Delete a Business Rule' },
  { name: 'backup.view', description: 'View Backup records' },
  { name: 'backup.run', description: 'Trigger a manual backup / restore validation' },
  { name: 'archive.view', description: 'View Archive Runs' },
  { name: 'archive.run', description: 'Trigger a Data Archiving run' },
  { name: 'approval_delegation.view', description: 'View Approval Delegations' },
  { name: 'approval_delegation.create', description: 'Create / revoke an Approval Delegation' },
  { name: 'enterprise_audit.view', description: 'View the Enterprise Audit Center (login/config/API/export audit)' },
  { name: 'data_import.view', description: 'View Import Batches' },
  { name: 'data_import.run', description: 'Run a bulk data import' },
  { name: 'webhook.view', description: 'View Webhook subscriptions and deliveries' },
  { name: 'webhook.manage', description: 'Create / edit / test Webhook subscriptions' },
  { name: 'api_key.manage', description: 'Create / revoke API Keys' },
  { name: 'ai_insight.view', description: 'View / generate AI Foundation insights' },
  { name: 'kpi.view', description: 'View KPI / Business Intelligence dashboard' },
  { name: 'automation_rule.view', description: 'View Automation Rules and run logs' },
  { name: 'automation_rule.manage', description: 'Create / edit / run Automation Rules' },
  { name: 'system_dashboard.view', description: 'View System Health / Metrics / Production Readiness' },
];

// Phase 15 — Business Financial Entry. Deliberately small — one screen,
// one reversal path, no manual allocation step — the whole point of this
// phase is that a non-accountant needs far fewer permission concepts than
// the Voucher engine it sits on top of (financialState.view is read-only
// business-state, granted much more broadly than financialEntry.* itself).
const FINANCIAL_ENTRY_PERMISSIONS = [
  { name: 'financialEntry.view', description: 'View Financial Entries' },
  { name: 'financialEntry.create', description: 'Record a Financial Entry (money received/paid/transferred/etc.)' },
  { name: 'financialEntry.edit', description: 'Correct a Financial Entry (preserves the original, creates a corrected replacement)' },
  { name: 'financialEntry.approve', description: 'Approve a Financial Entry' },
  { name: 'financialEntry.cancel', description: 'Cancel a Financial Entry' },
  { name: 'financialEntry.reverse', description: 'Reverse a posted Financial Entry' },
  { name: 'financialEntry.delete', description: 'Delete a Draft, Cancelled or Reversed Financial Entry' },
  { name: 'financialState.view', description: 'View Customer/Supplier/Driver/Employee/Bank/Cash financial state and the Financial Dashboard' },
];

const PERMISSIONS = [
  { name: 'dashboard.view', description: 'View Dashboard' },
  { name: 'users.view', description: 'View Users' },
  { name: 'users.create', description: 'Create Users' },
  { name: 'users.update', description: 'Update Users' },
  { name: 'users.delete', description: 'Delete Users' },
  { name: 'operations.view', description: 'View Operations' },
  { name: 'fleet.view', description: 'View Fleet' },
  { name: 'accounts.view', description: 'View Accounts' },
  { name: 'reports.view', description: 'View Reports' },
  { name: 'masters.view', description: 'View Masters' },
  { name: 'administration.view', description: 'View Administration' },
  // Phase 2 — Users
  { name: 'user.view', description: 'View Users' },
  { name: 'user.create', description: 'Create Users' },
  { name: 'user.edit', description: 'Edit Users' },
  { name: 'user.delete', description: 'Deactivate/Delete Users' },
  { name: 'user.reset_password', description: 'Reset another user\u2019s password' },
  // Phase 2 — Roles
  { name: 'role.view', description: 'View Roles' },
  { name: 'role.create', description: 'Create Roles' },
  { name: 'role.edit', description: 'Edit Roles' },
  { name: 'role.delete', description: 'Delete Roles' },
  { name: 'role.clone', description: 'Clone Roles' },
  { name: 'role.assign_permissions', description: 'Assign/Remove Permissions on a Role' },
  // Phase 2 — Permissions
  { name: 'permission.view', description: 'View Permissions' },
  // Phase 2 — Departments
  { name: 'department.view', description: 'View Departments' },
  { name: 'department.create', description: 'Create Departments' },
  { name: 'department.edit', description: 'Edit Departments' },
  { name: 'department.delete', description: 'Delete Departments' },
  // Phase 2 — Teams
  { name: 'team.view', description: 'View Teams' },
  { name: 'team.create', description: 'Create Teams' },
  { name: 'team.edit', description: 'Edit Teams' },
  { name: 'team.delete', description: 'Delete Teams' },
  { name: 'team.assign', description: 'Assign Users to Teams' },
  // Phase 2 — Companies
  { name: 'company.view', description: 'View Companies' },
  { name: 'company.create', description: 'Create Companies' },
  { name: 'company.edit', description: 'Edit Companies' },
  { name: 'company.delete', description: 'Delete Companies' },
  { name: 'company.assign', description: "Reassign a Company's Group" },
  // Groups — pools of Intent Creators / Own & Market Fleet Operators /
  // Accounts Executives, one Group per set of Companies.
  { name: 'group.view', description: 'View Groups' },
  { name: 'group.create', description: 'Create Groups' },
  { name: 'group.edit', description: 'Edit Groups' },
  { name: 'group.delete', description: 'Delete Groups' },
  { name: 'group.assign', description: 'Assign Companies and Members to a Group' },
  // Phase 2 — Audit Logs
  { name: 'audit.view', description: 'View Audit Logs' },
  // Phase 2 — Profile
  { name: 'profile.view', description: 'View Own Profile' },
  { name: 'profile.update', description: 'Update Own Profile' },
  // Phase 2 — Dynamic Menu Administration
  { name: 'menu.manage', description: 'Manage Modules, Menus and Role-Menu Mapping' },
  // Phase 3 — Masters (company.* already exists from Phase 2; extended here)
  { name: 'company.upload_logo', description: 'Upload Company Logo' },
  ...MASTER_MODULE_PREFIXES.flatMap((prefix) => [
    { name: `${prefix}.view`, description: `View ${MASTER_MODULE_LABELS[prefix]}` },
    { name: `${prefix}.create`, description: `Create ${MASTER_MODULE_LABELS[prefix]}` },
    { name: `${prefix}.edit`, description: `Edit ${MASTER_MODULE_LABELS[prefix]}` },
    { name: `${prefix}.delete`, description: `Delete ${MASTER_MODULE_LABELS[prefix]}` },
  ]),
  // Phase 4 — Fleet Management
  { name: 'fleet.view', description: 'View Fleet Dashboard' },
  { name: 'fleet.create', description: 'General Fleet module create access' },
  { name: 'fleet.edit', description: 'General Fleet module edit access' },
  { name: 'fleet.delete', description: 'General Fleet module delete access' },
  { name: 'vehicle.assign', description: 'Assign/unassign Driver to a Vehicle' },
  ...FLEET_MODULE_PREFIXES.flatMap((prefix) => [
    { name: `${prefix}.view`, description: `View ${FLEET_MODULE_LABELS[prefix]}` },
    { name: `${prefix}.create`, description: `Create ${FLEET_MODULE_LABELS[prefix]}` },
    { name: `${prefix}.edit`, description: `Edit ${FLEET_MODULE_LABELS[prefix]}` },
    { name: `${prefix}.delete`, description: `Delete ${FLEET_MODULE_LABELS[prefix]}` },
  ]),
  ...OPERATIONS_PERMISSIONS,
  ...BOOKING_PERMISSIONS,
  ...ACCOUNTS_PERMISSIONS,
  ...ACCOUNTING_FOUNDATION_PERMISSIONS,
  ...BANKING_PERMISSIONS,
  ...REPORTS_PERMISSIONS,
  ...PERFORMANCE_PERMISSIONS,
  ...DRIVER_PAYROLL_PERMISSIONS,
  ...VEHICLE_ASSET_PERMISSIONS,
  ...FINANCIAL_REPORTING_PERMISSIONS,
  ...ENTERPRISE_PERMISSIONS,
  ...FINANCIAL_ENTRY_PERMISSIONS,
];

async function main() {
  console.log('Seeding roles...');
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log('Seeding permissions...');
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  // Sweep up the permissions of removed modules — Branches and Trailer
  // Types — which earlier runs of this seed created (role_permissions
  // cascade with them).
  await prisma.permission.deleteMany({
    where: { OR: [{ name: { startsWith: 'branch.' } }, { name: { startsWith: 'trailer_type.' } }] },
  });

  console.log('Assigning all permissions to SUPER_ADMIN...');
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SUPER_ADMIN' } });
  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('Assigning dashboard.view to ADMIN...');
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const dashboardPermission = await prisma.permission.findUniqueOrThrow({ where: { name: 'dashboard.view' } });
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: adminRole.id,
        permissionId: dashboardPermission.id,
      },
    },
    update: {},
    create: {
      roleId: adminRole.id,
      permissionId: dashboardPermission.id,
    },
  });

  console.log('Assigning all Phase 2 Administration permissions to ADMIN...');
  const phase2AdminPermissionNames = [
    'administration.view',
    'user.view', 'user.create', 'user.edit', 'user.delete', 'user.reset_password',
    'role.view', 'role.create', 'role.edit', 'role.delete', 'role.clone', 'role.assign_permissions',
    'permission.view',
    'department.view', 'department.create', 'department.edit', 'department.delete',
    'team.view', 'team.create', 'team.edit', 'team.delete', 'team.assign',
    'company.view', 'company.create', 'company.edit', 'company.delete', 'company.assign',
    'group.view', 'group.create', 'group.edit', 'group.delete', 'group.assign',
    'audit.view',
    'profile.view', 'profile.update',
    'menu.manage',
    // Companies/Groups now live under Masters, so ADMIN needs the module
    // gate to reach them from the Masters hub. Each master page still
    // enforces its own permission on top of this.
    'masters.view',
  ];
  const phase2AdminPermissions = await prisma.permission.findMany({
    where: { name: { in: phase2AdminPermissionNames } },
  });
  for (const permission of phase2AdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  console.log('Assigning all Phase 3 Masters permissions to ADMIN...');
  const phase3AdminPermissionNames = [
    'company.upload_logo',
    ...MASTER_MODULE_PREFIXES.flatMap((prefix) => [
      `${prefix}.view`, `${prefix}.create`, `${prefix}.edit`, `${prefix}.delete`,
    ]),
  ];
  const phase3AdminPermissions = await prisma.permission.findMany({
    where: { name: { in: phase3AdminPermissionNames } },
  });
  for (const permission of phase3AdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  console.log('Assigning fleet-relevant Masters permissions to FLEET_MANAGER...');
  const fleetManagerRole = await prisma.role.findUnique({ where: { name: 'FLEET_MANAGER' } });
  if (fleetManagerRole) {
    const fleetPrefixes = ['vehicle_type', 'vehicle', 'driver', 'tyre', 'supplier'];
    const fleetPermissionNames = [
      ...fleetPrefixes.flatMap((prefix) => [`${prefix}.view`, `${prefix}.create`, `${prefix}.edit`]),
      // Fleet Manager owns the vehicle master end-to-end (unlike the other
      // fleet-adjacent masters here, which stay create/edit-only for this
      // role) — they need to be able to remove a vehicle record, not just
      // deactivate it.
      'vehicle.delete',
    ];
    const fleetPermissions = await prisma.permission.findMany({
      where: { name: { in: fleetPermissionNames } },
    });
    for (const permission of fleetPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: fleetManagerRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: fleetManagerRole.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning all Phase 4 Fleet Management permissions to ADMIN...');
  const phase4AdminPermissionNames = [
    'fleet.view', 'fleet.create', 'fleet.edit', 'fleet.delete',
    'vehicle.assign',
    ...FLEET_MODULE_PREFIXES.flatMap((prefix) => [
      `${prefix}.view`, `${prefix}.create`, `${prefix}.edit`, `${prefix}.delete`,
    ]),
  ];
  const phase4AdminPermissions = await prisma.permission.findMany({
    where: { name: { in: phase4AdminPermissionNames } },
  });
  for (const permission of phase4AdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  console.log('Assigning operational Fleet Management permissions to FLEET_MANAGER...');
  if (fleetManagerRole) {
    const phase4FleetManagerPermissionNames = [
      'fleet.view',
      'vehicle.assign',
      ...FLEET_MODULE_PREFIXES.flatMap((prefix) => [`${prefix}.view`, `${prefix}.create`, `${prefix}.edit`]),
    ];
    const phase4FleetManagerPermissions = await prisma.permission.findMany({
      where: { name: { in: phase4FleetManagerPermissionNames } },
    });
    for (const permission of phase4FleetManagerPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: fleetManagerRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: fleetManagerRole.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning Fleet Management permissions to Own/Market Fleet Operator roles...');
  const ownFleetRole = await prisma.role.findUnique({ where: { name: 'OWN_FLEET_OPERATOR' } });
  const marketFleetRole = await prisma.role.findUnique({ where: { name: 'MARKET_FLEET_OPERATOR' } });
  const operatorPermissionNames = [
    'vehicle.view',
    'vehicle.assign',
    'fuel_entry.view', 'fuel_entry.create',
    'maintenance.view', 'maintenance.create',
    'vehicle_expense.view', 'vehicle_expense.create',
    // Needed to populate the driver picker on the Trips page (assignment
    // dialog) — without this, that lookup 403s and silently aborts the
    // page's initial data load. Same reasoning covers supplier.view:
    // MARKET_FLEET_OPERATOR needs it to populate the Market Vendor
    // dropdown when allocating a market truck.
    'driver.view', 'supplier.view',
  ];
  const operatorPermissions = await prisma.permission.findMany({ where: { name: { in: operatorPermissionNames } } });
  for (const role of [ownFleetRole, marketFleetRole]) {
    if (!role) continue;
    for (const permission of operatorPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning all Phase 5 Operations permissions to ADMIN...');
  const operationsPermissionNames = OPERATIONS_PERMISSIONS.map((p) => p.name);
  const phase5AdminPermissions = await prisma.permission.findMany({
    where: { name: { in: operationsPermissionNames } },
  });
  for (const permission of phase5AdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  console.log('Assigning Operations permissions to OPERATION_MANAGER...');
  const operationManagerRole = await prisma.role.findUnique({ where: { name: 'OPERATION_MANAGER' } });
  if (operationManagerRole) {
    // Full workflow oversight — including the approve/reject actions that
    // are exclusively theirs per the business rules. The masters view
    // permissions below are added on top since they can also create/edit
    // intents, which needs the Client/Material/Truck Type/Location dropdowns
    // on that form populated.
    const omPermissionNames = [...operationsPermissionNames, 'company.view', 'material.view', 'vehicle_type.view', 'location.view'];
    const omPermissions = await prisma.permission.findMany({ where: { name: { in: omPermissionNames } } });
    for (const permission of omPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: operationManagerRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: operationManagerRole.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning Phase 16 Booking & LR permissions to ADMIN and OPERATION_MANAGER...');
  const bookingPermissionNames = BOOKING_PERMISSIONS.map((p) => p.name);
  // Lookups ride along: vehicle.view/driver.view populate the Own Vehicle
  // branch of the allocation form, and location.view/location.create back the
  // route mapping on the confirm screen (which may need a new town adding).
  // Without them those calls 403 and the dropdowns stay empty.
  const bookingWithLookups = [
    ...bookingPermissionNames,
    'vehicle.view',
    'driver.view',
    'location.view',
    'location.create',
  ];
  const bookingPermissionRecords = await prisma.permission.findMany({ where: { name: { in: bookingWithLookups } } });
  for (const role of [adminRole, operationManagerRole]) {
    if (!role) continue;
    for (const permission of bookingPermissionRecords) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning Intent permissions to INTENT_CREATOR...');
  const intentCreatorRole = await prisma.role.findUnique({ where: { name: 'INTENT_CREATOR' } });
  if (intentCreatorRole) {
    // company.view/material.view/vehicle_type.view/location.view are needed
    // to populate the Client, Material, Truck Type, and Pickup/Delivery
    // Location dropdowns on the Create Intent form — without them those
    // lookups 403 and the dropdowns stay empty.
    const intentCreatorPermissionNames = [
      'intent.view', 'intent.create', 'intent.edit', 'intent.cancel',
      'company.view', 'material.view', 'vehicle_type.view', 'location.view',
    ];
    const intentCreatorPermissions = await prisma.permission.findMany({
      where: { name: { in: intentCreatorPermissionNames } },
    });
    for (const permission of intentCreatorPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: intentCreatorRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: intentCreatorRole.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning Trip execution permissions to Own/Market Fleet Operator roles...');
  const tripExecutionPermissionNames = [
    'trip.view', 'trip.create', 'trip.edit', 'trip.assign', 'trip.start', 'trip.track', 'trip.complete',
    'pod.upload',
    'trip_expense.view', 'trip_expense.create', 'trip_expense.edit',
    'operations.view',
  ];
  const tripExecutionPermissions = await prisma.permission.findMany({
    where: { name: { in: tripExecutionPermissionNames } },
  });
  for (const role of [ownFleetRole, marketFleetRole]) {
    if (!role) continue;
    for (const permission of tripExecutionPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning read/settlement Operations permissions to Accounts roles...');
  const accountingManagerRole = await prisma.role.findUnique({ where: { name: 'ACCOUNTING_MANAGER' } });
  const accountsExecutiveRole = await prisma.role.findUnique({ where: { name: 'ACCOUNTS_EXECUTIVE' } });
  const accountsOpsPermissionNames = ['intent.view', 'trip.view', 'trip_expense.view', 'operations.view'];
  const accountsOpsPermissions = await prisma.permission.findMany({
    where: { name: { in: accountsOpsPermissionNames } },
  });
  for (const role of [accountingManagerRole, accountsExecutiveRole]) {
    if (!role) continue;
    for (const permission of accountsOpsPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning all Phase 6 Accounts permissions to ADMIN...');
  const accountsPermissionNames = ACCOUNTS_PERMISSIONS.map((p) => p.name);
  const phase6AdminPermissions = await prisma.permission.findMany({
    where: { name: { in: accountsPermissionNames } },
  });
  for (const permission of phase6AdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  console.log('Assigning full Accounts permissions to ACCOUNTING_MANAGER...');
  if (accountingManagerRole) {
    const managerAccountsPermissions = await prisma.permission.findMany({
      where: { name: { in: accountsPermissionNames } },
    });
    for (const permission of managerAccountsPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: accountingManagerRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: accountingManagerRole.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning day-to-day Accounts permissions to ACCOUNTS_EXECUTIVE...');
  if (accountsExecutiveRole) {
    const executivePermissionNames = [
      'invoice.view', 'invoice.create', 'invoice.edit',
      'creditNote.view', 'creditNote.create', 'customerDebitNote.create',
      'receipt.view', 'receipt.create', 'receipt.edit', 'receipt.allocate',
      'supplierBill.view', 'supplierBill.create', 'supplierBill.edit',
      'supplierCreditNote.create', 'supplierDebitNote.create',
      'supplierPayment.view', 'supplierPayment.create', 'supplierPayment.edit', 'supplierPayment.allocate',
      'collectionActivity.view', 'collectionActivity.create',
      'tripFinancial.view', 'accounts.dashboard',
      'capital_transaction.view', 'capital_transaction.create', 'capital_transaction.edit',
      'loan.view', 'loan_emi.pay',
      'opening_balance.view',
    ];
    const executivePermissions = await prisma.permission.findMany({
      where: { name: { in: executivePermissionNames } },
    });
    for (const permission of executivePermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: accountsExecutiveRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: accountsExecutiveRole.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning all Phase 7 Accounting Foundation permissions to ADMIN...');
  const accountingFoundationPermissionNames = ACCOUNTING_FOUNDATION_PERMISSIONS.map((p) => p.name);
  const phase7AdminPermissions = await prisma.permission.findMany({
    where: { name: { in: accountingFoundationPermissionNames } },
  });
  for (const permission of phase7AdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  console.log('Assigning full Accounting Foundation permissions to ACCOUNTING_MANAGER...');
  if (accountingManagerRole) {
    // role.view is added on top (an Administration permission, not one of
    // ACCOUNTING_FOUNDATION_PERMISSIONS) purely so the Approval Rule form's
    // "approver role" dropdown can be populated — read-only, not role management.
    const managerFoundationPermissions = await prisma.permission.findMany({
      where: { name: { in: [...accountingFoundationPermissionNames, 'role.view'] } },
    });
    for (const permission of managerFoundationPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: accountingManagerRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: accountingManagerRole.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning day-to-day Accounting Foundation permissions to ACCOUNTS_EXECUTIVE...');
  if (accountsExecutiveRole) {
    const executiveFoundationPermissionNames = [
      'organization.view',
      'currency.view',
      'capital_partner.view', 'capital_partner.create',
    ];
    const executiveFoundationPermissions = await prisma.permission.findMany({
      where: { name: { in: executiveFoundationPermissionNames } },
    });
    for (const permission of executiveFoundationPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: accountsExecutiveRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: accountsExecutiveRole.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning all Banking & Cash Management permissions to ADMIN...');
  const bankingPermissionNames = BANKING_PERMISSIONS.map((p) => p.name);
  const bankingAdminPermissions = await prisma.permission.findMany({ where: { name: { in: bankingPermissionNames } } });
  for (const permission of bankingAdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  console.log('Assigning Banking permissions to ACCOUNTING_MANAGER...');
  if (accountingManagerRole) {
    const managerBankingPermissions = await prisma.permission.findMany({ where: { name: { in: bankingPermissionNames } } });
    for (const permission of managerBankingPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: accountingManagerRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: accountingManagerRole.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning day-to-day Banking permissions to ACCOUNTS_EXECUTIVE...');
  if (accountsExecutiveRole) {
    // View/create/edit on accounts, transfers, cheques, petty cash requests;
    // no approve — matches the Phase 9 design doc's role matrix (§15).
    const executiveBankingPermissionNames = [
      'bankAccount.view', 'bankAccount.create', 'bankAccount.edit',
      'cashAccount.view', 'cashAccount.create', 'cashAccount.edit',
      'bankTransfer.view', 'bankTransfer.create', 'bankTransfer.edit',
      'chequeBook.view', 'chequeBook.create', 'chequeBook.edit',
      'cheque.view', 'cheque.create', 'cheque.edit', 'cheque.clear', 'cheque.bounce', 'cheque.cancel',
      'bankCharge.create', 'interest.create',
      'pettyCashRequest.view', 'pettyCashRequest.create', 'pettyCashRequest.edit', 'pettyCashRequest.disburse',
      'bankDashboard.view',
    ];
    const executiveBankingPermissions = await prisma.permission.findMany({ where: { name: { in: executiveBankingPermissionNames } } });
    for (const permission of executiveBankingPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: accountsExecutiveRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: accountsExecutiveRole.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning Driver Accounts & Employee Payroll permissions (docs Phase 5)...');
  const driverPayrollPermissionNames = DRIVER_PAYROLL_PERMISSIONS.map((p) => p.name);
  const driverPayrollAdminPermissions = await prisma.permission.findMany({ where: { name: { in: driverPayrollPermissionNames } } });
  for (const permission of driverPayrollAdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  const hrManagerRole = await prisma.role.findUnique({ where: { name: 'HR_MANAGER' } });
  const payrollExecutiveRole = await prisma.role.findUnique({ where: { name: 'PAYROLL_EXECUTIVE' } });

  const driverPayrollRoleGrants: { role: { id: string } | null; permissionNames: string[] }[] = [
    // Accounts Manager: every business approval across both tracks, plus full view.
    {
      role: accountingManagerRole,
      permissionNames: [
        'employee.view', 'employee.create', 'employee.edit',
        'driverAdvance.view', 'driverAdvance.approve',
        'driverEarning.view', 'driverEarning.approve',
        'driverEarningRule.view', 'driverEarningRule.create', 'driverEarningRule.edit',
        'driverPenalty.view', 'driverPenalty.approve',
        'driverSettlement.view', 'driverSettlement.approve',
        'driverStatement.view',
        'driverSalaryStructure.view', 'driverSalaryStructure.create', 'driverSalaryStructure.edit', 'driverSalaryStructure.delete',
        'salaryStructure.view',
        'employeeAdvance.view', 'employeeAdvance.approve',
        'payrollDashboard.view',
      ],
    },
    // HR Manager: the Employee/SalaryStructure side — configures pay, doesn't disburse it.
    {
      role: hrManagerRole,
      permissionNames: [
        'employee.view', 'employee.create', 'employee.edit', 'employee.delete',
        'salaryStructure.view', 'salaryStructure.create', 'salaryStructure.edit', 'salaryStructure.delete',
        'employeeAdvance.view', 'employeeAdvance.create',
        'payrollDashboard.view',
      ],
    },
    // Payroll Executive: the day-to-day operator — pays salary directly via
    // Financial Entry (purpose=SALARY), no separate payroll-run permission needed.
    {
      role: payrollExecutiveRole,
      permissionNames: [
        'driverAdvance.view', 'driverAdvance.create',
        'driverEarning.view', 'driverEarning.create',
        'driverEarningRule.view',
        'driverPenalty.view', 'driverPenalty.create',
        'driverSettlement.view', 'driverSettlement.create', 'driverSettlement.pay',
        'driverStatement.view',
        'driverSalaryStructure.view',
        'salaryStructure.view',
        'employeeAdvance.view', 'employeeAdvance.create',
        'payrollDashboard.view',
      ],
    },
    // Accounts Executive: same day-to-day filing as Payroll Executive — this
    // track sits inside the existing Accounts team, same as AR/AP in Phase 10.
    {
      role: accountsExecutiveRole,
      permissionNames: [
        'employee.view',
        'driverAdvance.view', 'driverAdvance.create',
        'driverEarning.view', 'driverEarning.create',
        'driverEarningRule.view',
        'driverPenalty.view', 'driverPenalty.create',
        'driverSettlement.view', 'driverSettlement.create', 'driverSettlement.pay',
        'driverStatement.view',
        'driverSalaryStructure.view',
        'salaryStructure.view',
        'employeeAdvance.view', 'employeeAdvance.create',
        'payrollDashboard.view',
      ],
    },
    // Operation Manager: trip-context driver advances only — no financial approval.
    {
      role: operationManagerRole,
      permissionNames: ['driverAdvance.view', 'driverAdvance.create', 'driverEarning.view', 'driverStatement.view'],
    },
  ];

  for (const grant of driverPayrollRoleGrants) {
    if (!grant.role) continue;
    const permissions = await prisma.permission.findMany({ where: { name: { in: grant.permissionNames } } });
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: grant.role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: grant.role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning Business Financial Entry permissions (Phase 15)...');
  const financialEntryPermissionNames = FINANCIAL_ENTRY_PERMISSIONS.map((p) => p.name);
  const financialEntryAdminPermissions = await prisma.permission.findMany({ where: { name: { in: financialEntryPermissionNames } } });
  for (const permission of financialEntryAdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  const financialEntryRoleGrants: { role: { id: string } | null; permissionNames: string[] }[] = [
    // Accounts Manager: everything, including approve/cancel/reverse.
    { role: accountingManagerRole, permissionNames: financialEntryPermissionNames },
    // Accounts Executive: day-to-day recording, not approve/reverse.
    {
      role: accountsExecutiveRole,
      permissionNames: ['financialEntry.view', 'financialEntry.create', 'financialEntry.edit', 'financialEntry.cancel', 'financialEntry.delete', 'financialState.view'],
    },
    // Operation Manager: trip-context money movement (advances/settlements) — no reversal authority.
    { role: operationManagerRole, permissionNames: ['financialEntry.view', 'financialEntry.create', 'financialState.view'] },
  ];

  for (const grant of financialEntryRoleGrants) {
    if (!grant.role) continue;
    const permissions = await prisma.permission.findMany({ where: { name: { in: grant.permissionNames } } });
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: grant.role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: grant.role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning Vehicle Assets, Loans & Expense Management permissions (docs Phase 6)...');
  const vehicleAssetPermissionNames = VEHICLE_ASSET_PERMISSIONS.map((p) => p.name);
  const vehicleAssetAdminPermissions = await prisma.permission.findMany({ where: { name: { in: vehicleAssetPermissionNames } } });
  for (const permission of vehicleAssetAdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  const maintenanceManagerRole = await prisma.role.findUnique({ where: { name: 'MAINTENANCE_MANAGER' } });
  const purchaseManagerRole = await prisma.role.findUnique({ where: { name: 'PURCHASE_MANAGER' } });

  const vehicleAssetRoleGrants: { role: { id: string } | null; permissionNames: string[] }[] = [
    // Accounts Manager: the financial sign-off role, mirroring ACCOUNTING_MANAGER's role in every prior phase (design doc §18).
    {
      role: accountingManagerRole,
      permissionNames: [
        'asset_category.view',
        'asset.view', 'asset.approve',
        'vehicle_expense.view', 'vehicle_expense.approve',
        'fasttag.view',
        'fuel_card_account.view',
      ],
    },
    // Fleet Manager (existing role): operational upkeep, no financial approval (design doc §18).
    {
      role: fleetManagerRole,
      permissionNames: [
        'fasttag.view', 'fasttag.create', 'fasttag.edit', 'fasttag.delete',
        'fuel_card_account.view', 'fuel_card_account.edit', 'fuel_card_account.delete',
        'vehicle_expense.view', 'vehicle_expense.create',
        'asset.view',
        'data_import.view', 'data_import.run',
      ],
    },
    // Maintenance Manager (new role): narrower than Fleet Manager, for a dedicated workshop lead (design doc §18).
    {
      role: maintenanceManagerRole,
      permissionNames: ['vehicle_expense.view', 'vehicle_expense.create'],
    },
    // Purchase Manager (new role): files purchase requests and maintains the register, does not approve them (design doc §18).
    {
      role: purchaseManagerRole,
      permissionNames: ['asset_category.view', 'asset.view', 'asset.create', 'asset.edit'],
    },
    // Operation Manager: .view only across this phase — visibility without action rights (design doc §18).
    {
      role: operationManagerRole,
      permissionNames: [
        'asset_category.view', 'asset.view', 'vehicle_expense.view', 'fasttag.view',
        'fuel_card_account.view',
      ],
    },
  ];

  for (const grant of vehicleAssetRoleGrants) {
    if (!grant.role) continue;
    const permissions = await prisma.permission.findMany({ where: { name: { in: grant.permissionNames } } });
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: grant.role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: grant.role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning Financial Reporting permissions (docs Phase 7)...');
  const financialReportingPermissionNames = FINANCIAL_REPORTING_PERMISSIONS.map((p) => p.name);
  const financialReportingAdminPermissions = await prisma.permission.findMany({ where: { name: { in: financialReportingPermissionNames } } });
  for (const permission of financialReportingAdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  const financeManagerRole = await prisma.role.findUnique({ where: { name: 'FINANCE_MANAGER' } });
  const auditorRole = await prisma.role.findUnique({ where: { name: 'AUDITOR' } });
  const viewerRole = await prisma.role.findUnique({ where: { name: 'VIEWER' } });
  const managerRole = await prisma.role.findUnique({ where: { name: 'MANAGER' } });

  const broadReportViewPermissions = [
    'profitability_report.view', 'outstanding_report.view',
    'expense_analysis.view', 'mis_dashboard.view', 'report_schedule.view', 'balance_sheet.view', 'profit_loss.view',
  ];

  const financialReportingRoleGrants: { role: { id: string } | null; permissionNames: string[] }[] = [
    // Accounts Manager: the financial sign-off role, mirroring its role in every prior phase (design doc §Security & Permissions).
    {
      role: accountingManagerRole,
      permissionNames: [
        ...broadReportViewPermissions,
        'report_schedule.create', 'report_schedule.edit',
      ],
    },
    // Finance Manager (new role): day-to-day compliance reporting — the same scope as Accounts Manager.
    {
      role: financeManagerRole,
      permissionNames: [
        ...broadReportViewPermissions,
        'report_schedule.create', 'report_schedule.edit',
      ],
    },
    // Auditor (new role): every report, strictly read-only.
    {
      role: auditorRole,
      permissionNames: broadReportViewPermissions,
    },
    // Viewer (new role): the same read-only report set (design doc §Security & Permissions).
    {
      role: viewerRole,
      permissionNames: broadReportViewPermissions,
    },
    // Management (existing generic MANAGER role): executive-summary reports only.
    {
      role: managerRole,
      permissionNames: ['mis_dashboard.view', 'profitability_report.view', 'balance_sheet.view', 'profit_loss.view'],
    },
  ];

  for (const grant of financialReportingRoleGrants) {
    if (!grant.role) continue;
    const permissions = await prisma.permission.findMany({ where: { name: { in: grant.permissionNames } } });
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: grant.role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: grant.role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning Enterprise Integration, Automation, Audit & Security permissions (docs Phase 8)...');
  const enterprisePermissionNames = ENTERPRISE_PERMISSIONS.map((p) => p.name);
  const enterpriseAdminPermissions = await prisma.permission.findMany({ where: { name: { in: enterprisePermissionNames } } });
  for (const permission of enterpriseAdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  const enterpriseRoleGrants: { role: { id: string } | null; permissionNames: string[] }[] = [
    {
      role: accountingManagerRole,
      permissionNames: [
        'business_rule.view', 'business_rule.create', 'business_rule.edit',
        'automation_rule.view', 'automation_rule.manage',
        'kpi.view', 'ai_insight.view', 'system_dashboard.view',
        'backup.view', 'backup.run', 'archive.view', 'archive.run',
        'data_import.view', 'data_import.run',
        'approval_delegation.view', 'approval_delegation.create',
        'webhook.view',
      ],
    },
    {
      role: auditorRole,
      permissionNames: ['enterprise_audit.view', 'system_exception.view', 'kpi.view', 'system_dashboard.view', 'automation_rule.view', 'backup.view', 'archive.view'],
    },
    {
      role: managerRole,
      permissionNames: ['kpi.view', 'system_dashboard.view'],
    },
    {
      role: viewerRole,
      permissionNames: ['kpi.view'],
    },
  ];

  for (const grant of enterpriseRoleGrants) {
    if (!grant.role) continue;
    const permissions = await prisma.permission.findMany({ where: { name: { in: grant.permissionNames } } });
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: grant.role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: grant.role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning all Phase 8 Reports permissions to ADMIN...');
  const reportsPermissionNames = REPORTS_PERMISSIONS.map((p) => p.name);
  const phase8AdminPermissions = await prisma.permission.findMany({
    where: { name: { in: reportsPermissionNames } },
  });
  for (const permission of phase8AdminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  console.log('Assigning scoped Reports permissions across existing roles...');
  const reportsRoleGrants: { roleName: string; permissionNames: string[] }[] = [
    // Operation Manager: full workflow oversight -> operations + management reports.
    { roleName: 'OPERATION_MANAGER', permissionNames: ['reports.view', 'reports.operations', 'reports.management', 'reports.export'] },
    // Fleet Manager: fleet reports only.
    { roleName: 'FLEET_MANAGER', permissionNames: ['reports.view', 'reports.fleet', 'reports.export'] },
    // Accounting Manager: full accounts + management (P&L) reporting.
    { roleName: 'ACCOUNTING_MANAGER', permissionNames: ['reports.view', 'reports.accounts', 'reports.management', 'reports.export'] },
    // Accounts Executive: accounts reports, view/export only (no management rollups).
    { roleName: 'ACCOUNTS_EXECUTIVE', permissionNames: ['reports.view', 'reports.accounts', 'reports.export'] },
    // MANAGER (business hierarchy role): every category, read + export.
    { roleName: 'MANAGER', permissionNames: ['reports.view', 'reports.operations', 'reports.fleet', 'reports.accounts', 'reports.management', 'reports.export'] },
  ];

  for (const grant of reportsRoleGrants) {
    const role = await prisma.role.findUnique({ where: { name: grant.roleName } });
    if (!role) continue;
    const permissions = await prisma.permission.findMany({ where: { name: { in: grant.permissionNames } } });
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Assigning performance.view to every role...');
  const performanceViewPermission = await prisma.permission.findUniqueOrThrow({ where: { name: 'performance.view' } });
  const rolesForPerformanceView = await prisma.role.findMany();
  for (const role of rolesForPerformanceView) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: performanceViewPermission.id } },
      update: {},
      create: { roleId: role.id, permissionId: performanceViewPermission.id },
    });
  }

  console.log('Assigning performance.team to ADMIN...');
  const performanceTeamPermission = await prisma.permission.findUniqueOrThrow({ where: { name: 'performance.team' } });
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: adminRole.id, permissionId: performanceTeamPermission.id } },
    update: {},
    create: { roleId: adminRole.id, permissionId: performanceTeamPermission.id },
  });

  console.log('Seeding departments...');
  const DEPARTMENTS = [
    { name: 'Administration', description: 'Administration Department' },
    { name: 'Operations', description: 'Operations Department' },
    { name: 'Accounts', description: 'Accounts Department' },
    { name: 'Fleet', description: 'Fleet Department' },
  ];
  const departmentMap = new Map<string, string>();
  for (const dept of DEPARTMENTS) {
    const created = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
    departmentMap.set(dept.name, created.id);
  }

  console.log('Seeding teams...');
  const TEAMS = [
    { name: 'Intent Team', department: 'Operations', description: 'Intent Creation Team' },
    { name: 'Own Fleet Team', department: 'Operations', description: 'Vehicle Operations — Own Fleet' },
    { name: 'Market Fleet Team', department: 'Operations', description: 'Vehicle Operations — Market Fleet' },
    { name: 'Accounts Team', department: 'Accounts', description: 'Accounts Team' },
  ];
  for (const team of TEAMS) {
    await prisma.team.upsert({
      where: { name: team.name },
      update: {},
      create: {
        name: team.name,
        description: team.description,
        departmentId: departmentMap.get(team.department)!,
      },
    });
  }

  console.log('Seeding dynamic menu tree...');
  const MODULES = ['Dashboard', 'Operations', 'Fleet', 'Accounts', 'Reports', 'Masters', 'Administration', 'System'];
  const moduleMap = new Map<string, string>();
  for (let i = 0; i < MODULES.length; i++) {
    const created = await prisma.module.upsert({
      where: { name: MODULES[i] },
      update: {},
      create: { name: MODULES[i], order: i },
    });
    moduleMap.set(MODULES[i], created.id);
  }

  const topLevelMenus = [
    { label: 'Dashboard', module: 'Dashboard', icon: 'mdi-view-dashboard-outline', routePath: '/dashboard', order: 1 },
    { label: 'Operations', module: 'Operations', icon: 'mdi-truck-fast-outline', routePath: '/operations', order: 2 },
    { label: 'Fleet', module: 'Fleet', icon: 'mdi-truck-outline', routePath: '/fleet', order: 3 },
    { label: 'Accounts', module: 'Accounts', icon: 'mdi-cash-multiple', routePath: '/accounts', order: 4 },
    { label: 'Reports', module: 'Reports', icon: 'mdi-chart-bar', routePath: '/reports', order: 5 },
    { label: 'Masters', module: 'Masters', icon: 'mdi-database-outline', routePath: '/masters', order: 6 },
    { label: 'Administration', module: 'Administration', icon: 'mdi-shield-account-outline', routePath: null, order: 7 },
    // Phase 14 (docs Phase 8) — Enterprise Integration, Automation, Audit,
    // Security & Final Optimization. Same one-top-level-link-to-its-own-Hub
    // pattern as Accounts/Fleet/Operations (in-page HubCard navigation
    // handles the rest) rather than Administration's per-page menu children.
    { label: 'System', module: 'System', icon: 'mdi-cog-sync-outline', routePath: '/system', order: 8 },
  ];

  const topMenuMap = new Map<string, string>();
  for (const menu of topLevelMenus) {
    const existing = await prisma.menu.findFirst({
      where: { label: menu.label, parentId: null },
    });
    const record = existing
      ? await prisma.menu.update({
          where: { id: existing.id },
          data: {
            moduleId: moduleMap.get(menu.module),
            icon: menu.icon,
            routePath: menu.routePath,
            order: menu.order,
          },
        })
      : await prisma.menu.create({
          data: {
            label: menu.label,
            moduleId: moduleMap.get(menu.module),
            icon: menu.icon,
            routePath: menu.routePath,
            order: menu.order,
          },
        });
    topMenuMap.set(menu.label, record.id);
  }

  const administrationChildren = [
    { label: 'Users', icon: 'mdi-account-multiple-outline', routePath: '/administration/users', order: 1, permission: 'user.view' },
    { label: 'Roles', icon: 'mdi-account-key-outline', routePath: '/administration/roles', order: 2, permission: 'role.view' },
    { label: 'Permissions', icon: 'mdi-lock-check-outline', routePath: '/administration/permissions', order: 3, permission: 'permission.view' },
    { label: 'Departments', icon: 'mdi-office-building-outline', routePath: '/administration/departments', order: 4, permission: 'department.view' },
    { label: 'Teams', icon: 'mdi-account-group-outline', routePath: '/administration/teams', order: 5, permission: 'team.view' },
    // Companies and Groups moved to the Masters module — they are reached
    // from the Masters hub (see frontend config/masterCategories.ts), the
    // same way Vehicles/Locations are, so they get no menu row of their own.
    { label: 'Audit Logs', icon: 'mdi-history', routePath: '/administration/audit-logs', order: 6, permission: 'audit.view' },
    { label: 'Profile', icon: 'mdi-account-circle-outline', routePath: '/administration/profile', order: 7, permission: 'profile.view' },
  ];

  // Drop the menu rows left behind by the earlier Administration placement
  // (role_menu_permissions cascade with them).
  await prisma.menu.deleteMany({
    where: { routePath: { in: ['/administration/companies', '/administration/groups'] } },
  });

  const administrationParentId = topMenuMap.get('Administration')!;
  for (const child of administrationChildren) {
    const existing = await prisma.menu.findFirst({
      where: { label: child.label, parentId: administrationParentId },
    });
    if (existing) {
      await prisma.menu.update({
        where: { id: existing.id },
        data: {
          moduleId: moduleMap.get('Administration'),
          icon: child.icon,
          routePath: child.routePath,
          order: child.order,
        },
      });
    } else {
      await prisma.menu.create({
        data: {
          label: child.label,
          parentId: administrationParentId,
          moduleId: moduleMap.get('Administration'),
          icon: child.icon,
          routePath: child.routePath,
          order: child.order,
        },
      });
    }
  }

  console.log('Mapping role -> menu visibility...');
  const allMenus = await prisma.menu.findMany();
  const allRoles = await prisma.role.findMany();
  const superAdminRoleRecord = allRoles.find((r) => r.name === 'SUPER_ADMIN')!;
  const adminRoleRecord = allRoles.find((r) => r.name === 'ADMIN')!;

  // SUPER_ADMIN sees every menu.
  for (const menu of allMenus) {
    await prisma.roleMenuPermission.upsert({
      where: { roleId_menuId: { roleId: superAdminRoleRecord.id, menuId: menu.id } },
      update: { canView: true },
      create: { roleId: superAdminRoleRecord.id, menuId: menu.id, canView: true },
    });
  }

  // ADMIN sees Dashboard + Administration (and all its children) + System.
  // Masters is in the set for Companies/Groups, which moved there.
  const adminVisibleLabels = new Set(['Dashboard', 'Masters', 'Administration', ...administrationChildren.map((c) => c.label), 'System']);
  for (const menu of allMenus) {
    if (adminVisibleLabels.has(menu.label)) {
      await prisma.roleMenuPermission.upsert({
        where: { roleId_menuId: { roleId: adminRoleRecord.id, menuId: menu.id } },
        update: { canView: true },
        create: { roleId: adminRoleRecord.id, menuId: menu.id, canView: true },
      });
    }
  }

  // Every other seeded role at minimum sees the Dashboard.
  const dashboardMenu = allMenus.find((m) => m.label === 'Dashboard')!;
  for (const role of allRoles) {
    if (role.name === 'SUPER_ADMIN' || role.name === 'ADMIN') continue;
    await prisma.roleMenuPermission.upsert({
      where: { roleId_menuId: { roleId: role.id, menuId: dashboardMenu.id } },
      update: { canView: true },
      create: { roleId: role.id, menuId: dashboardMenu.id, canView: true },
    });
  }

  // The roles granted Enterprise Integration/Automation/Audit/Security
  // permissions (docs Phase 8) also see the System menu.
  const systemMenu = allMenus.find((m) => m.label === 'System')!;
  const systemVisibleRoleNames = ['ACCOUNTING_MANAGER', 'FINANCE_MANAGER', 'AUDITOR', 'MANAGER', 'VIEWER'];
  for (const role of allRoles) {
    if (!systemVisibleRoleNames.includes(role.name)) continue;
    await prisma.roleMenuPermission.upsert({
      where: { roleId_menuId: { roleId: role.id, menuId: systemMenu.id } },
      update: { canView: true },
      create: { roleId: role.id, menuId: systemMenu.id, canView: true },
    });
  }

  console.log('Seeding baseline GST slabs...');
  const GST_SLABS = [
    { name: 'GST 0%', code: 'GST00', ratePercent: 0 },
    { name: 'GST 5%', code: 'GST05', ratePercent: 5 },
    { name: 'GST 12%', code: 'GST12', ratePercent: 12 },
    { name: 'GST 18%', code: 'GST18', ratePercent: 18 },
    { name: 'GST 28%', code: 'GST28', ratePercent: 28 },
  ];
  for (const slab of GST_SLABS) {
    await prisma.gstMaster.upsert({ where: { code: slab.code }, update: {}, create: slab });
  }

  console.log('Seeding baseline payment modes...');
  // Extended in Phase 9 (Banking & Cash Management) with type/
  // requiresBankAccount/requiresChequeDetails/isSystemMode — the six
  // originally seeded here (Cash..Bank Transfer) get their type backfilled
  // via `update`, and IMPS/DD/Card/Wallet/QR are added net-new.
  const PAYMENT_MODES = [
    { name: 'Cash', code: 'CASH', type: 'CASH', requiresBankAccount: false, requiresChequeDetails: false },
    { name: 'Cheque', code: 'CHEQUE', type: 'CHEQUE', requiresBankAccount: true, requiresChequeDetails: true },
    { name: 'NEFT', code: 'NEFT', type: 'NEFT', requiresBankAccount: true, requiresChequeDetails: false },
    { name: 'RTGS', code: 'RTGS', type: 'RTGS', requiresBankAccount: true, requiresChequeDetails: false },
    { name: 'UPI', code: 'UPI', type: 'UPI', requiresBankAccount: true, requiresChequeDetails: false },
    { name: 'Bank Transfer', code: 'BANK_TRANSFER', type: 'BANK_TRANSFER', requiresBankAccount: true, requiresChequeDetails: false },
    { name: 'IMPS', code: 'IMPS', type: 'IMPS', requiresBankAccount: true, requiresChequeDetails: false },
    { name: 'Demand Draft', code: 'DD', type: 'DD', requiresBankAccount: true, requiresChequeDetails: true },
    { name: 'Card', code: 'CARD', type: 'CARD', requiresBankAccount: true, requiresChequeDetails: false },
    { name: 'Wallet', code: 'WALLET', type: 'WALLET', requiresBankAccount: false, requiresChequeDetails: false },
    { name: 'QR Payment', code: 'QR', type: 'QR', requiresBankAccount: true, requiresChequeDetails: false },
  ] as const;
  for (const m of PAYMENT_MODES) {
    const common = { type: m.type, requiresBankAccount: m.requiresBankAccount, requiresChequeDetails: m.requiresChequeDetails, isSystemMode: true };
    await prisma.paymentMode.upsert({
      where: { code: m.code },
      update: common,
      create: { name: m.name, code: m.code, ...common },
    });
  }

  console.log('Seeding Accounting Foundation (Phase 7)...');

  console.log('Seeding currencies...');
  const inr = await prisma.currency.upsert({
    where: { code: 'INR' },
    update: {},
    create: { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPrecision: 2, isBaseCurrency: true },
  });
  const OTHER_CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
  ];
  for (const c of OTHER_CURRENCIES) {
    await prisma.currency.upsert({ where: { code: c.code }, update: {}, create: { ...c, isBaseCurrency: false } });
  }

  console.log('Seeding the Organization (the legal entity these books belong to)...');
  // Distinct from `Company` (the customers this ERP bills) — see the
  // PHASE 7 comment in schema.prisma for why a separate model exists.
  const organization = await prisma.organization.upsert({
    where: { code: 'MJT' },
    update: {},
    create: { code: 'MJT', name: 'MJ Transport' },
  });

  console.log('Seeding a starter Bank Account (HDFC Bank)...');
  const hdfcBankAccount = await prisma.bankAccount.upsert({
    where: { organizationId_accountNumber: { organizationId: organization.id, accountNumber: '50100123456789' } },
    update: {},
    create: {
      organizationId: organization.id,
      accountHolderName: 'MJ Transport',
      accountNumber: '50100123456789',
      accountType: 'CURRENT',
      ifscCode: 'HDFC0001234',
      branchName: 'Chennai - Anna Nagar',
      bankName: 'HDFC Bank',
      openingBalance: 0,
      currentBalance: 0,
      isPrimary: true,
      isDefaultPaymentAccount: true,
      isDefaultReceiptAccount: true,
    },
  });

  console.log('Seeding a starter Cheque Book for the HDFC Bank Account...');
  const existingChequeBook = await prisma.chequeBook.findFirst({ where: { bankAccountId: hdfcBankAccount.id, bookNumber: 'CB-0001' } });
  if (!existingChequeBook) {
    await prisma.chequeBook.create({
      data: {
        organizationId: organization.id,
        bankAccountId: hdfcBankAccount.id,
        bookNumber: 'CB-0001',
        startNumber: '000001',
        endNumber: '000025',
        totalLeaves: 25,
      },
    });
  }

  console.log('Seeding the default Cash Account...');
  const existingCashAccount = await prisma.cashAccount.findFirst({ where: { organizationId: organization.id, cashAccountType: 'MAIN' } });
  if (!existingCashAccount) {
    await prisma.cashAccount.create({
      data: {
        organizationId: organization.id,
        cashAccountType: 'MAIN',
        openingBalance: 0,
        currentBalance: 0,
      },
    });
  }

  console.log('Seeding Enterprise Integration, Automation, Audit & Security defaults (docs Phase 8)...');
  const DEFAULT_SYSTEM_SETTINGS: { category: 'SECURITY' | 'BACKUP' | 'WORKFLOW'; key: string; value: string; description: string }[] = [
    { category: 'SECURITY', key: 'passwordMinLength', value: '8', description: 'Minimum password length' },
    { category: 'SECURITY', key: 'passwordRequireUppercase', value: 'true', description: 'Require at least one uppercase letter' },
    { category: 'SECURITY', key: 'passwordRequireNumber', value: 'true', description: 'Require at least one number' },
    { category: 'SECURITY', key: 'passwordRequireSymbol', value: 'false', description: 'Require at least one symbol' },
    { category: 'SECURITY', key: 'sessionTimeoutMinutes', value: '30', description: 'Idle session timeout, in minutes (advisory — access tokens are still governed by JWT_ACCESS_EXPIRES_IN)' },
    { category: 'BACKUP', key: 'retentionDays', value: '30', description: 'How many days of backups to retain before they are eligible for cleanup' },
    { category: 'WORKFLOW', key: 'defaultEscalationHours', value: '48', description: 'Default approval escalation window when an ApprovalRule does not set its own' },
  ];
  for (const setting of DEFAULT_SYSTEM_SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { organizationId_category_key: { organizationId: organization.id, category: setting.category, key: setting.key } },
      update: {},
      create: { organizationId: organization.id, category: setting.category, key: setting.key, value: setting.value, description: setting.description },
    });
  }

  const NOTIFICATION_TEMPLATES = [
    { code: 'APPROVAL_PENDING', channel: 'IN_APP' as const, subject: 'Approval pending your action', bodyTemplate: '{{voucherNumber}} has been awaiting your approval for {{ageHours}} hours.' },
    { code: 'APPROVAL_ESCALATED', channel: 'IN_APP' as const, subject: 'Approval escalated to you', bodyTemplate: '{{voucherNumber}} has been escalated to your role after {{ageHours}} hours pending.' },
    { code: 'OUTSTANDING_REMINDER', channel: 'IN_APP' as const, subject: 'Outstanding receivables reminder', bodyTemplate: '{{customerCount}} customers have overdue receivables totalling {{amount}}.' },
    { code: 'REPORT_READY', channel: 'IN_APP' as const, subject: 'Report ready', bodyTemplate: '"{{reportName}}" has finished generating ({{rowCount}} rows).' },
    { code: 'BACKUP_COMPLETED', channel: 'IN_APP' as const, subject: 'Backup completed', bodyTemplate: 'A {{backupType}} backup completed successfully ({{sizeBytes}} bytes).' },
    { code: 'BACKUP_FAILED', channel: 'EMAIL' as const, subject: 'Backup failed', bodyTemplate: 'A scheduled backup failed: {{errorMessage}}. Please investigate.' },
  ];
  for (const template of NOTIFICATION_TEMPLATES) {
    await prisma.notificationTemplate.upsert({ where: { code: template.code }, update: {}, create: template });
  }

  const KPI_DEFINITIONS = [
    { code: 'REVENUE_MTD', name: 'Revenue (Month to Date)', category: 'Financial', formulaDescription: 'Sum of INCOME ledger credit-movement for the current month', unit: 'INR' },
    { code: 'EXPENSE_MTD', name: 'Expense (Month to Date)', category: 'Financial', formulaDescription: 'Sum of direct + indirect + financial expense for the current month', unit: 'INR' },
    { code: 'NET_PROFIT_MTD', name: 'Net Profit (Month to Date)', category: 'Financial', formulaDescription: 'Revenue MTD minus Expense MTD', unit: 'INR' },
    { code: 'NET_PROFIT_MARGIN', name: 'Net Profit Margin', category: 'Financial', formulaDescription: 'Net Profit MTD ÷ Revenue MTD × 100', unit: '%' },
    { code: 'OUTSTANDING_RECEIVABLES', name: 'Outstanding Receivables', category: 'Financial', formulaDescription: 'Sum of unpaid Invoice outstandingAmount', unit: 'INR' },
    { code: 'OUTSTANDING_PAYABLES', name: 'Outstanding Payables', category: 'Financial', formulaDescription: 'Sum of unpaid SupplierBill outstandingAmount', unit: 'INR' },
    { code: 'CASH_AND_BANK_BALANCE', name: 'Cash & Bank Balance', category: 'Financial', formulaDescription: 'Live Cash Account + Bank Account ledger balances', unit: 'INR' },
    { code: 'VEHICLE_COST_MTD', name: 'Vehicle Cost (Month to Date)', category: 'Fleet', formulaDescription: 'Approved VehicleExpense total for the current month', unit: 'INR' },
    { code: 'DRIVER_COST_MTD', name: 'Driver Cost (Month to Date)', category: 'Fleet', formulaDescription: 'Approved DriverEarning + DriverAdvance total for the current month', unit: 'INR' },
  ];
  for (const kpi of KPI_DEFINITIONS) {
    await prisma.kpiDefinition.upsert({ where: { code: kpi.code }, update: {}, create: kpi });
  }

  console.log('Creating Super Admin user...');
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@mjtransport.com',
      fullName: 'Super Administrator',
      password: hashedPassword,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });

  console.log('Seeding complete.');
  console.log('Login with username: admin, password: Admin@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
