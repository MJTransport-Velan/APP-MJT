-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "assignedById" TEXT;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
