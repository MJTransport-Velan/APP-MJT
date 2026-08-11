-- CreateTable
CREATE TABLE "approval_instances" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "approvalRuleId" TEXT,
    "levelNo" INTEGER NOT NULL,
    "approverRoleId" TEXT NOT NULL,
    "actualApproverId" TEXT,
    "decision" "VoucherApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_instances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_instances_entityType_entityId_idx" ON "approval_instances"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_instances_entityType_entityId_levelNo_key" ON "approval_instances"("entityType", "entityId", "levelNo");

-- AddForeignKey
ALTER TABLE "approval_instances" ADD CONSTRAINT "approval_instances_approvalRuleId_fkey" FOREIGN KEY ("approvalRuleId") REFERENCES "approval_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data migration: carry every existing VoucherApproval row across
-- unchanged (id, level, decision, remarks, timestamps all preserved).
INSERT INTO "approval_instances" ("id", "entityType", "entityId", "approvalRuleId", "levelNo", "approverRoleId", "actualApproverId", "decision", "remarks", "decidedAt", "createdAt")
SELECT "id", 'VOUCHER', "voucherId", "approvalRuleId", "levelNo", "approverRoleId", "actualApproverId", "decision", "remarks", "decidedAt", "createdAt"
FROM "voucher_approvals";

-- Data migration: carry every existing PettyCashRequestApproval row across unchanged.
INSERT INTO "approval_instances" ("id", "entityType", "entityId", "approvalRuleId", "levelNo", "approverRoleId", "actualApproverId", "decision", "remarks", "decidedAt", "createdAt")
SELECT "id", 'PETTY_CASH_REQUEST', "pettyCashRequestId", "approvalRuleId", "levelNo", "approverRoleId", "actualApproverId", "decision", "remarks", "decidedAt", "createdAt"
FROM "petty_cash_request_approvals";

-- DropForeignKey
ALTER TABLE "petty_cash_request_approvals" DROP CONSTRAINT "petty_cash_request_approvals_approvalRuleId_fkey";

-- DropForeignKey
ALTER TABLE "petty_cash_request_approvals" DROP CONSTRAINT "petty_cash_request_approvals_pettyCashRequestId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_approvals" DROP CONSTRAINT "voucher_approvals_approvalRuleId_fkey";

-- DropForeignKey
ALTER TABLE "voucher_approvals" DROP CONSTRAINT "voucher_approvals_voucherId_fkey";

-- DropTable
DROP TABLE "petty_cash_request_approvals";

-- DropTable
DROP TABLE "voucher_approvals";
