-- CreateExtension (only used by this migration's data backfill below, for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_memberships" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "group_memberships_userId_key" ON "group_memberships"("userId");

-- CreateIndex
CREATE INDEX "group_memberships_groupId_idx" ON "group_memberships"("groupId");

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (nullable for now — backfilled below, then locked to NOT NULL)
ALTER TABLE "companies" ADD COLUMN "groupId" TEXT;

-- Data migration: create a Default Group, point every existing company at
-- it, and backfill GroupMembership from everyone who held an active
-- assignment in the three tables dropped below. This preserves today's
-- access universe as a strict superset — nobody loses access on deploy;
-- group membership/company placement can be narrowed manually afterward.
DO $$
DECLARE
  default_group_id TEXT;
BEGIN
  default_group_id := gen_random_uuid()::text;

  INSERT INTO "groups" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
  VALUES (
    default_group_id,
    'Default Group',
    'Auto-created by the Groups migration to hold all pre-existing companies and their previously assigned Intent Creator / Vehicle Operations / Accounts users.',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

  UPDATE "companies" SET "groupId" = default_group_id WHERE "groupId" IS NULL;

  INSERT INTO "group_memberships" ("id", "groupId", "userId", "createdAt")
  SELECT gen_random_uuid()::text, default_group_id, u."userId", CURRENT_TIMESTAMP
  FROM (
    SELECT "userId" FROM "intent_company_assignments" WHERE "isActive" = true
    UNION
    SELECT "userId" FROM "vehicle_operation_assignments" WHERE "isActive" = true
    UNION
    SELECT "userId" FROM "accounts_company_assignments" WHERE "isActive" = true
  ) u
  ON CONFLICT ("userId") DO NOTHING;
END $$;

-- AlterTable (every row now has a value)
ALTER TABLE "companies" ALTER COLUMN "groupId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "companies_groupId_idx" ON "companies"("groupId");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropTable (their FK constraints and indexes are dropped implicitly with the tables)
DROP TABLE "intent_company_assignments";
DROP TABLE "vehicle_operation_assignments";
DROP TABLE "accounts_company_assignments";

-- DropEnum
DROP TYPE "VehicleTeamType";
