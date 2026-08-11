-- AlterEnum
BEGIN;
CREATE TYPE "ImportEntityType_new" AS ENUM ('SUPPLIER', 'EMPLOYEE', 'DRIVER');
ALTER TABLE "import_batches" ALTER COLUMN "entityType" TYPE "ImportEntityType_new" USING ("entityType"::text::"ImportEntityType_new");
ALTER TYPE "ImportEntityType" RENAME TO "ImportEntityType_old";
ALTER TYPE "ImportEntityType_new" RENAME TO "ImportEntityType";
DROP TYPE "ImportEntityType_old";
COMMIT;

