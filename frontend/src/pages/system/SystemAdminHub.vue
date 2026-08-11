<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">System Administration</h2>
        <p class="text-caption text-medium-emphasis mb-0">Enterprise integration, automation, audit, security &amp; final optimization</p>
      </div>
      <HubSearch v-model="search" placeholder="Search system pages..." />
    </div>

    <HubStatRow :stats="statRow" />

    <HubCardGrid :items="filteredCards" item-key="title">
      <template #default="{ item }">
        <HubCard v-bind="(item as any)" />
      </template>
    </HubCardGrid>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { HubCard, HubCardGrid, HubSearch, HubStatRow } from '@/components/hub';
import { systemDashboardApi } from '@/services/system/phase8';
import type { SystemMetrics } from '@/types/phase8.types';

const search = ref('');
const metrics = ref<SystemMetrics | null>(null);

onMounted(async () => {
  try {
    metrics.value = (await systemDashboardApi.metrics()).data.data;
  } catch {
    /* dashboard tiles are best-effort */
  }
});

const statRow = computed(() => {
  const m = metrics.value;
  return [
    { label: 'Open Exceptions', value: m ? String(m.openExceptions) : '-', icon: 'mdi-alert-circle-outline', iconColor: '#b91c1c', iconBg: 'rgba(239,68,68,.14)' },
    { label: 'Pending Approvals', value: m ? String(m.pendingApprovals) : '-', icon: 'mdi-clock-alert-outline', iconColor: '#b45309', iconBg: 'rgba(245,158,11,.14)' },
    { label: 'API Requests (24h)', value: m ? String(m.api.requests24h) : '-', icon: 'mdi-swap-horizontal', iconColor: '#1e3a8a', iconBg: 'rgba(30,58,138,.1)' },
    { label: 'Failed Jobs Today', value: m ? String(m.queue.failedJobsToday) : '-', icon: 'mdi-cog-outline', iconColor: '#b91c1c', iconBg: 'rgba(239,68,68,.14)' },
  ];
});

const cards = [
  { icon: 'mdi-heart-pulse', title: 'System Health & Readiness', description: 'Health, metrics, and the production Go-Live readiness checklist', to: '/system/health' },
  { icon: 'mdi-cog-sync-outline', title: 'Automation Rules', description: 'Schedule- or event-triggered rules: notifications, backups, archiving, escalation, KPI snapshots and more', to: '/system/automation-rules' },
  { icon: 'mdi-bell-outline', title: 'Notification Center', description: 'In-app notifications raised by approvals, reminders, reports and automation', to: '/system/notifications' },
  { icon: 'mdi-shield-search', title: 'Enterprise Audit Center', description: 'Login, configuration, API and export audit, plus a unified recent-activity feed', to: '/system/audit-center' },
  { icon: 'mdi-lock-outline', title: 'Security Center', description: 'Multi-factor authentication, IP restrictions, and approval delegation', to: '/system/security' },
  { icon: 'mdi-gavel', title: 'Governance', description: 'Exception management and the configurable Business Rule Engine', to: '/system/governance' },
  { icon: 'mdi-database-sync-outline', title: 'Data Lifecycle', description: 'Backup & recovery, data archiving, and the bulk Import Framework', to: '/system/data-lifecycle' },
  { icon: 'mdi-lan-connect', title: 'Integration Center', description: 'Integration Gateway connectors, Webhook subscriptions, and API Keys', to: '/system/integrations' },
  { icon: 'mdi-brain', title: 'Intelligence Center', description: 'AI Foundation forecasts and the Business Intelligence executive KPI dashboard', to: '/system/intelligence' },
  { icon: 'mdi-tune', title: 'System Configuration', description: 'Global security, backup, workflow, notification and API settings', to: '/system/settings' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
