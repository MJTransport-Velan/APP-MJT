-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'CONTRACT', 'TEMPORARY', 'DAILY_WAGE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DriverAdvanceType" AS ENUM ('SALARY_ADVANCE', 'TRIP_ADVANCE', 'EMERGENCY_ADVANCE', 'FUEL_ADVANCE', 'TOLL_ADVANCE', 'REPAIR_ADVANCE', 'MEDICAL_ADVANCE', 'ADVANCE_AGAINST_SALARY', 'ADVANCE_AGAINST_TRIP', 'OTHER');

-- CreateEnum
CREATE TYPE "DriverExpenseCategory" AS ENUM ('FUEL', 'REPAIR', 'TYRE', 'BATTERY', 'PARKING', 'TOLL', 'FOOD', 'ACCOMMODATION', 'MEDICAL', 'PHONE', 'MISCELLANEOUS');

-- CreateEnum
CREATE TYPE "DriverEarningCategory" AS ENUM ('ALLOWANCE', 'INCENTIVE');

-- CreateEnum
CREATE TYPE "DriverEarningType" AS ENUM ('TRIP_BATA', 'DAILY_BATA', 'NIGHT_BATA', 'LOADING_ALLOWANCE', 'UNLOADING_ALLOWANCE', 'WAITING_CHARGES', 'OUTSTATION_ALLOWANCE', 'FOOD_ALLOWANCE', 'SPECIAL_ALLOWANCE', 'TRIP_INCENTIVE', 'MONTHLY_INCENTIVE', 'FUEL_SAVING_INCENTIVE', 'ON_TIME_DELIVERY_INCENTIVE', 'PERFORMANCE_BONUS', 'TARGET_INCENTIVE', 'FESTIVAL_BONUS', 'REFERRAL_BONUS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EarningCalculationType" AS ENUM ('FIXED_PER_TRIP', 'PER_KM', 'PER_DAY', 'PERCENT_OF_FREIGHT');

-- CreateEnum
CREATE TYPE "DriverPenaltyType" AS ENUM ('FUEL_RECOVERY', 'DAMAGE_RECOVERY', 'ACCIDENT_RECOVERY', 'LATE_DELIVERY_PENALTY', 'TRAFFIC_FINE', 'ADVANCE_RECOVERY', 'LOAN_RECOVERY', 'UNIFORM_RECOVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "DriverLoanType" AS ENUM ('PERSONAL', 'EMERGENCY', 'VEHICLE', 'FESTIVAL', 'MEDICAL');

-- CreateEnum
CREATE TYPE "EmployeeLoanType" AS ENUM ('PERSONAL', 'EMERGENCY', 'FESTIVAL', 'MEDICAL');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'CLOSED', 'REJECTED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "LoanInstallmentStatus" AS ENUM ('PENDING', 'RECOVERED', 'WAIVED');

-- CreateEnum
CREATE TYPE "DriverSettlementType" AS ENUM ('PARTIAL', 'FINAL', 'EXIT', 'YEAR_END');

-- CreateEnum
CREATE TYPE "DriverSettlementStatus" AS ENUM ('DRAFT', 'CALCULATED', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "SettlementLineSourceType" AS ENUM ('ADVANCE', 'ALLOWANCE', 'INCENTIVE', 'REIMBURSEMENT', 'PENALTY', 'LOAN_INSTALLMENT', 'SALARY');

-- CreateEnum
CREATE TYPE "LineDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "SalaryComponentType" AS ENUM ('BASIC', 'HRA', 'DA', 'SPECIAL_ALLOWANCE', 'TRAVEL_ALLOWANCE', 'MEDICAL_ALLOWANCE', 'PF', 'ESI', 'PROFESSIONAL_TAX', 'TDS', 'OTHER_DEDUCTION', 'BONUS', 'ARREARS', 'LEAVE_DEDUCTION', 'ATTENDANCE_DEDUCTION', 'OVERTIME', 'RECOVERY', 'MANUAL_ADJUSTMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SalaryCalculationType" AS ENUM ('FIXED_AMOUNT', 'PERCENT_OF_BASIC', 'PERCENT_OF_GROSS');

-- CreateEnum
CREATE TYPE "EmployeeAdvanceType" AS ENUM ('SALARY_ADVANCE', 'EMERGENCY_ADVANCE', 'MEDICAL_ADVANCE', 'ADVANCE_AGAINST_SALARY', 'OTHER');

-- CreateEnum
CREATE TYPE "PayrollPeriodType" AS ENUM ('MONTHLY', 'WEEKLY', 'DAILY_WAGE', 'CONTRACT');

-- CreateEnum
CREATE TYPE "PayrollRunType" AS ENUM ('REGULAR', 'FINAL_SETTLEMENT', 'EXIT');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'CALCULATED', 'VERIFIED', 'APPROVED', 'PROCESSED', 'PAID', 'CANCELLED');

-- AlterEnum
ALTER TYPE "VoucherSourceModule" ADD VALUE 'DRIVER';

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designationId" TEXT,
    "userId" TEXT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'PERMANENT',
    "dateOfJoining" TIMESTAMP(3),
    "dateOfExit" TIMESTAMP(3),
    "panNumber" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfsc" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_advances" (
    "id" TEXT NOT NULL,
    "advanceNumber" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tripId" TEXT,
    "vehicleId" TEXT,
    "advanceType" "DriverAdvanceType" NOT NULL,
    "purpose" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "requestedById" TEXT,
    "approvedById" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "paymentModeId" TEXT,
    "fundAccountType" "FundAccountType",
    "fundAccountId" TEXT,
    "driverLedgerId" TEXT,
    "voucherId" TEXT,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settlementId" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_expense_reimbursements" (
    "id" TEXT NOT NULL,
    "reimbursementNumber" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tripId" TEXT,
    "vehicleId" TEXT,
    "category" "DriverExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "receiptDocument" TEXT,
    "expenseLedgerId" TEXT,
    "approvedById" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "driverLedgerId" TEXT,
    "voucherId" TEXT,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settlementId" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_expense_reimbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_earning_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "earningCategory" "DriverEarningCategory" NOT NULL,
    "earningType" "DriverEarningType" NOT NULL,
    "calculationType" "EarningCalculationType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "vehicleTypeId" TEXT,
    "routeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_earning_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_earnings" (
    "id" TEXT NOT NULL,
    "earningNumber" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tripId" TEXT,
    "earningCategory" "DriverEarningCategory" NOT NULL,
    "earningType" "DriverEarningType" NOT NULL,
    "name" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "ruleId" TEXT,
    "expenseLedgerId" TEXT,
    "approvedById" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "driverLedgerId" TEXT,
    "voucherId" TEXT,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settlementId" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_penalties" (
    "id" TEXT NOT NULL,
    "penaltyNumber" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tripId" TEXT,
    "penaltyType" "DriverPenaltyType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "contraLedgerId" TEXT,
    "approvedById" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "driverLedgerId" TEXT,
    "voucherId" TEXT,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settlementId" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_loans" (
    "id" TEXT NOT NULL,
    "loanNumber" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "loanType" "DriverLoanType" NOT NULL,
    "principalAmount" DECIMAL(12,2) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "emiAmount" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "approvedById" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "driverLedgerId" TEXT,
    "disbursementVoucherId" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_loan_installments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "emiAmount" DECIMAL(12,2) NOT NULL,
    "status" "LoanInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "recoveredSettlementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_loan_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_settlements" (
    "id" TEXT NOT NULL,
    "settlementNumber" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "settlementType" "DriverSettlementType" NOT NULL DEFAULT 'PARTIAL',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "DriverSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "grossEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPayable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "journalVoucherId" TEXT,
    "paymentVoucherId" TEXT,
    "approvedById" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_settlement_lines" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "sourceType" "SettlementLineSourceType" NOT NULL,
    "sourceId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "direction" "LineDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_settlement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structures" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structure_components" (
    "id" TEXT NOT NULL,
    "salaryStructureId" TEXT NOT NULL,
    "componentType" "SalaryComponentType" NOT NULL,
    "name" TEXT,
    "calculationType" "SalaryCalculationType" NOT NULL DEFAULT 'FIXED_AMOUNT',
    "value" DECIMAL(12,2) NOT NULL,
    "isEarning" BOOLEAN NOT NULL,
    "targetLedgerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structure_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_advances" (
    "id" TEXT NOT NULL,
    "advanceNumber" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "advanceType" "EmployeeAdvanceType" NOT NULL,
    "purpose" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "requestedById" TEXT,
    "approvedById" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "paymentModeId" TEXT,
    "fundAccountType" "FundAccountType",
    "fundAccountId" TEXT,
    "employeeLedgerId" TEXT,
    "voucherId" TEXT,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "payrollRunLineId" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_loans" (
    "id" TEXT NOT NULL,
    "loanNumber" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "loanType" "EmployeeLoanType" NOT NULL,
    "principalAmount" DECIMAL(12,2) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "emiAmount" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "approvedById" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "employeeLedgerId" TEXT,
    "disbursementVoucherId" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_loan_installments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "emiAmount" DECIMAL(12,2) NOT NULL,
    "status" "LoanInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "recoveredInPayrollRunLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_loan_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "runNumber" TEXT NOT NULL,
    "periodType" "PayrollPeriodType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "runType" "PayrollRunType" NOT NULL DEFAULT 'REGULAR',
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "journalVoucherId" TEXT,
    "approvedById" TEXT,
    "processedById" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run_lines" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeLedgerId" TEXT,
    "grossEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentVoucherId" TEXT,
    "fundAccountType" "FundAccountType",
    "fundAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_run_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run_line_components" (
    "id" TEXT NOT NULL,
    "payrollRunLineId" TEXT NOT NULL,
    "componentType" "SalaryComponentType" NOT NULL,
    "name" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "isEarning" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_run_line_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "employees"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_advances_advanceNumber_key" ON "driver_advances"("advanceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "driver_advances_voucherId_key" ON "driver_advances"("voucherId");

-- CreateIndex
CREATE INDEX "driver_advances_driverId_idx" ON "driver_advances"("driverId");

-- CreateIndex
CREATE INDEX "driver_advances_tripId_idx" ON "driver_advances"("tripId");

-- CreateIndex
CREATE INDEX "driver_advances_settlementId_idx" ON "driver_advances"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_expense_reimbursements_reimbursementNumber_key" ON "driver_expense_reimbursements"("reimbursementNumber");

-- CreateIndex
CREATE UNIQUE INDEX "driver_expense_reimbursements_voucherId_key" ON "driver_expense_reimbursements"("voucherId");

-- CreateIndex
CREATE INDEX "driver_expense_reimbursements_driverId_idx" ON "driver_expense_reimbursements"("driverId");

-- CreateIndex
CREATE INDEX "driver_expense_reimbursements_tripId_idx" ON "driver_expense_reimbursements"("tripId");

-- CreateIndex
CREATE INDEX "driver_expense_reimbursements_settlementId_idx" ON "driver_expense_reimbursements"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_earnings_earningNumber_key" ON "driver_earnings"("earningNumber");

-- CreateIndex
CREATE UNIQUE INDEX "driver_earnings_voucherId_key" ON "driver_earnings"("voucherId");

-- CreateIndex
CREATE INDEX "driver_earnings_driverId_idx" ON "driver_earnings"("driverId");

-- CreateIndex
CREATE INDEX "driver_earnings_tripId_idx" ON "driver_earnings"("tripId");

-- CreateIndex
CREATE INDEX "driver_earnings_settlementId_idx" ON "driver_earnings"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_penalties_penaltyNumber_key" ON "driver_penalties"("penaltyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "driver_penalties_voucherId_key" ON "driver_penalties"("voucherId");

-- CreateIndex
CREATE INDEX "driver_penalties_driverId_idx" ON "driver_penalties"("driverId");

-- CreateIndex
CREATE INDEX "driver_penalties_tripId_idx" ON "driver_penalties"("tripId");

-- CreateIndex
CREATE INDEX "driver_penalties_settlementId_idx" ON "driver_penalties"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_loans_loanNumber_key" ON "driver_loans"("loanNumber");

-- CreateIndex
CREATE UNIQUE INDEX "driver_loans_disbursementVoucherId_key" ON "driver_loans"("disbursementVoucherId");

-- CreateIndex
CREATE INDEX "driver_loans_driverId_idx" ON "driver_loans"("driverId");

-- CreateIndex
CREATE INDEX "driver_loan_installments_loanId_idx" ON "driver_loan_installments"("loanId");

-- CreateIndex
CREATE INDEX "driver_loan_installments_recoveredSettlementId_idx" ON "driver_loan_installments"("recoveredSettlementId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_settlements_settlementNumber_key" ON "driver_settlements"("settlementNumber");

-- CreateIndex
CREATE UNIQUE INDEX "driver_settlements_journalVoucherId_key" ON "driver_settlements"("journalVoucherId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_settlements_paymentVoucherId_key" ON "driver_settlements"("paymentVoucherId");

-- CreateIndex
CREATE INDEX "driver_settlements_driverId_idx" ON "driver_settlements"("driverId");

-- CreateIndex
CREATE INDEX "driver_settlement_lines_settlementId_idx" ON "driver_settlement_lines"("settlementId");

-- CreateIndex
CREATE INDEX "salary_structures_employeeId_idx" ON "salary_structures"("employeeId");

-- CreateIndex
CREATE INDEX "salary_structure_components_salaryStructureId_idx" ON "salary_structure_components"("salaryStructureId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_advances_advanceNumber_key" ON "employee_advances"("advanceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employee_advances_voucherId_key" ON "employee_advances"("voucherId");

-- CreateIndex
CREATE INDEX "employee_advances_employeeId_idx" ON "employee_advances"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_loans_loanNumber_key" ON "employee_loans"("loanNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employee_loans_disbursementVoucherId_key" ON "employee_loans"("disbursementVoucherId");

-- CreateIndex
CREATE INDEX "employee_loans_employeeId_idx" ON "employee_loans"("employeeId");

-- CreateIndex
CREATE INDEX "employee_loan_installments_loanId_idx" ON "employee_loan_installments"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_runNumber_key" ON "payroll_runs"("runNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_journalVoucherId_key" ON "payroll_runs"("journalVoucherId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_run_lines_paymentVoucherId_key" ON "payroll_run_lines"("paymentVoucherId");

-- CreateIndex
CREATE INDEX "payroll_run_lines_payrollRunId_idx" ON "payroll_run_lines"("payrollRunId");

-- CreateIndex
CREATE INDEX "payroll_run_lines_employeeId_idx" ON "payroll_run_lines"("employeeId");

-- CreateIndex
CREATE INDEX "payroll_run_line_components_payrollRunLineId_idx" ON "payroll_run_line_components"("payrollRunLineId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_advances" ADD CONSTRAINT "driver_advances_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_advances" ADD CONSTRAINT "driver_advances_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_advances" ADD CONSTRAINT "driver_advances_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_advances" ADD CONSTRAINT "driver_advances_paymentModeId_fkey" FOREIGN KEY ("paymentModeId") REFERENCES "payment_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_advances" ADD CONSTRAINT "driver_advances_driverLedgerId_fkey" FOREIGN KEY ("driverLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_advances" ADD CONSTRAINT "driver_advances_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_advances" ADD CONSTRAINT "driver_advances_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "driver_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_expense_reimbursements" ADD CONSTRAINT "driver_expense_reimbursements_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_expense_reimbursements" ADD CONSTRAINT "driver_expense_reimbursements_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_expense_reimbursements" ADD CONSTRAINT "driver_expense_reimbursements_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_expense_reimbursements" ADD CONSTRAINT "driver_expense_reimbursements_expenseLedgerId_fkey" FOREIGN KEY ("expenseLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_expense_reimbursements" ADD CONSTRAINT "driver_expense_reimbursements_driverLedgerId_fkey" FOREIGN KEY ("driverLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_expense_reimbursements" ADD CONSTRAINT "driver_expense_reimbursements_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_expense_reimbursements" ADD CONSTRAINT "driver_expense_reimbursements_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "driver_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_earning_rules" ADD CONSTRAINT "driver_earning_rules_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "vehicle_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_earning_rules" ADD CONSTRAINT "driver_earning_rules_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "transport_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "driver_earning_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_expenseLedgerId_fkey" FOREIGN KEY ("expenseLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_driverLedgerId_fkey" FOREIGN KEY ("driverLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "driver_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_penalties" ADD CONSTRAINT "driver_penalties_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_penalties" ADD CONSTRAINT "driver_penalties_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_penalties" ADD CONSTRAINT "driver_penalties_contraLedgerId_fkey" FOREIGN KEY ("contraLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_penalties" ADD CONSTRAINT "driver_penalties_driverLedgerId_fkey" FOREIGN KEY ("driverLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_penalties" ADD CONSTRAINT "driver_penalties_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_penalties" ADD CONSTRAINT "driver_penalties_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "driver_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_loans" ADD CONSTRAINT "driver_loans_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_loans" ADD CONSTRAINT "driver_loans_driverLedgerId_fkey" FOREIGN KEY ("driverLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_loans" ADD CONSTRAINT "driver_loans_disbursementVoucherId_fkey" FOREIGN KEY ("disbursementVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_loan_installments" ADD CONSTRAINT "driver_loan_installments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "driver_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_loan_installments" ADD CONSTRAINT "driver_loan_installments_recoveredSettlementId_fkey" FOREIGN KEY ("recoveredSettlementId") REFERENCES "driver_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_settlements" ADD CONSTRAINT "driver_settlements_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_settlements" ADD CONSTRAINT "driver_settlements_journalVoucherId_fkey" FOREIGN KEY ("journalVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_settlements" ADD CONSTRAINT "driver_settlements_paymentVoucherId_fkey" FOREIGN KEY ("paymentVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_settlement_lines" ADD CONSTRAINT "driver_settlement_lines_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "driver_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structure_components" ADD CONSTRAINT "salary_structure_components_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structure_components" ADD CONSTRAINT "salary_structure_components_targetLedgerId_fkey" FOREIGN KEY ("targetLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_advances" ADD CONSTRAINT "employee_advances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_advances" ADD CONSTRAINT "employee_advances_paymentModeId_fkey" FOREIGN KEY ("paymentModeId") REFERENCES "payment_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_advances" ADD CONSTRAINT "employee_advances_employeeLedgerId_fkey" FOREIGN KEY ("employeeLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_advances" ADD CONSTRAINT "employee_advances_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_advances" ADD CONSTRAINT "employee_advances_payrollRunLineId_fkey" FOREIGN KEY ("payrollRunLineId") REFERENCES "payroll_run_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_loans" ADD CONSTRAINT "employee_loans_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_loans" ADD CONSTRAINT "employee_loans_employeeLedgerId_fkey" FOREIGN KEY ("employeeLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_loans" ADD CONSTRAINT "employee_loans_disbursementVoucherId_fkey" FOREIGN KEY ("disbursementVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_loan_installments" ADD CONSTRAINT "employee_loan_installments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "employee_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_loan_installments" ADD CONSTRAINT "employee_loan_installments_recoveredInPayrollRunLineId_fkey" FOREIGN KEY ("recoveredInPayrollRunLineId") REFERENCES "payroll_run_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_journalVoucherId_fkey" FOREIGN KEY ("journalVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_lines" ADD CONSTRAINT "payroll_run_lines_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_lines" ADD CONSTRAINT "payroll_run_lines_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_lines" ADD CONSTRAINT "payroll_run_lines_employeeLedgerId_fkey" FOREIGN KEY ("employeeLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_lines" ADD CONSTRAINT "payroll_run_lines_paymentVoucherId_fkey" FOREIGN KEY ("paymentVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_line_components" ADD CONSTRAINT "payroll_run_line_components_payrollRunLineId_fkey" FOREIGN KEY ("payrollRunLineId") REFERENCES "payroll_run_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
