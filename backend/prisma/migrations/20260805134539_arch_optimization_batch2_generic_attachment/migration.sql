-- CreateEnum
CREATE TYPE "AttachmentStatus" AS ENUM ('UPLOADED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileName" TEXT,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSizeBytes" INTEGER,
    "remarks" TEXT,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'UPLOADED',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attachments_entityType_entityId_idx" ON "attachments"("entityType", "entityId");

-- Data migration: carry every existing VoucherAttachment row across unchanged.
INSERT INTO "attachments" ("id", "entityType", "entityId", "category", "fileName", "filePath", "fileType", "fileSizeBytes", "status", "uploadedById", "uploadedAt", "deletedAt")
SELECT "id", 'VOUCHER', "voucherId", "category"::text, "fileName", "filePath", "fileType", "fileSizeBytes", 'UPLOADED', "uploadedById", "uploadedAt", "deletedAt"
FROM "voucher_attachments";

-- Data migration: carry every existing TripDocument row across, translating
-- its PENDING/VERIFIED/REJECTED status into the generic
-- PENDING_VERIFICATION/VERIFIED/REJECTED vocabulary (trip-document.service.ts
-- translates it back to PENDING on the way out, so the API contract is
-- unchanged for the frontend).
INSERT INTO "attachments" ("id", "entityType", "entityId", "category", "filePath", "remarks", "status", "verifiedById", "verifiedAt", "uploadedById", "uploadedAt")
SELECT "id", 'TRIP', "tripId", "type"::text, "fileUrl", "remarks",
       CASE "status"::text WHEN 'PENDING' THEN 'PENDING_VERIFICATION' ELSE "status"::text END::"AttachmentStatus",
       "verifiedById", "verifiedAt", "createdById", "createdAt"
FROM "trip_documents";

-- DropForeignKey
ALTER TABLE "trip_documents" DROP CONSTRAINT "trip_documents_tripId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_attachments" DROP CONSTRAINT "voucher_attachments_voucherId_fkey";

-- DropTable
DROP TABLE "trip_documents";

-- DropTable
DROP TABLE "voucher_attachments";

-- DropEnum
DROP TYPE "TripDocumentStatus";
