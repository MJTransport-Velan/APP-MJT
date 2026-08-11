<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">System Health &amp; Readiness</h2>
      <AppBtn variant="outlined" prepend-icon="mdi-refresh" @click="loadAll">Refresh</AppBtn>
    </div>

    <div class="row row-dense mb-4">
      <div class="col-12 col-md-6">
        <AppCard class="pa-4 h-100">
          <div class="text-subtitle-2 mb-3">System Health</div>
          <div v-if="health" class="d-flex flex-column ga-2">
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Database</span><AppChip size="small" :color="health.dbConnected ? 'success' : 'error'">{{ health.dbConnected ? 'Connected' : 'Disconnected' }}</AppChip></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Uptime</span><span>{{ formatUptime(health.uptimeSeconds) }}</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Node Version</span><span>{{ health.nodeVersion }}</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Memory (RSS)</span><span>{{ health.memory.rssMb }} MB</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Heap Used / Total</span><span>{{ health.memory.heapUsedMb }} / {{ health.memory.heapTotalMb }} MB</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Scheduled Jobs Registered</span><span>{{ health.scheduledJobCount }}</span></div>
          </div>
        </AppCard>
      </div>
      <div class="col-12 col-md-6">
        <AppCard class="pa-4 h-100">
          <div class="text-subtitle-2 mb-3">Operational Metrics</div>
          <div v-if="metrics" class="d-flex flex-column ga-2">
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Running Jobs</span><span>{{ metrics.queue.runningJobs }}</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Failed Jobs (Today)</span><span :class="metrics.queue.failedJobsToday > 0 ? 'text-error' : ''">{{ metrics.queue.failedJobsToday }}</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Open Exceptions</span><span :class="metrics.openExceptions > 0 ? 'text-error' : ''">{{ metrics.openExceptions }}</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Pending Approvals</span><span>{{ metrics.pendingApprovals }}</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">API Requests (24h)</span><span>{{ metrics.api.requests24h }}</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Server Errors (24h)</span><span :class="metrics.api.serverErrors24h > 0 ? 'text-error' : ''">{{ metrics.api.serverErrors24h }}</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Last Successful Backup</span><span>{{ metrics.backup.lastSuccessfulAt ? new Date(metrics.backup.lastSuccessfulAt).toLocaleString() : 'Never' }}</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Backup Storage Used</span><span>{{ formatBytes(metrics.backup.storageBytes) }}</span></div>
          </div>
        </AppCard>
      </div>
    </div>

    <AppCard class="pa-4">
      <div class="d-flex justify-space-between align-center mb-3">
        <div class="text-subtitle-2">Production Readiness Checklist</div>
        <AppChip v-if="readiness" :color="readiness.passedCount === readiness.totalCount ? 'success' : 'warning'">{{ readiness.passedCount }} / {{ readiness.totalCount }} passed</AppChip>
      </div>
      <div class="d-flex flex-column ga-2">
        <div v-for="check in readiness?.checks || []" :key="check.item" class="d-flex align-center ga-2">
          <AppIcon :icon="check.passed ? 'mdi-check-circle' : 'mdi-alert-circle-outline'" :color="check.passed ? 'success' : 'warning'" />
          <div class="flex-grow-1">
            <div>{{ check.item }}</div>
            <div class="text-caption text-medium-emphasis">{{ check.detail }}</div>
          </div>
        </div>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { systemDashboardApi } from '@/services/system/phase8';
import { AppCard, AppBtn, AppChip, AppIcon } from '@/components/ui';
import type { SystemHealth, SystemMetrics, ReadinessResult } from '@/types/phase8.types';

const health = ref<SystemHealth | null>(null);
const metrics = ref<SystemMetrics | null>(null);
const readiness = ref<ReadinessResult | null>(null);

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function loadAll() {
  const [h, m, r] = await Promise.all([systemDashboardApi.health(), systemDashboardApi.metrics(), systemDashboardApi.readiness()]);
  health.value = h.data.data;
  metrics.value = m.data.data;
  readiness.value = r.data.data;
}

onMounted(loadAll);
</script>
