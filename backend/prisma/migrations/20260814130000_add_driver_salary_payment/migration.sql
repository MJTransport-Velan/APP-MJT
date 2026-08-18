-- CreateTable
CREATE TABLE "driver_salary_payments" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidDate" DATE NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_salary_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "driver_salary_payments_driverId_idx" ON "driver_salary_payments"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_salary_payments_driverId_year_month_key" ON "driver_salary_payments"("driverId", "year", "month");

-- AddForeignKey
ALTER TABLE "driver_salary_payments" ADD CONSTRAINT "driver_salary_payments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
