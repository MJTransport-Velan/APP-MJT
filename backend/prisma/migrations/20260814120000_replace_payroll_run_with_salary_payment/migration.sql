-- DropForeignKey
ALTER TABLE "payroll_run_lines" DROP CONSTRAINT "payroll_run_lines_payrollRunId_fkey";

-- DropForeignKey
ALTER TABLE "payroll_run_lines" DROP CONSTRAINT "payroll_run_lines_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "payroll_run_line_components" DROP CONSTRAINT "payroll_run_line_components_payrollRunLineId_fkey";

-- DropForeignKey
ALTER TABLE "employee_advances" DROP CONSTRAINT "employee_advances_payrollRunLineId_fkey";

-- AlterTable
ALTER TABLE "employee_advances" DROP COLUMN "payrollRunLineId";

-- DropTable
DROP TABLE "payroll_run_line_components";

-- DropTable
DROP TABLE "payroll_run_lines";

-- DropTable
DROP TABLE "payroll_runs";

-- DropEnum
DROP TYPE "PayrollPeriodType";

-- DropEnum
DROP TYPE "PayrollRunType";

-- DropEnum
DROP TYPE "PayrollRunStatus";

-- CreateTable
CREATE TABLE "employee_salary_payments" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidDate" DATE NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_salary_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_salary_payments_employeeId_idx" ON "employee_salary_payments"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_salary_payments_employeeId_year_month_key" ON "employee_salary_payments"("employeeId", "year", "month");

-- AddForeignKey
ALTER TABLE "employee_salary_payments" ADD CONSTRAINT "employee_salary_payments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
