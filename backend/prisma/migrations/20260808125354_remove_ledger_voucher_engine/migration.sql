-- DropForeignKey
ALTER TABLE "account_groups" DROP CONSTRAINT "account_groups_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "account_groups" DROP CONSTRAINT "account_groups_parentGroupId_fkey";

-- DropForeignKey
ALTER TABLE "accounting_event_mappings" DROP CONSTRAINT "accounting_event_mappings_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "accounting_event_mappings" DROP CONSTRAINT "accounting_event_mappings_voucherTypeId_fkey";

-- DropForeignKey
ALTER TABLE "accounting_periods" DROP CONSTRAINT "accounting_periods_financialYearId_fkey";

-- DropForeignKey
ALTER TABLE "accounting_preferences" DROP CONSTRAINT "accounting_preferences_baseCurrencyId_fkey";

-- DropForeignKey
ALTER TABLE "accounting_preferences" DROP CONSTRAINT "accounting_preferences_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "approval_instances" DROP CONSTRAINT "approval_instances_approvalRuleId_fkey";

-- DropForeignKey
ALTER TABLE "approval_rules" DROP CONSTRAINT "approval_rules_approverRoleId_fkey";

-- DropForeignKey
ALTER TABLE "approval_rules" DROP CONSTRAINT "approval_rules_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "asset_categories" DROP CONSTRAINT "asset_categories_accumulatedDepreciationLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "asset_categories" DROP CONSTRAINT "asset_categories_assetLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "asset_categories" DROP CONSTRAINT "asset_categories_depreciationExpenseLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "asset_disposals" DROP CONSTRAINT "asset_disposals_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "bank_accounts" DROP CONSTRAINT "bank_accounts_chequeAwaitingClearanceLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "bank_accounts" DROP CONSTRAINT "bank_accounts_chequeReceivedClearanceLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "bank_accounts" DROP CONSTRAINT "bank_accounts_ledgerId_fkey";

-- DropForeignKey
ALTER TABLE "bank_reconciliation_lines" DROP CONSTRAINT "bank_reconciliation_lines_adjustmentVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "bank_reconciliation_lines" DROP CONSTRAINT "bank_reconciliation_lines_bankReconciliationId_fkey";

-- DropForeignKey
ALTER TABLE "bank_reconciliation_lines" DROP CONSTRAINT "bank_reconciliation_lines_matchedChequeId_fkey";

-- DropForeignKey
ALTER TABLE "bank_reconciliation_lines" DROP CONSTRAINT "bank_reconciliation_lines_matchedVoucherLineId_fkey";

-- DropForeignKey
ALTER TABLE "bank_reconciliation_lines" DROP CONSTRAINT "bank_reconciliation_lines_sourceImportLineId_fkey";

-- DropForeignKey
ALTER TABLE "bank_reconciliations" DROP CONSTRAINT "bank_reconciliations_bankAccountId_fkey";

-- DropForeignKey
ALTER TABLE "bank_reconciliations" DROP CONSTRAINT "bank_reconciliations_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "bank_statement_import_batches" DROP CONSTRAINT "bank_statement_import_batches_bankAccountId_fkey";

-- DropForeignKey
ALTER TABLE "bank_statement_import_batches" DROP CONSTRAINT "bank_statement_import_batches_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "bank_statement_import_lines" DROP CONSTRAINT "bank_statement_import_lines_bankStatementImportBatchId_fkey";

-- DropForeignKey
ALTER TABLE "bank_transfers" DROP CONSTRAINT "bank_transfers_chargeLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "bank_transfers" DROP CONSTRAINT "bank_transfers_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "budget_lines" DROP CONSTRAINT "budget_lines_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "budget_lines" DROP CONSTRAINT "budget_lines_ledgerId_fkey";

-- DropForeignKey
ALTER TABLE "cash_accounts" DROP CONSTRAINT "cash_accounts_ledgerId_fkey";

-- DropForeignKey
ALTER TABLE "cash_flow_category_mappings" DROP CONSTRAINT "cash_flow_category_mappings_accountGroupId_fkey";

-- DropForeignKey
ALTER TABLE "cash_flow_category_mappings" DROP CONSTRAINT "cash_flow_category_mappings_ledgerId_fkey";

-- DropForeignKey
ALTER TABLE "cash_flow_category_mappings" DROP CONSTRAINT "cash_flow_category_mappings_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "cheques" DROP CONSTRAINT "cheques_bounceChargeVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "cheques" DROP CONSTRAINT "cheques_bounceReturnVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "cheques" DROP CONSTRAINT "cheques_clearanceVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "cheques" DROP CONSTRAINT "cheques_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "cost_centers" DROP CONSTRAINT "cost_centers_costCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "cost_centers" DROP CONSTRAINT "cost_centers_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "cost_centers" DROP CONSTRAINT "cost_centers_parentCostCenterId_fkey";

-- DropForeignKey
ALTER TABLE "credit_notes" DROP CONSTRAINT "credit_notes_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "customer_debit_notes" DROP CONSTRAINT "customer_debit_notes_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "depreciation_runs" DROP CONSTRAINT "depreciation_runs_journalVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "driver_advances" DROP CONSTRAINT "driver_advances_driverLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "driver_advances" DROP CONSTRAINT "driver_advances_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "driver_earnings" DROP CONSTRAINT "driver_earnings_driverLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "driver_earnings" DROP CONSTRAINT "driver_earnings_expenseLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "driver_earnings" DROP CONSTRAINT "driver_earnings_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "driver_expense_reimbursements" DROP CONSTRAINT "driver_expense_reimbursements_driverLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "driver_expense_reimbursements" DROP CONSTRAINT "driver_expense_reimbursements_expenseLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "driver_expense_reimbursements" DROP CONSTRAINT "driver_expense_reimbursements_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "driver_penalties" DROP CONSTRAINT "driver_penalties_contraLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "driver_penalties" DROP CONSTRAINT "driver_penalties_driverLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "driver_penalties" DROP CONSTRAINT "driver_penalties_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "driver_settlements" DROP CONSTRAINT "driver_settlements_journalVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "driver_settlements" DROP CONSTRAINT "driver_settlements_paymentVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "employee_advances" DROP CONSTRAINT "employee_advances_employeeLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "employee_advances" DROP CONSTRAINT "employee_advances_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "fasttag_accounts" DROP CONSTRAINT "fasttag_accounts_ledgerId_fkey";

-- DropForeignKey
ALTER TABLE "fasttag_transactions" DROP CONSTRAINT "fasttag_transactions_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "financial_entries" DROP CONSTRAINT "financial_entries_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "financial_years" DROP CONSTRAINT "financial_years_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "financial_years" DROP CONSTRAINT "financial_years_previousFinancialYearId_fkey";

-- DropForeignKey
ALTER TABLE "fixed_assets" DROP CONSTRAINT "fixed_assets_purchaseVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "gst_adjustments" DROP CONSTRAINT "gst_adjustments_gstRegistrationId_fkey";

-- DropForeignKey
ALTER TABLE "gst_adjustments" DROP CONSTRAINT "gst_adjustments_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "gst_return_periods" DROP CONSTRAINT "gst_return_periods_gstRegistrationId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_accountingPeriodId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_customerLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_financialYearId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "ledgers" DROP CONSTRAINT "ledgers_accountGroupId_fkey";

-- DropForeignKey
ALTER TABLE "ledgers" DROP CONSTRAINT "ledgers_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "ledgers" DROP CONSTRAINT "ledgers_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "number_series" DROP CONSTRAINT "number_series_financialYearId_fkey";

-- DropForeignKey
ALTER TABLE "number_series" DROP CONSTRAINT "number_series_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "opening_balance_entries" DROP CONSTRAINT "opening_balance_entries_financialYearId_fkey";

-- DropForeignKey
ALTER TABLE "opening_balance_entries" DROP CONSTRAINT "opening_balance_entries_ledgerId_fkey";

-- DropForeignKey
ALTER TABLE "payment_modes" DROP CONSTRAINT "payment_modes_defaultChargeLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "payroll_run_lines" DROP CONSTRAINT "payroll_run_lines_employeeLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "payroll_run_lines" DROP CONSTRAINT "payroll_run_lines_paymentVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "payroll_runs" DROP CONSTRAINT "payroll_runs_journalVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "period_lock_overrides" DROP CONSTRAINT "period_lock_overrides_accountingPeriodId_fkey";

-- DropForeignKey
ALTER TABLE "posting_queue_entries" DROP CONSTRAINT "posting_queue_entries_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "salary_structure_components" DROP CONSTRAINT "salary_structure_components_targetLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "supplier_bills" DROP CONSTRAINT "supplier_bills_accountingPeriodId_fkey";

-- DropForeignKey
ALTER TABLE "supplier_bills" DROP CONSTRAINT "supplier_bills_financialYearId_fkey";

-- DropForeignKey
ALTER TABLE "supplier_bills" DROP CONSTRAINT "supplier_bills_supplierLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "supplier_bills" DROP CONSTRAINT "supplier_bills_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "supplier_credit_notes" DROP CONSTRAINT "supplier_credit_notes_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "supplier_debit_notes" DROP CONSTRAINT "supplier_debit_notes_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "supplier_payments" DROP CONSTRAINT "supplier_payments_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "tds_deductions" DROP CONSTRAINT "tds_deductions_certificateId_fkey";

-- DropForeignKey
ALTER TABLE "tds_deductions" DROP CONSTRAINT "tds_deductions_paymentVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "tds_deductions" DROP CONSTRAINT "tds_deductions_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "tds_deductions" DROP CONSTRAINT "tds_deductions_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_batteries" DROP CONSTRAINT "vehicle_batteries_purchaseVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_compliance_records" DROP CONSTRAINT "vehicle_compliance_records_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_expenses" DROP CONSTRAINT "vehicle_expenses_expenseLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_expenses" DROP CONSTRAINT "vehicle_expenses_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_loan_disbursements" DROP CONSTRAINT "vehicle_loan_disbursements_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_loan_installments" DROP CONSTRAINT "vehicle_loan_installments_paidVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_loans" DROP CONSTRAINT "vehicle_loans_loanLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_tyres" DROP CONSTRAINT "vehicle_tyres_purchaseVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_audit_entries" DROP CONSTRAINT "voucher_audit_entries_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_lines" DROP CONSTRAINT "voucher_lines_costCenterId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_lines" DROP CONSTRAINT "voucher_lines_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_lines" DROP CONSTRAINT "voucher_lines_ledgerId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_lines" DROP CONSTRAINT "voucher_lines_taxLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_lines" DROP CONSTRAINT "voucher_lines_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_template_lines" DROP CONSTRAINT "voucher_template_lines_defaultCostCenterId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_template_lines" DROP CONSTRAINT "voucher_template_lines_ledgerId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_template_lines" DROP CONSTRAINT "voucher_template_lines_templateId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_templates" DROP CONSTRAINT "voucher_templates_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_templates" DROP CONSTRAINT "voucher_templates_voucherTypeId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_types" DROP CONSTRAINT "voucher_types_defaultCreditLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_types" DROP CONSTRAINT "voucher_types_defaultDebitLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_types" DROP CONSTRAINT "voucher_types_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "vouchers" DROP CONSTRAINT "vouchers_accountingPeriodId_fkey";

-- DropForeignKey
ALTER TABLE "vouchers" DROP CONSTRAINT "vouchers_financialYearId_fkey";

-- DropForeignKey
ALTER TABLE "vouchers" DROP CONSTRAINT "vouchers_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "vouchers" DROP CONSTRAINT "vouchers_reversalOfVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "vouchers" DROP CONSTRAINT "vouchers_voucherTypeId_fkey";

-- DropForeignKey
ALTER TABLE "year_end_closings" DROP CONSTRAINT "year_end_closings_profitTransferVoucherId_fkey";

-- DropIndex
DROP INDEX "asset_disposals_voucherId_key";

-- DropIndex
DROP INDEX "bank_accounts_ledgerId_key";

-- DropIndex
DROP INDEX "bank_transfers_voucherId_key";

-- DropIndex
DROP INDEX "cash_accounts_ledgerId_key";

-- DropIndex
DROP INDEX "cash_accounts_organizationId_ledgerId_key";

-- DropIndex
DROP INDEX "credit_notes_voucherId_key";

-- DropIndex
DROP INDEX "customer_debit_notes_voucherId_key";

-- DropIndex
DROP INDEX "depreciation_runs_journalVoucherId_key";

-- DropIndex
DROP INDEX "driver_advances_voucherId_key";

-- DropIndex
DROP INDEX "driver_earnings_voucherId_key";

-- DropIndex
DROP INDEX "driver_expense_reimbursements_voucherId_key";

-- DropIndex
DROP INDEX "driver_penalties_voucherId_key";

-- DropIndex
DROP INDEX "driver_settlements_journalVoucherId_key";

-- DropIndex
DROP INDEX "driver_settlements_paymentVoucherId_key";

-- DropIndex
DROP INDEX "employee_advances_voucherId_key";

-- DropIndex
DROP INDEX "fasttag_transactions_voucherId_key";

-- DropIndex
DROP INDEX "financial_entries_voucherId_key";

-- DropIndex
DROP INDEX "fixed_assets_purchaseVoucherId_key";

-- DropIndex
DROP INDEX "invoices_voucherId_key";

-- DropIndex
DROP INDEX "party_loans_disbursementVoucherId_key";

-- DropIndex
DROP INDEX "payroll_run_lines_paymentVoucherId_key";

-- DropIndex
DROP INDEX "payroll_runs_journalVoucherId_key";

-- DropIndex
DROP INDEX "receipts_voucherId_key";

-- DropIndex
DROP INDEX "supplier_bills_voucherId_key";

-- DropIndex
DROP INDEX "supplier_credit_notes_voucherId_key";

-- DropIndex
DROP INDEX "supplier_debit_notes_voucherId_key";

-- DropIndex
DROP INDEX "supplier_payments_voucherId_key";

-- DropIndex
DROP INDEX "vehicle_batteries_purchaseVoucherId_key";

-- DropIndex
DROP INDEX "vehicle_compliance_records_voucherId_key";

-- DropIndex
DROP INDEX "vehicle_expenses_voucherId_key";

-- DropIndex
DROP INDEX "vehicle_loan_disbursements_voucherId_key";

-- DropIndex
DROP INDEX "vehicle_loan_installments_paidVoucherId_key";

-- DropIndex
DROP INDEX "vehicle_tyres_purchaseVoucherId_key";

-- AlterTable
ALTER TABLE "asset_categories" DROP COLUMN "accumulatedDepreciationLedgerId",
DROP COLUMN "assetLedgerId",
DROP COLUMN "depreciationExpenseLedgerId";

-- AlterTable
ALTER TABLE "asset_disposals" DROP COLUMN "accountingPeriodId",
DROP COLUMN "financialYearId",
DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "bank_accounts" DROP COLUMN "chequeAwaitingClearanceLedgerId",
DROP COLUMN "chequeReceivedClearanceLedgerId",
DROP COLUMN "ledgerId",
DROP COLUMN "statementImportFormat",
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "bank_transfers" DROP COLUMN "chargeLedgerId",
DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "cash_accounts" DROP COLUMN "ledgerId",
ADD COLUMN     "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "cheques" DROP COLUMN "bounceChargeVoucherId",
DROP COLUMN "bounceReturnVoucherId",
DROP COLUMN "clearanceVoucherId",
DROP COLUMN "voucherId",
DROP COLUMN "partyType",
ADD COLUMN     "partyType" "FinancialPartyType";

-- AlterTable
ALTER TABLE "credit_notes" DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "customer_debit_notes" DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "depreciation_runs" DROP COLUMN "accountingPeriodId",
DROP COLUMN "financialYearId",
DROP COLUMN "journalVoucherId";

-- AlterTable
ALTER TABLE "driver_advances" DROP COLUMN "accountingPeriodId",
DROP COLUMN "driverLedgerId",
DROP COLUMN "financialYearId",
DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "driver_earnings" DROP COLUMN "accountingPeriodId",
DROP COLUMN "driverLedgerId",
DROP COLUMN "expenseLedgerId",
DROP COLUMN "financialYearId",
DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "driver_expense_reimbursements" DROP COLUMN "accountingPeriodId",
DROP COLUMN "driverLedgerId",
DROP COLUMN "expenseLedgerId",
DROP COLUMN "financialYearId",
DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "driver_penalties" DROP COLUMN "accountingPeriodId",
DROP COLUMN "contraLedgerId",
DROP COLUMN "driverLedgerId",
DROP COLUMN "financialYearId",
DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "driver_settlements" DROP COLUMN "accountingPeriodId",
DROP COLUMN "financialYearId",
DROP COLUMN "journalVoucherId",
DROP COLUMN "paymentVoucherId";

-- AlterTable
ALTER TABLE "employee_advances" DROP COLUMN "accountingPeriodId",
DROP COLUMN "employeeLedgerId",
DROP COLUMN "financialYearId",
DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "fasttag_accounts" DROP COLUMN "ledgerId";

-- AlterTable
ALTER TABLE "fasttag_transactions" DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "financial_entries" DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "fixed_assets" DROP COLUMN "accountingPeriodId",
DROP COLUMN "financialYearId",
DROP COLUMN "purchaseVoucherId";

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "accountingPeriodId",
DROP COLUMN "customerLedgerId",
DROP COLUMN "financialYearId",
DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "party_loans" DROP COLUMN "accountingPeriodId",
DROP COLUMN "borrowerLedgerId",
DROP COLUMN "disbursementVoucherId",
DROP COLUMN "financialYearId";

-- AlterTable
ALTER TABLE "payment_modes" DROP COLUMN "defaultChargeLedgerId";

-- AlterTable
ALTER TABLE "payroll_run_lines" DROP COLUMN "employeeLedgerId",
DROP COLUMN "paymentVoucherId";

-- AlterTable
ALTER TABLE "payroll_runs" DROP COLUMN "accountingPeriodId",
DROP COLUMN "financialYearId",
DROP COLUMN "journalVoucherId";

-- AlterTable
ALTER TABLE "receipts" DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "salary_structure_components" DROP COLUMN "targetLedgerId";

-- AlterTable
ALTER TABLE "supplier_bills" DROP COLUMN "accountingPeriodId",
DROP COLUMN "financialYearId",
DROP COLUMN "supplierLedgerId",
DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "supplier_credit_notes" DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "supplier_debit_notes" DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "supplier_payments" DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "vehicle_batteries" DROP COLUMN "purchaseVoucherId";

-- AlterTable
ALTER TABLE "vehicle_compliance_records" DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "vehicle_expenses" DROP COLUMN "accountingPeriodId",
DROP COLUMN "expenseLedgerId",
DROP COLUMN "financialYearId",
DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "vehicle_loan_disbursements" DROP COLUMN "voucherId";

-- AlterTable
ALTER TABLE "vehicle_loan_installments" DROP COLUMN "paidVoucherId";

-- AlterTable
ALTER TABLE "vehicle_loans" DROP COLUMN "accountingPeriodId",
DROP COLUMN "financialYearId",
DROP COLUMN "loanLedgerId";

-- AlterTable
ALTER TABLE "vehicle_tyres" DROP COLUMN "purchaseVoucherId";

-- DropTable
DROP TABLE "account_groups";

-- DropTable
DROP TABLE "accounting_event_mappings";

-- DropTable
DROP TABLE "accounting_periods";

-- DropTable
DROP TABLE "accounting_preferences";

-- DropTable
DROP TABLE "approval_instances";

-- DropTable
DROP TABLE "approval_rules";

-- DropTable
DROP TABLE "bank_reconciliation_lines";

-- DropTable
DROP TABLE "bank_reconciliations";

-- DropTable
DROP TABLE "bank_statement_import_batches";

-- DropTable
DROP TABLE "bank_statement_import_lines";

-- DropTable
DROP TABLE "budget_lines";

-- DropTable
DROP TABLE "budgets";

-- DropTable
DROP TABLE "cash_flow_category_mappings";

-- DropTable
DROP TABLE "cost_categories";

-- DropTable
DROP TABLE "cost_centers";

-- DropTable
DROP TABLE "financial_years";

-- DropTable
DROP TABLE "gst_adjustments";

-- DropTable
DROP TABLE "gst_registrations";

-- DropTable
DROP TABLE "gst_return_periods";

-- DropTable
DROP TABLE "ledgers";

-- DropTable
DROP TABLE "number_series";

-- DropTable
DROP TABLE "opening_balance_entries";

-- DropTable
DROP TABLE "period_lock_overrides";

-- DropTable
DROP TABLE "posting_queue_entries";

-- DropTable
DROP TABLE "tds_certificates";

-- DropTable
DROP TABLE "tds_deductions";

-- DropTable
DROP TABLE "tds_sections";

-- DropTable
DROP TABLE "voucher_audit_entries";

-- DropTable
DROP TABLE "voucher_lines";

-- DropTable
DROP TABLE "voucher_template_lines";

-- DropTable
DROP TABLE "voucher_templates";

-- DropTable
DROP TABLE "voucher_types";

-- DropTable
DROP TABLE "vouchers";

-- DropTable
DROP TABLE "year_end_closings";

-- DropEnum
DROP TYPE "AccountClassification";

-- DropEnum
DROP TYPE "AccountingPeriodStatus";

-- DropEnum
DROP TYPE "AccountingPeriodType";

-- DropEnum
DROP TYPE "ApprovalModule";

-- DropEnum
DROP TYPE "BalanceSide";

-- DropEnum
DROP TYPE "BankReconciliationStatus";

-- DropEnum
DROP TYPE "BankStatementFileFormat";

-- DropEnum
DROP TYPE "BankStatementImportStatus";

-- DropEnum
DROP TYPE "BudgetPeriodType";

-- DropEnum
DROP TYPE "BudgetScope";

-- DropEnum
DROP TYPE "BudgetStatus";

-- DropEnum
DROP TYPE "BudgetType";

-- DropEnum
DROP TYPE "CashFlowCategory";

-- DropEnum
DROP TYPE "CostCenterRefType";

-- DropEnum
DROP TYPE "FinancialYearStatus";

-- DropEnum
DROP TYPE "GstAdjustmentType";

-- DropEnum
DROP TYPE "GstReturnStatus";

-- DropEnum
DROP TYPE "GstReturnType";

-- DropEnum
DROP TYPE "LedgerPartyType";

-- DropEnum
DROP TYPE "NumberSeriesDocumentType";

-- DropEnum
DROP TYPE "NumberSeriesResetFrequency";

-- DropEnum
DROP TYPE "NumberingMode";

-- DropEnum
DROP TYPE "PostingQueueStatus";

-- DropEnum
DROP TYPE "ReconciliationLineStatus";

-- DropEnum
DROP TYPE "TdsApplicability";

-- DropEnum
DROP TYPE "TdsCertificateStatus";

-- DropEnum
DROP TYPE "TdsDeducteeType";

-- DropEnum
DROP TYPE "VoucherApprovalDecision";

-- DropEnum
DROP TYPE "VoucherApprovalStatus";

-- DropEnum
DROP TYPE "VoucherAttachmentCategory";

-- DropEnum
DROP TYPE "VoucherAuditAction";

-- DropEnum
DROP TYPE "VoucherPostingStatus";

-- DropEnum
DROP TYPE "VoucherReferenceType";

-- DropEnum
DROP TYPE "VoucherSourceModule";

-- DropEnum
DROP TYPE "VoucherStatus";

-- CreateIndex
CREATE INDEX "cheques_partyType_partyId_idx" ON "cheques"("partyType", "partyId");

