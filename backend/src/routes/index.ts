import { Router } from 'express';
import financialEntryRoutes from './financial-entry.routes';
import financialStateRoutes from './financial-state.routes';
import balanceSheetRoutes from './balance-sheet.routes';
import capitalTransactionRoutes from './capital-transaction.routes';
import profitLossRoutes from './profit-loss.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import dashboardRoutes from './dashboard.routes';
import adminUserRoutes from './admin-user.routes';
import adminRoleRoutes from './admin-role.routes';
import adminPermissionRoutes from './admin-permission.routes';
import adminDepartmentRoutes from './admin-department.routes';
import adminTeamRoutes from './admin-team.routes';
import adminCompanyRoutes from './admin-company.routes';
import adminGroupRoutes from './admin-group.routes';
import adminAuditRoutes from './admin-audit.routes';
import mastersSimpleRoutes from './masters-simple.routes';
import locationRoutes from './location.routes';
import vehicleRoutes from './vehicle.routes';
import driverRoutes from './driver.routes';
import supplierRoutes from './supplier.routes';
import fleetSimpleRoutes from './fleet-simple.routes';
import vehicleFleetRoutes from './vehicle-fleet.routes';
import vehicleAssignmentRoutes from './vehicle-assignment.routes';
import fuelEntryRoutes from './fuel-entry.routes';
import maintenanceRoutes from './maintenance.routes';
import sparePartUsageRoutes from './spare-part-usage.routes';
import vehicleExpenseRoutes from './vehicle-expense.routes';
import fleetDashboardRoutes from './fleet-dashboard.routes';
import intentRoutes from './intent.routes';
import tripRoutes from './trip.routes';
import tripDocumentRoutes from './trip-document.routes';
import tripExpenseRoutes from './trip-expense.routes';
import tripNoteRoutes from './trip-note.routes';
import operationsDashboardRoutes from './operations-dashboard.routes';
import invoiceRoutes from './invoice.routes';
import receiptRoutes from './receipt.routes';
import supplierPaymentRoutes from './supplier-payment.routes';
import tripFinancialRoutes from './trip-financial.routes';
import accountsDashboardRoutes from './accounts-dashboard.routes';
import supplierBillRoutes from './supplier-bill.routes';
import arApOutstandingRoutes from './ar-ap-outstanding.routes';
import creditControlRoutes from './credit-control.routes';
import collectionActivityRoutes from './collection-activity.routes';
import reportRoutes from './report.routes';
import performanceRoutes from './performance.routes';
import organizationRoutes from './organization.routes';
import exchangeRateRoutes from './exchange-rate.routes';
import bankAccountRoutes from './bank-account.routes';
import cashAccountRoutes from './cash-account.routes';
import bankTransferRoutes from './bank-transfer.routes';
import chequeBookRoutes from './cheque-book.routes';
import chequeRoutes from './cheque.routes';
import { bankChargeRouter, interestRouter } from './bank-charge-interest.routes';
import pettyCashRequestRoutes from './petty-cash-request.routes';
import bankingDashboardRoutes from './banking-dashboard.routes';
import driverAdvanceRoutes from './driver-advance.routes';
import driverEarningRoutes from './driver-earning.routes';
import driverPenaltyRoutes from './driver-penalty.routes';
import driverSettlementRoutes from './driver-settlement.routes';
import driverSalaryStructureRoutes from './driver-salary-structure.routes';
import driverSalaryPaymentRoutes from './driver-salary-payment.routes';
import driverStatementRoutes from './driver-statement.routes';
import salaryStructureRoutes from './salary-structure.routes';
import employeeAdvanceRoutes from './employee-advance.routes';
import employeeSalaryPaymentRoutes from './employee-salary-payment.routes';
import salaryPaymentQuoteRoutes from './salary-payment-quote.routes';
import payrollDashboardRoutes from './payroll-dashboard.routes';
import assetCategoryRoutes from './asset-category.routes';
import fixedAssetRoutes from './fixed-asset.routes';
import loanRoutes from './loan.routes';
import openingBalanceRoutes from './opening-balance.routes';
import fastTagRoutes from './fasttag.routes';
import profitabilityReportRoutes from './profitability-report.routes';
import outstandingReportRoutes from './outstanding-report.routes';
import expenseAnalysisRoutes from './expense-analysis.routes';
import misDashboardRoutes from './mis-dashboard.routes';
import auditReportRoutes from './audit-report.routes';
import reportScheduleRoutes from './report-schedule.routes';

// Phase 14 (docs Phase 8) — Enterprise Integration, Automation, Audit,
// Security & Final Optimization.
import notificationRoutes from './notification.routes';
import systemSettingRoutes from './system-setting.routes';
import systemExceptionRoutes from './system-exception.routes';
import businessRuleRoutes from './business-rule.routes';
import backupRoutes from './backup.routes';
import archiveRoutes from './archive.routes';
import approvalDelegationRoutes from './approval-delegation.routes';
import enterpriseAuditRoutes from './enterprise-audit.routes';
import mfaRoutes from './mfa.routes';
import importRoutes from './import.routes';
import excelExportRoutes from './excel-export.routes';
import webhookRoutes from './webhook.routes';
import apiKeyRoutes from './api-key.routes';
import aiInsightRoutes from './ai-insight.routes';
import kpiRoutes from './kpi.routes';
import automationRuleRoutes from './automation-rule.routes';
import systemDashboardRoutes from './system-dashboard.routes';
import bookingRoutes from './booking.routes';
import publicRoutes from './public.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/administration/users', adminUserRoutes);
router.use('/administration/roles', adminRoleRoutes);
router.use('/administration/permissions', adminPermissionRoutes);
router.use('/administration/departments', adminDepartmentRoutes);
router.use('/administration/teams', adminTeamRoutes);
// Companies master data continues to live here (Phase 2 module, extended
// in Phase 3 with logo/GST/PAN/soft-delete/status-toggle) rather than
// being duplicated under /masters.
router.use('/administration/companies', adminCompanyRoutes);
router.use('/administration/groups', adminGroupRoutes);
router.use('/administration/audit-logs', adminAuditRoutes);

// Phase 3 — Masters
router.use('/masters/locations', locationRoutes);
router.use('/masters/vehicles', vehicleRoutes);
router.use('/masters/drivers', driverRoutes);
router.use('/masters/suppliers', supplierRoutes);
// vehicle-types, materials, expense-categories,
// banks, payment-modes, tyres, service-categories,
// designations, gst-masters — all mounted inside mastersSimpleRoutes.
router.use('/masters', mastersSimpleRoutes);

// Phase 4 — Fleet Management
router.use('/fleet/dashboard', fleetDashboardRoutes);
router.use('/fleet/vehicles', vehicleFleetRoutes); // status/compliance/documents/availability/timeline (extends Masters Vehicle)
router.use('/fleet/assignments', vehicleAssignmentRoutes);
router.use('/fleet/fuel-entries', fuelEntryRoutes);
router.use('/fleet/maintenance', maintenanceRoutes);
router.use('/fleet/spare-part-usage', sparePartUsageRoutes);
router.use('/fleet/expenses', vehicleExpenseRoutes);
// fuel-cards, spare-parts — simple catalogs mounted inside fleetSimpleRoutes.
router.use('/fleet', fleetSimpleRoutes);

// Phase 5 — Operations
router.use('/operations/intents', intentRoutes);
router.use('/operations/trips', tripRoutes);
router.use('/operations/trip-documents', tripDocumentRoutes);
router.use('/operations/trip-expenses', tripExpenseRoutes);
router.use('/operations/trip-notes', tripNoteRoutes);
router.use('/operations/dashboard', operationsDashboardRoutes);

// Phase 15 — Business Financial Entry. The single front door for every
// money movement in the app — no voucher/ledger concept is exposed
// anywhere behind this API; every service posts directly to the real
// business entity (Invoice/SupplierBill/BankAccount/DriverAdvance/...)
// and its own stored running balance.
router.use('/accounts/financial-entries', financialEntryRoutes);
router.use('/accounts/financial-state', financialStateRoutes);
// Finance → Balance Sheet — a read-only report computed from the tables
// above, no ledger/voucher concept added.
router.use('/accounts/balance-sheet', balanceSheetRoutes);
// Capital Account — partner contributions/withdrawals, a simple named
// master (capitalPartner, served by masters-simple.routes.ts) + one-shot
// fund-account-adjusting transactions.
router.use('/accounts/capital-transactions', capitalTransactionRoutes);
// Finance → Profit & Loss — a read-only, single-period report, same
// reuse-only approach as Balance Sheet.
router.use('/accounts/profit-loss', profitLossRoutes);

// Accounts — Receivables & Payables
router.use('/accounts/invoices', invoiceRoutes);
router.use('/accounts/receipts', receiptRoutes);
router.use('/accounts/supplier-payments', supplierPaymentRoutes);
router.use('/accounts/trip-financials', tripFinancialRoutes);
router.use('/accounts/dashboard', accountsDashboardRoutes);
router.use('/accounts/supplier-bills', supplierBillRoutes);
router.use('/accounts', arApOutstandingRoutes);
router.use('/accounts/companies', creditControlRoutes);
router.use('/accounts/collections', collectionActivityRoutes);

// Accounting — Organization & Currency (reference data only; no chart of
// accounts/ledger/voucher engine anymore).
router.use('/accounting/organizations', organizationRoutes);
router.use('/accounting/exchange-rates', exchangeRateRoutes);

// Banking & Cash Management — every account keeps a directly-maintained
// running balance (BankAccount.currentBalance / CashAccount.currentBalance),
// updated in place by whichever service moves the money.
router.use('/accounting/banking/bank-accounts', bankAccountRoutes);
router.use('/accounting/banking/cash-accounts', cashAccountRoutes);
router.use('/accounting/banking/transfers', bankTransferRoutes);
router.use('/accounting/banking/cheque-books', chequeBookRoutes);
router.use('/accounting/banking/cheques', chequeRoutes);
router.use('/accounting/banking/bank-charges', bankChargeRouter);
router.use('/accounting/banking/interest', interestRouter);
router.use('/accounting/banking/petty-cash/requests', pettyCashRequestRoutes);
router.use('/accounting/banking/dashboard', bankingDashboardRoutes);

// Driver Accounts, Employee Payroll & Settlements
router.use('/accounts/driver/advances', driverAdvanceRoutes);
router.use('/accounts/driver/earnings', driverEarningRoutes);
router.use('/accounts/driver/penalties', driverPenaltyRoutes);
router.use('/accounts/driver/settlements', driverSettlementRoutes);
router.use('/accounts/driver/salary-structures', driverSalaryStructureRoutes);
router.use('/accounts/driver/salary-payments', driverSalaryPaymentRoutes);
router.use('/accounts/driver', driverStatementRoutes);
router.use('/accounts/payroll/salary-structures', salaryStructureRoutes);
router.use('/accounts/payroll/advances', employeeAdvanceRoutes);
router.use('/accounts/payroll/salary-payments', employeeSalaryPaymentRoutes);
router.use('/accounts/payroll/salary-quote', salaryPaymentQuoteRoutes);
router.use('/accounts/payroll/dashboard', payrollDashboardRoutes);

// Fixed Asset Register, Asset Categories & Vehicle Expenses
router.use('/accounts/assets/categories', assetCategoryRoutes);
router.use('/accounts/assets', fixedAssetRoutes);
router.use('/accounts/fasttag-accounts', fastTagRoutes);

// Loans & EMI — Vehicle / Bank / Business / Owner / Other loans, their
// generated EMI schedules, and the payment flow that debits the fund
// account and writes the matching Financial Entry automatically.
router.use('/accounts/loans', loanRoutes);

// Opening Balance & Migration — the old system's closing position brought
// in as this system's opening position. Nothing here is a transaction: no
// Financial Entry is written, so opening amounts never reach the P&L.
router.use('/accounts/opening-balance', openingBalanceRoutes);

// Business Reporting — every report here reads directly from business
// entities (Trip/Invoice/SupplierBill/VehicleExpense/DriverAdvance/...),
// never from a ledger/voucher/GL. GST/TDS filing, trial-balance-style
// financial statements, bank reconciliation, budget-vs-actual and
// year-end closing were removed along with the ledger engine they
// depended on.
router.use('/accounts/profitability-reports', profitabilityReportRoutes);
router.use('/accounts/outstanding-reports', outstandingReportRoutes);
router.use('/accounts/expense-analysis', expenseAnalysisRoutes);
router.use('/accounts/mis-dashboard', misDashboardRoutes);
router.use('/accounts/audit-reports', auditReportRoutes);
router.use('/accounts/report-schedules', reportScheduleRoutes);

// Phase 8 — Reports
router.use('/reports', reportRoutes);

// Phase 9 — Performance
router.use('/performance', performanceRoutes);

// Phase 14 (docs Phase 8) — Enterprise Integration, Automation, Audit,
// Security & Final Optimization (the final phase).
router.use('/notifications', notificationRoutes);
router.use('/system/settings', systemSettingRoutes);
router.use('/system/exceptions', systemExceptionRoutes);
router.use('/system/business-rules', businessRuleRoutes);
router.use('/system/backups', backupRoutes);
router.use('/system/archive', archiveRoutes);
router.use('/system/approval-delegations', approvalDelegationRoutes);
router.use('/system/audit-center', enterpriseAuditRoutes);
router.use('/system/mfa', mfaRoutes);
router.use('/system/imports', importRoutes);
router.use('/system/export-excel', excelExportRoutes);
router.use('/system/webhooks', webhookRoutes);
router.use('/system/api-keys', apiKeyRoutes);
router.use('/system/ai-insights', aiInsightRoutes);
router.use('/system/kpi', kpiRoutes);
router.use('/system/automation-rules', automationRuleRoutes);
router.use('/system', systemDashboardRoutes);

// Phase 16 — Booking & LR. `/public/*` is unauthenticated by design: it is the
// booking, tracking and contact intake surface for the MJ Express website,
// which has no backend of its own. Everything else sits behind auth.
router.use('/bookings', bookingRoutes);
router.use('/public', publicRoutes);

export default router;
