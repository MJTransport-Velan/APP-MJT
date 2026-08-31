import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type {
  AutomationRule,
  AutomationRunLog,
  AppNotification,
  DueReminderList,
  DueReminderScanResult,
  ApprovalDelegation,
  AuditOverview,
  AuditLogRow,
  ApiRequestLogRow,
  RecentActivityRow,
  MfaStatus,
  MfaSetupResult,
  SystemException,
  BusinessRule,
  ImportBatch,
  BackupRecord,
  ArchiveRun,
  SystemSetting,
  WebhookSubscription,
  WebhookDelivery,
  ApiKey,
  AiInsight,
  KpiDefinition,
  KpiCard,
  SystemHealth,
  SystemMetrics,
  ReadinessResult,
  PaginationMeta,
} from '@/types/phase8.types';

export const automationRuleApi = {
  list() {
    return api.get<ApiResponse<AutomationRule[]>>('/system/automation-rules');
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<AutomationRule>>('/system/automation-rules', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<AutomationRule>>(`/system/automation-rules/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/system/automation-rules/${id}`);
  },
  runNow(id: string) {
    return api.post<ApiResponse<AutomationRule>>(`/system/automation-rules/${id}/run`);
  },
  runLogs(id: string, params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<AutomationRunLog[]> & { meta: PaginationMeta }>(`/system/automation-rules/${id}/run-logs`, { params });
  },
  fireEvent(eventCode: string) {
    return api.post<ApiResponse<{ matched: number }>>('/system/automation-rules/fire-event', { eventCode });
  },
};

export const notificationApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<AppNotification[]> & { meta: PaginationMeta }>('/notifications', { params });
  },
  unreadCount() {
    return api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
  },
  markRead(id: string) {
    return api.patch<ApiResponse<AppNotification>>(`/notifications/${id}/read`);
  },
  markAllRead() {
    return api.patch<ApiResponse<{ updated: number }>>('/notifications/mark-all-read');
  },
  /** What falls due in the next `leadDays` days — computed live, nothing stored. */
  dueReminders(params: { leadDays?: number } = {}) {
    return api.get<ApiResponse<DueReminderList>>('/notifications/due-reminders', { params });
  },
  runDueScan(params: { leadDays?: number } = {}) {
    // Body must be {} rather than null: express.json() is strict, so a bare
    // `null` payload is rejected as malformed JSON before the route is reached.
    return api.post<ApiResponse<DueReminderScanResult>>('/notifications/due-reminders/scan', {}, { params });
  },
};

export const approvalDelegationApi = {
  list() {
    return api.get<ApiResponse<ApprovalDelegation[]>>('/system/approval-delegations');
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<ApprovalDelegation>>('/system/approval-delegations', payload);
  },
  revoke(id: string) {
    return api.patch<ApiResponse<ApprovalDelegation>>(`/system/approval-delegations/${id}/revoke`);
  },
};

export const enterpriseAuditApi = {
  overview() {
    return api.get<ApiResponse<AuditOverview>>('/system/audit-center/overview');
  },
  recentActivity(limit = 50) {
    return api.get<ApiResponse<RecentActivityRow[]>>('/system/audit-center/recent-activity', { params: { limit } });
  },
  login(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<AuditLogRow[]> & { meta: PaginationMeta }>('/system/audit-center/login', { params });
  },
  configuration(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<AuditLogRow[]> & { meta: PaginationMeta }>('/system/audit-center/configuration', { params });
  },
  exports(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<AuditLogRow[]> & { meta: PaginationMeta }>('/system/audit-center/exports', { params });
  },
  apiAudit(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<ApiRequestLogRow[]> & { meta: PaginationMeta }>('/system/audit-center/api', { params });
  },
};

export const mfaApi = {
  status() {
    return api.get<ApiResponse<MfaStatus>>('/system/mfa/status');
  },
  beginSetup() {
    return api.post<ApiResponse<MfaSetupResult>>('/system/mfa/setup');
  },
  verifyAndEnable(token: string) {
    return api.post<ApiResponse<{ backupCodes: string[] }>>('/system/mfa/verify', { token });
  },
  disable() {
    return api.post<ApiResponse<null>>('/system/mfa/disable');
  },
};

export const systemExceptionApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<SystemException[]> & { meta: PaginationMeta }>('/system/exceptions', { params });
  },
  acknowledge(id: string) {
    return api.patch<ApiResponse<SystemException>>(`/system/exceptions/${id}/acknowledge`);
  },
  resolve(id: string, resolution: string) {
    return api.patch<ApiResponse<SystemException>>(`/system/exceptions/${id}/resolve`, { resolution });
  },
};

export const businessRuleApi = {
  list(ruleType?: string) {
    return api.get<ApiResponse<BusinessRule[]>>('/system/business-rules', { params: { ruleType } });
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<BusinessRule>>('/system/business-rules', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<BusinessRule>>(`/system/business-rules/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/system/business-rules/${id}`);
  },
};

export const importApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<ImportBatch[]> & { meta: PaginationMeta }>('/system/imports', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<ImportBatch>>(`/system/imports/${id}`);
  },
  run(entityType: string, file: File) {
    const formData = new FormData();
    formData.append('entityType', entityType);
    formData.append('file', file);
    return api.post<ApiResponse<ImportBatch>>('/system/imports/run', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  downloadSample(entityType: string) {
    return api.get('/system/imports/sample', { params: { entityType }, responseType: 'blob' });
  },
};

export const backupApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<BackupRecord[]> & { meta: PaginationMeta }>('/system/backups', { params });
  },
  runManual() {
    return api.post<ApiResponse<BackupRecord>>('/system/backups/run');
  },
  verify(id: string) {
    return api.post<ApiResponse<BackupRecord>>(`/system/backups/${id}/verify`);
  },
  latestStatus() {
    return api.get<ApiResponse<BackupRecord | null>>('/system/backups/latest-status');
  },
};

export const archiveApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<ArchiveRun[]> & { meta: PaginationMeta }>('/system/archive', { params });
  },
  run(scope: string, cutoffDays: number) {
    return api.post<ApiResponse<ArchiveRun>>('/system/archive/run', { scope, cutoffDays });
  },
};

export const systemSettingApi = {
  list(category?: string) {
    return api.get<ApiResponse<SystemSetting[]>>('/system/settings', { params: { category } });
  },
  set(payload: { category: string; key: string; value: string; description?: string }) {
    return api.put<ApiResponse<SystemSetting>>('/system/settings', payload);
  },
};


export const webhookApi = {
  listSubscriptions() {
    return api.get<ApiResponse<WebhookSubscription[]>>('/system/webhooks/subscriptions');
  },
  createSubscription(payload: Record<string, unknown>) {
    return api.post<ApiResponse<WebhookSubscription>>('/system/webhooks/subscriptions', payload);
  },
  updateSubscription(id: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<WebhookSubscription>>(`/system/webhooks/subscriptions/${id}`, payload);
  },
  removeSubscription(id: string) {
    return api.delete<ApiResponse<null>>(`/system/webhooks/subscriptions/${id}`);
  },
  test(id: string) {
    return api.post<ApiResponse<{ deliveryId: string }>>(`/system/webhooks/subscriptions/${id}/test`);
  },
  deliveries(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<WebhookDelivery[]> & { meta: PaginationMeta }>('/system/webhooks/deliveries', { params });
  },
};

export const apiKeyApi = {
  list() {
    return api.get<ApiResponse<ApiKey[]>>('/system/api-keys');
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<ApiKey>>('/system/api-keys', payload);
  },
  revoke(id: string) {
    return api.patch<ApiResponse<ApiKey>>(`/system/api-keys/${id}/revoke`);
  },
};

export const aiInsightApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<AiInsight[]> & { meta: PaginationMeta }>('/system/ai-insights', { params });
  },
  generate(type: string, periodsAhead?: number) {
    return api.post<ApiResponse<AiInsight>>('/system/ai-insights/generate', { type, periodsAhead });
  },
};

export const kpiApi = {
  definitions() {
    return api.get<ApiResponse<KpiDefinition[]>>('/system/kpi/definitions');
  },
  executiveDashboard() {
    return api.get<ApiResponse<{ cards: KpiCard[] }>>('/system/kpi/executive-dashboard');
  },
  computeSnapshots() {
    return api.post<ApiResponse<{ computed: number }>>('/system/kpi/compute-snapshots');
  },
};

export const systemDashboardApi = {
  health() {
    return api.get<ApiResponse<SystemHealth>>('/system/health');
  },
  metrics() {
    return api.get<ApiResponse<SystemMetrics>>('/system/metrics');
  },
  readiness() {
    return api.get<ApiResponse<ReadinessResult>>('/system/readiness');
  },
};
