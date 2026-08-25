-- Remove Asset Disposal, Asset Transfer, Vehicle Compliance, Depreciation
-- Processing, Vehicle Tyres, Vehicle Batteries and Vehicle Loans.
--
-- What survives on the asset side: the Fixed Asset Register itself
-- (fixed_assets), its categories (asset_categories) and the read-only
-- asset dashboard computed over them. The Tyre MASTER (`tyres`, a
-- brand/size catalog under Masters) is untouched — only the per-vehicle
-- installed-tyre tracking goes.
--
-- DESTRUCTIVE: every row in each table dropped below is lost.

-- Drop children before parents so no FK blocks the drop.
DROP TABLE IF EXISTS "asset_disposals";
DROP TABLE IF EXISTS "asset_transfers";
DROP TABLE IF EXISTS "depreciation_run_lines";
DROP TABLE IF EXISTS "depreciation_runs";
DROP TABLE IF EXISTS "vehicle_insurance_claims";
DROP TABLE IF EXISTS "vehicle_compliance_records";
DROP TABLE IF EXISTS "tyre_movements";
DROP TABLE IF EXISTS "vehicle_tyres";
DROP TABLE IF EXISTS "vehicle_batteries";
DROP TABLE IF EXISTS "vehicle_loan_installments";
DROP TABLE IF EXISTS "vehicle_loan_disbursements";
DROP TABLE IF EXISTS "vehicle_loans";

-- Enums that had no other user than the tables above.
DROP TYPE IF EXISTS "AssetDisposalType";
DROP TYPE IF EXISTS "AssetTransferType";
DROP TYPE IF EXISTS "DepreciationRunStatus";
DROP TYPE IF EXISTS "DepreciationPeriodType";
DROP TYPE IF EXISTS "InsuranceClaimStatus";
DROP TYPE IF EXISTS "ComplianceType";
DROP TYPE IF EXISTS "ComplianceStatus";
DROP TYPE IF EXISTS "TyreMovementType";
DROP TYPE IF EXISTS "VehicleTyreStatus";
DROP TYPE IF EXISTS "VehicleBatteryStatus";
DROP TYPE IF EXISTS "VehicleLoanInstallmentStatus";
DROP TYPE IF EXISTS "VehicleLoanStatus";
DROP TYPE IF EXISTS "LenderType";

-- FixedAssetStatus loses UNDER_TRANSFER and DISPOSED — both were reachable
-- only through the transfer/disposal flows just dropped. Existing rows are
-- remapped first (an in-flight transfer falls back to ACTIVE; a disposed
-- asset is recorded as WRITTEN_OFF) so no row references a value that is
-- about to disappear.
UPDATE "fixed_assets" SET "status" = 'ACTIVE' WHERE "status" = 'UNDER_TRANSFER';
UPDATE "fixed_assets" SET "status" = 'WRITTEN_OFF' WHERE "status" = 'DISPOSED';

ALTER TYPE "FixedAssetStatus" RENAME TO "FixedAssetStatus_old";
CREATE TYPE "FixedAssetStatus" AS ENUM ('ACTIVE', 'WRITTEN_OFF');
ALTER TABLE "fixed_assets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "fixed_assets"
  ALTER COLUMN "status" TYPE "FixedAssetStatus"
  USING ("status"::text::"FixedAssetStatus");
ALTER TABLE "fixed_assets" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "FixedAssetStatus_old";

-- The permissions these modules registered go with them; role_permissions
-- cascades. asset.* and asset_category.* stay — the register and its
-- categories are what remain — and asset.edit is added for the new edit
-- endpoint on the register.
DELETE FROM "permissions"
WHERE "name" LIKE 'asset\_transfer.%'
   OR "name" LIKE 'asset\_disposal.%'
   OR "name" LIKE 'depreciation.%'
   OR "name" LIKE 'vehicle\_loan.%'
   OR "name" LIKE 'vehicle\_tyre.%'
   OR "name" LIKE 'vehicle\_battery.%'
   OR "name" LIKE 'vehicle\_compliance.%'
   OR "name" = 'loan_report.view';

INSERT INTO "permissions" ("id", "name", "description", "createdAt")
SELECT gen_random_uuid(), 'asset.edit', 'Edit a Fixed Asset register entry', NOW()
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "name" = 'asset.edit');
