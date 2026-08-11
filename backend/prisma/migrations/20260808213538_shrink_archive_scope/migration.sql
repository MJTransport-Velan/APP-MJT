-- AlterEnum
BEGIN;
CREATE TYPE "ArchiveScope_new" AS ENUM ('AUDIT_LOG', 'API_REQUEST_LOG', 'WEBHOOK_DELIVERY');
ALTER TABLE "archive_runs" ALTER COLUMN "scope" TYPE "ArchiveScope_new" USING ("scope"::text::"ArchiveScope_new");
ALTER TYPE "ArchiveScope" RENAME TO "ArchiveScope_old";
ALTER TYPE "ArchiveScope_new" RENAME TO "ArchiveScope";
DROP TYPE "ArchiveScope_old";
COMMIT;

