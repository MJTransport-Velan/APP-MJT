-- CreateEnum
CREATE TYPE "DriverSalaryType" AS ENUM ('FIXED', 'PERCENT_OF_FREIGHT');

-- CreateTable
CREATE TABLE "driver_salary_structures" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "salaryType" "DriverSalaryType" NOT NULL,
    "fixedAmount" DECIMAL(12,2),
    "percentValue" DECIMAL(5,2),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "driver_salary_structures_driverId_idx" ON "driver_salary_structures"("driverId");

-- AddForeignKey
ALTER TABLE "driver_salary_structures" ADD CONSTRAINT "driver_salary_structures_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

