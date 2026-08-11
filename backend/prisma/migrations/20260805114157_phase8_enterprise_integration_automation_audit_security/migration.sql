-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('SCHEDULE', 'EVENT');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('SEND_NOTIFICATION', 'RUN_REPORT_SCHEDULE', 'RUN_BACKUP', 'ARCHIVE_LOGS', 'OUTSTANDING_REMINDER', 'ESCALATE_APPROVALS', 'COMPUTE_KPI_SNAPSHOTS', 'DUPLICATE_VOUCHER_SCAN');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "AutomationRunTrigger" AS ENUM ('SCHEDULE', 'MANUAL', 'EVENT');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('APPROVAL', 'REMINDER', 'SYSTEM', 'REPORT', 'SECURITY', 'WORKFLOW');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "ApprovalMode" AS ENUM ('SEQUENTIAL', 'PARALLEL');

-- CreateEnum
CREATE TYPE "ExceptionErrorType" AS ENUM ('DUPLICATE', 'NEGATIVE_BALANCE', 'MISSING_APPROVAL', 'VOUCHER_FAILURE', 'POSTING_FAILURE', 'VALIDATION_FAILURE', 'UNEXPECTED');

-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "BusinessRuleType" AS ENUM ('CREDIT_LIMIT', 'PAYMENT', 'LOAN', 'PAYROLL', 'EXPENSE', 'GST', 'APPROVAL', 'DUPLICATE_DETECTION');

-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('LEDGER', 'SUPPLIER', 'EMPLOYEE', 'DRIVER', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('FULL', 'INCREMENTAL');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "BackupTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "ArchiveScope" AS ENUM ('AUDIT_LOG', 'ACTIVITY_LOG', 'VOUCHER_AUDIT_ENTRY', 'API_REQUEST_LOG', 'WEBHOOK_DELIVERY', 'VOUCHER');

-- CreateEnum
CREATE TYPE "ArchiveRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "SystemSettingCategory" AS ENUM ('GENERAL', 'ACCOUNTING', 'NOTIFICATION', 'WORKFLOW', 'BACKUP', 'SECURITY', 'API');

-- CreateEnum
CREATE TYPE "IntegrationConnectorType" AS ENUM ('PAYMENT_GATEWAY', 'BANK_API', 'GPS_TRACKING', 'FASTTAG', 'EWAY_BILL', 'E_INVOICE', 'GOVT_PORTAL', 'EMAIL_SERVICE', 'SMS_SERVICE', 'WHATSAPP', 'DOCUMENT_STORAGE');

-- CreateEnum
CREATE TYPE "IntegrationConnectorStatus" AS ENUM ('NOT_CONFIGURED', 'CONFIGURED', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "AiInsightType" AS ENUM ('CASH_FLOW_PREDICTION', 'EXPENSE_FORECAST', 'OUTSTANDING_PREDICTION', 'DUPLICATE_VOUCHER_FLAG');

-- CreateEnum
CREATE TYPE "AiInsightMethod" AS ENUM ('STATISTICAL', 'ML', 'LLM');

-- AlterTable
ALTER TABLE "approval_rules" ADD COLUMN     "approvalMode" "ApprovalMode" NOT NULL DEFAULT 'SEQUENTIAL',
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "escalateAfterHours" INTEGER,
ADD COLUMN     "escalateToRoleId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mfaBackupCodesJson" TEXT,
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" "AutomationTriggerType" NOT NULL,
    "cronExpression" TEXT,
    "eventCode" TEXT,
    "actionType" "AutomationActionType" NOT NULL,
    "actionConfig" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" "AutomationRunStatus",
    "nextRunAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_run_logs" (
    "id" TEXT NOT NULL,
    "automationRuleId" TEXT NOT NULL,
    "triggeredBy" "AutomationRunTrigger" NOT NULL,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "resultSummary" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "automation_run_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "roleId" TEXT,
    "category" "NotificationCategory" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "deliveryStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_delegations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_escalation_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "levelNo" INTEGER,
    "fromRoleId" TEXT NOT NULL,
    "toRoleId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_escalation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_request_logs" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "userId" TEXT,
    "apiKeyId" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allowed_ip_ranges" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cidr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allowed_ip_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_exceptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "module" TEXT NOT NULL,
    "errorType" "ExceptionErrorType" NOT NULL,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "contextJson" TEXT,
    "status" "ExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "acknowledgedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ruleType" "BusinessRuleType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditionJson" TEXT NOT NULL,
    "actionJson" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "business_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PROCESSING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "errorReportJson" TEXT,
    "importedById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_records" (
    "id" TEXT NOT NULL,
    "type" "BackupType" NOT NULL DEFAULT 'FULL',
    "status" "BackupStatus" NOT NULL DEFAULT 'RUNNING',
    "triggeredBy" "BackupTrigger" NOT NULL DEFAULT 'MANUAL',
    "fileName" TEXT,
    "filePath" TEXT,
    "sizeBytes" BIGINT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "triggeredById" TEXT,

    CONSTRAINT "backup_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archive_runs" (
    "id" TEXT NOT NULL,
    "scope" "ArchiveScope" NOT NULL,
    "cutoffDate" TIMESTAMP(3) NOT NULL,
    "recordsArchived" INTEGER NOT NULL DEFAULT 0,
    "status" "ArchiveRunStatus" NOT NULL DEFAULT 'RUNNING',
    "errorMessage" TEXT,
    "triggeredById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "archive_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" "SystemSettingCategory" NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_connectors" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "IntegrationConnectorType" NOT NULL,
    "name" TEXT NOT NULL,
    "configJson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "status" "IntegrationConnectorStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "eventTypes" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "AiInsightType" NOT NULL,
    "method" "AiInsightMethod" NOT NULL DEFAULT 'STATISTICAL',
    "periodLabel" TEXT,
    "resultJson" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "formulaDescription" TEXT NOT NULL,
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_snapshots" (
    "id" TEXT NOT NULL,
    "kpiDefinitionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    "dimensionJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_rules_organizationId_isActive_idx" ON "automation_rules"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "automation_run_logs_automationRuleId_startedAt_idx" ON "automation_run_logs"("automationRuleId", "startedAt");

-- CreateIndex
CREATE INDEX "notifications_organizationId_userId_isRead_idx" ON "notifications"("organizationId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_organizationId_roleId_isRead_idx" ON "notifications"("organizationId", "roleId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notification_templates"("code");

-- CreateIndex
CREATE INDEX "approval_delegations_organizationId_fromUserId_isActive_idx" ON "approval_delegations"("organizationId", "fromUserId", "isActive");

-- CreateIndex
CREATE INDEX "approval_escalation_logs_entityType_entityId_idx" ON "approval_escalation_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "api_request_logs_createdAt_idx" ON "api_request_logs"("createdAt");

-- CreateIndex
CREATE INDEX "api_request_logs_userId_idx" ON "api_request_logs"("userId");

-- CreateIndex
CREATE INDEX "allowed_ip_ranges_organizationId_idx" ON "allowed_ip_ranges"("organizationId");

-- CreateIndex
CREATE INDEX "system_exceptions_status_createdAt_idx" ON "system_exceptions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "system_exceptions_module_idx" ON "system_exceptions"("module");

-- CreateIndex
CREATE INDEX "business_rules_organizationId_ruleType_isActive_idx" ON "business_rules"("organizationId", "ruleType", "isActive");

-- CreateIndex
CREATE INDEX "import_batches_organizationId_entityType_idx" ON "import_batches"("organizationId", "entityType");

-- CreateIndex
CREATE INDEX "backup_records_status_startedAt_idx" ON "backup_records"("status", "startedAt");

-- CreateIndex
CREATE INDEX "archive_runs_scope_startedAt_idx" ON "archive_runs"("scope", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_organizationId_category_key_key" ON "system_settings"("organizationId", "category", "key");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connectors_organizationId_type_name_key" ON "integration_connectors"("organizationId", "type", "name");

-- CreateIndex
CREATE INDEX "api_keys_organizationId_isActive_idx" ON "api_keys"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_organizationId_isActive_idx" ON "webhook_subscriptions"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "webhook_deliveries_subscriptionId_status_idx" ON "webhook_deliveries"("subscriptionId", "status");

-- CreateIndex
CREATE INDEX "ai_insights_organizationId_type_generatedAt_idx" ON "ai_insights"("organizationId", "type", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_definitions_code_key" ON "kpi_definitions"("code");

-- CreateIndex
CREATE INDEX "kpi_snapshots_organizationId_kpiDefinitionId_periodDate_idx" ON "kpi_snapshots"("organizationId", "kpiDefinitionId", "periodDate");

-- CreateIndex
CREATE INDEX "vouchers_status_voucherDate_idx" ON "vouchers"("status", "voucherDate");

-- AddForeignKey
ALTER TABLE "automation_run_logs" ADD CONSTRAINT "automation_run_logs_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_snapshots" ADD CONSTRAINT "kpi_snapshots_kpiDefinitionId_fkey" FOREIGN KEY ("kpiDefinitionId") REFERENCES "kpi_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

