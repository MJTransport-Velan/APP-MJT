-- AlterEnum
BEGIN;
CREATE TYPE "ArchiveScope_new" AS ENUM ('AUDIT_LOG', 'VOUCHER_AUDIT_ENTRY', 'API_REQUEST_LOG', 'WEBHOOK_DELIVERY', 'VOUCHER');
ALTER TABLE "archive_runs" ALTER COLUMN "scope" TYPE "ArchiveScope_new" USING ("scope"::text::"ArchiveScope_new");
ALTER TYPE "ArchiveScope" RENAME TO "ArchiveScope_old";
ALTER TYPE "ArchiveScope_new" RENAME TO "ArchiveScope";
DROP TYPE "ArchiveScope_old";
COMMIT;

-- AlterEnum
ALTER TYPE "SystemSettingCategory" ADD VALUE 'INTEGRATION';

-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_userId_fkey";

-- DropTable
DROP TABLE "activity_logs";

-- DropTable
DROP TABLE "allowed_ip_ranges";

-- DropTable
DROP TABLE "approval_escalation_logs";

-- DropTable
DROP TABLE "integration_connectors";

-- DropEnum
DROP TYPE "IntegrationConnectorStatus";

-- DropEnum
DROP TYPE "IntegrationConnectorType";

