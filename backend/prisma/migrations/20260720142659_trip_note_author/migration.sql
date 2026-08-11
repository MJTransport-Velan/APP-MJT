-- AddForeignKey
ALTER TABLE "trip_notes" ADD CONSTRAINT "trip_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
