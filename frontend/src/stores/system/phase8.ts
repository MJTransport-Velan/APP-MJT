import { defineStore } from 'pinia';
import {
  automationRuleApi,
  approvalDelegationApi,
  systemExceptionApi,
  businessRuleApi,
  backupApi,
  archiveApi,
  webhookApi,
  apiKeyApi,
} from '@/services/system/phase8';
import type {
  AutomationRule,
  ApprovalDelegation,
  SystemException,
  BusinessRule,
  BackupRecord,
  ArchiveRun,
  WebhookSubscription,
  ApiKey,
  PaginationMeta,
} from '@/types/phase8.types';

export const useAutomationRuleStore = defineStore('automationRules', {
  state: () => ({ items: [] as AutomationRule[], loading: false }),
  actions: {
    async fetchList() {
      this.loading = true;
      try {
        this.items = (await automationRuleApi.list()).data.data;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      return (await automationRuleApi.create(payload)).data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      return (await automationRuleApi.update(id, payload)).data.data;
    },
    async remove(id: string) {
      await automationRuleApi.remove(id);
    },
    async runNow(id: string) {
      return (await automationRuleApi.runNow(id)).data.data;
    },
  },
});

export const useApprovalDelegationStore = defineStore('approvalDelegations', {
  state: () => ({ items: [] as ApprovalDelegation[], loading: false }),
  actions: {
    async fetchList() {
      this.loading = true;
      try {
        this.items = (await approvalDelegationApi.list()).data.data;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      return (await approvalDelegationApi.create(payload)).data.data;
    },
    async revoke(id: string) {
      await approvalDelegationApi.revoke(id);
    },
  },
});

export const useSystemExceptionStore = defineStore('systemExceptions', {
  state: () => ({ items: [] as SystemException[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await systemExceptionApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async acknowledge(id: string) {
      return (await systemExceptionApi.acknowledge(id)).data.data;
    },
    async resolve(id: string, resolution: string) {
      return (await systemExceptionApi.resolve(id, resolution)).data.data;
    },
  },
});

export const useBusinessRuleStore = defineStore('businessRules', {
  state: () => ({ items: [] as BusinessRule[], loading: false }),
  actions: {
    async fetchList(ruleType?: string) {
      this.loading = true;
      try {
        this.items = (await businessRuleApi.list(ruleType)).data.data;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      return (await businessRuleApi.create(payload)).data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      return (await businessRuleApi.update(id, payload)).data.data;
    },
    async remove(id: string) {
      await businessRuleApi.remove(id);
    },
  },
});

export const useBackupStore = defineStore('backups', {
  state: () => ({ items: [] as BackupRecord[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await backupApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async runManual() {
      return (await backupApi.runManual()).data.data;
    },
    async verify(id: string) {
      return (await backupApi.verify(id)).data.data;
    },
  },
});

export const useArchiveRunStore = defineStore('archiveRuns', {
  state: () => ({ items: [] as ArchiveRun[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await archiveApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async run(scope: string, cutoffDays: number) {
      return (await archiveApi.run(scope, cutoffDays)).data.data;
    },
  },
});

export const useWebhookSubscriptionStore = defineStore('webhookSubscriptions', {
  state: () => ({ items: [] as WebhookSubscription[], loading: false }),
  actions: {
    async fetchList() {
      this.loading = true;
      try {
        this.items = (await webhookApi.listSubscriptions()).data.data;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      return (await webhookApi.createSubscription(payload)).data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      return (await webhookApi.updateSubscription(id, payload)).data.data;
    },
    async remove(id: string) {
      await webhookApi.removeSubscription(id);
    },
    async test(id: string) {
      return (await webhookApi.test(id)).data.data;
    },
  },
});

export const useApiKeyStore = defineStore('apiKeys', {
  state: () => ({ items: [] as ApiKey[], loading: false }),
  actions: {
    async fetchList() {
      this.loading = true;
      try {
        this.items = (await apiKeyApi.list()).data.data;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      return (await apiKeyApi.create(payload)).data.data;
    },
    async revoke(id: string) {
      return (await apiKeyApi.revoke(id)).data.data;
    },
  },
});
