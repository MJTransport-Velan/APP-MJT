import type { PaginationMeta } from './admin.types';

export type { PaginationMeta };

// Automation Rule Engine + Scheduler
export type AutomationTriggerType = 'SCHEDULE' | 'EVENT';
export type AutomationActionType =
  | 'SEND_NOTIFICATION'
  | 'RUN_REPORT_SCHEDULE'
  | 'RUN_BACKUP'
  | 'ARCHIVE_LOGS'
  | 'OUTSTANDING_REMINDER'
  | 'COMPUTE_KPI_SNAPSHOTS';
export type AutomationRunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  triggerType: AutomationTriggerType;
  cronExpression: string | null;
  eventCode: string | null;
  actionType: AutomationActionType;
  actionConfig: string | null;
  isActive: boolean;
  lastRunAt: string | null;
  lastRunStatus: AutomationRunStatus | null;
  createdAt: string;
}

export interface AutomationRunLog {
  id: string;
  automationRuleId: string;
  triggeredBy: 'SCHEDULE' | 'MANUAL' | 'EVENT';
  status: AutomationRunStatus;
  startedAt: string;
  completedAt: string | null;
  resultSummary: string | null;
  errorMessage: string | null;
}

// Notification Center
export type NotificationCategory = 'APPROVAL' | 'REMINDER' | 'SYSTEM' | 'REPORT' | 'SECURITY' | 'WORKFLOW';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  channel: 'IN_APP' | 'EMAIL';
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// Approval Delegation
export interface ApprovalDelegation {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromDate: string;
  toDate: string;
  reason: string | null;
  isActive: boolean;
  createdAt: string;
}

// Enterprise Audit Center
export interface AuditOverview {
  since: string;
  logins: number;
  failedLogins: number;
  configChanges: number;
  apiRequests: number;
  apiErrors: number;
  deletions: number;
}
export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  createdAt: string;
  user: { username: string; fullName: string } | null;
}
export interface ApiRequestLogRow {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userId: string | null;
  ipAddress: string | null;
  createdAt: string;
}
export interface RecentActivityRow {
  source: 'AuditLog' | 'VoucherAuditEntry';
  timestamp: string;
  actor: string | null;
  action: string;
  entityType: string;
  description: string | null;
}

// Security
export interface MfaStatus {
  mfaEnabled: boolean;
}
export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
}

// Exception Management
export type ExceptionErrorType = 'DUPLICATE' | 'NEGATIVE_BALANCE' | 'MISSING_APPROVAL' | 'VOUCHER_FAILURE' | 'POSTING_FAILURE' | 'VALIDATION_FAILURE' | 'UNEXPECTED';
export type ExceptionStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export interface SystemException {
  id: string;
  module: string;
  errorType: ExceptionErrorType;
  message: string;
  status: ExceptionStatus;
  resolution: string | null;
  createdAt: string;
}

// Business Rule Engine
export type BusinessRuleType = 'CREDIT_LIMIT' | 'PAYMENT' | 'LOAN' | 'PAYROLL' | 'EXPENSE' | 'GST' | 'APPROVAL' | 'DUPLICATE_DETECTION';
export interface BusinessRule {
  id: string;
  ruleType: BusinessRuleType;
  name: string;
  description: string | null;
  conditionJson: string;
  actionJson: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
}
// Import Framework
export type ImportEntityType = 'SUPPLIER' | 'EMPLOYEE' | 'DRIVER' | 'FUEL_ENTRY' | 'FASTTAG_TRANSACTION';
export type ImportBatchStatus = 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
export interface ImportBatch {
  id: string;
  entityType: ImportEntityType;
  fileName: string;
  status: ImportBatchStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: { row: number; error: string }[];
  startedAt: string;
  completedAt: string | null;
}

// Backup & Recovery
export interface BackupRecord {
  id: string;
  type: 'FULL' | 'INCREMENTAL';
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  triggeredBy: 'MANUAL' | 'SCHEDULED';
  fileName: string | null;
  sizeBytes: number | null;
  startedAt: string;
  completedAt: string | null;
  verifiedAt: string | null;
  errorMessage: string | null;
  verificationDetail?: string;
  verificationPassed?: boolean;
}

// Data Archiving
export type ArchiveScope = 'AUDIT_LOG' | 'API_REQUEST_LOG' | 'WEBHOOK_DELIVERY';
export interface ArchiveRun {
  id: string;
  scope: ArchiveScope;
  cutoffDate: string;
  recordsArchived: number;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

// System Configuration
export type SystemSettingCategory = 'GENERAL' | 'ACCOUNTING' | 'NOTIFICATION' | 'WORKFLOW' | 'BACKUP' | 'SECURITY' | 'API' | 'INTEGRATION';
export interface SystemSetting {
  id: string;
  category: SystemSettingCategory;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

// Webhook Foundation
export interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  secret: string;
  eventTypes: string;
  isActive: boolean;
  createdAt: string;
}
export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventType: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  attempts: number;
  lastAttemptAt: string | null;
  responseStatus: number | null;
  createdAt: string;
}

// REST API Governance
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string;
  rateLimitPerMinute: number;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  rawKey?: string;
}

// AI Foundation
export type AiInsightType = 'OUTSTANDING_PREDICTION';
export interface AiInsight {
  id: string;
  type: AiInsightType;
  method: 'STATISTICAL' | 'ML' | 'LLM';
  periodLabel: string | null;
  resultJson: unknown;
  confidence: number | null;
  generatedAt: string;
}

// Business Intelligence Foundation
export interface KpiDefinition {
  id: string;
  code: string;
  name: string;
  category: string;
  formulaDescription: string;
  unit: string | null;
}
export interface KpiCard {
  code: string;
  name: string;
  category: string;
  unit: string | null;
  latestValue: number | null;
  latestPeriodDate: string | null;
  trend: { periodDate: string; value: number }[];
}

// System Dashboard / Health / Readiness
export interface SystemHealth {
  dbConnected: boolean;
  uptimeSeconds: number;
  nodeVersion: string;
  memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
  scheduledJobCount: number;
  checkedAt: string;
}
export interface SystemMetrics {
  queue: { runningJobs: number; failedJobsToday: number };
  openExceptions: number;
  pendingApprovals: number;
  api: { requests24h: number; serverErrors24h: number };
  backup: { lastSuccessfulAt: string | null; storageBytes: number };
}
export interface ReadinessCheck {
  item: string;
  passed: boolean;
  detail: string;
}
export interface ReadinessResult {
  checks: ReadinessCheck[];
  passedCount: number;
  totalCount: number;
}
