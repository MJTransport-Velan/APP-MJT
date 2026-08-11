<template>
  <div>
    <h2 class="text-h6 mb-4">Enterprise Audit Center</h2>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="overview">Overview</AppTab>
      <AppTab value="recent">Recent Activity</AppTab>
      <AppTab value="login">Login Audit</AppTab>
      <AppTab value="config">Configuration Audit</AppTab>
      <AppTab value="api">API Audit</AppTab>
      <AppTab value="export">Export Audit</AppTab>
    </AppTabs>

    <AppCard v-if="activeTab !== 'overview' && activeTab !== 'recent'" class="pa-4 mb-4">
      <div class="row row-dense align-end">
        <div class="col-6 col-sm-3"><AppTextField v-model="from" type="date" label="From" density="compact" hide-details /></div>
        <div class="col-6 col-sm-3"><AppTextField v-model="to" type="date" label="To" density="compact" hide-details /></div>
        <div class="col-6 col-sm-2"><AppBtn color="primary" variant="flat" block @click="fetchActive">Apply</AppBtn></div>
      </div>
    </AppCard>

    <AppWindow v-model="activeTab">
      <AppWindowItem value="overview">
        <div class="row row-dense">
          <div v-for="stat in overviewStats" :key="stat.label" class="col-6 col-sm-4 col-md-2">
            <AppCard class="pa-4 text-center">
              <div class="text-h5">{{ stat.value }}</div>
              <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
            </AppCard>
          </div>
        </div>
      </AppWindowItem>

      <AppWindowItem value="recent">
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Source</th><th>Actor</th><th>Action</th><th>Entity</th><th>Description</th><th>At</th></tr></thead>
              <tbody>
                <tr v-for="(r, i) in recentActivity" :key="i">
                  <td><AppChip size="x-small" variant="outlined">{{ r.source }}</AppChip></td>
                  <td>{{ r.actor || '-' }}</td><td>{{ r.action }}</td><td>{{ r.entityType }}</td>
                  <td>{{ r.description || '-' }}</td><td>{{ new Date(r.timestamp).toLocaleString() }}</td>
                </tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="login">
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>User</th><th>Action</th><th>Description</th><th>At</th></tr></thead>
              <tbody>
                <tr v-for="r in loginAudit" :key="r.id">
                  <td>{{ r.user?.fullName || r.user?.username || '-' }}</td>
                  <td><AppChip size="x-small" :color="r.action === 'LOGIN_FAILED' ? 'error' : 'success'">{{ r.action }}</AppChip></td>
                  <td>{{ r.description || '-' }}</td><td>{{ new Date(r.createdAt).toLocaleString() }}</td>
                </tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="config">
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>User</th><th>Entity</th><th>Description</th><th>At</th></tr></thead>
              <tbody>
                <tr v-for="r in configAudit" :key="r.id">
                  <td>{{ r.user?.fullName || r.user?.username || '-' }}</td><td>{{ r.entityType }}</td>
                  <td>{{ r.description || '-' }}</td><td>{{ new Date(r.createdAt).toLocaleString() }}</td>
                </tr>
                <tr v-if="!configAudit.length"><td colspan="4" class="text-center text-medium-emphasis py-4">No configuration changes in range</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="api">
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Method</th><th>Path</th><th>Status</th><th>Duration</th><th>At</th></tr></thead>
              <tbody>
                <tr v-for="r in apiAudit" :key="r.id">
                  <td>{{ r.method }}</td><td>{{ r.path }}</td>
                  <td><AppChip size="x-small" :color="r.statusCode >= 500 ? 'error' : r.statusCode >= 400 ? 'warning' : 'success'">{{ r.statusCode }}</AppChip></td>
                  <td>{{ r.durationMs }}ms</td><td>{{ new Date(r.createdAt).toLocaleString() }}</td>
                </tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="export">
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>User</th><th>Entity</th><th>Description</th><th>At</th></tr></thead>
              <tbody>
                <tr v-for="r in exportAudit" :key="r.id">
                  <td>{{ r.user?.fullName || r.user?.username || '-' }}</td><td>{{ r.entityType }}</td>
                  <td>{{ r.description || '-' }}</td><td>{{ new Date(r.createdAt).toLocaleString() }}</td>
                </tr>
                <tr v-if="!exportAudit.length"><td colspan="4" class="text-center text-medium-emphasis py-4">No export activity logged yet</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>
    </AppWindow>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { enterpriseAuditApi } from '@/services/system/phase8';
import { AppTabs, AppTab, AppWindow, AppWindowItem, AppCard, AppTable, AppTextField, AppBtn, AppChip } from '@/components/ui';
import type { AuditOverview, AuditLogRow, ApiRequestLogRow, RecentActivityRow } from '@/types/phase8.types';

const activeTab = ref('overview');
const now = new Date();
const from = ref(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
const to = ref(now.toISOString().slice(0, 10));

const overview = ref<AuditOverview | null>(null);
const recentActivity = ref<RecentActivityRow[]>([]);
const loginAudit = ref<AuditLogRow[]>([]);
const configAudit = ref<AuditLogRow[]>([]);
const apiAudit = ref<ApiRequestLogRow[]>([]);
const exportAudit = ref<AuditLogRow[]>([]);

const overviewStats = computed(() => {
  const o = overview.value;
  return [
    { label: 'Logins (24h)', value: o?.logins ?? '-' },
    { label: 'Failed Logins (24h)', value: o?.failedLogins ?? '-' },
    { label: 'Config Changes (24h)', value: o?.configChanges ?? '-' },
    { label: 'API Requests (24h)', value: o?.apiRequests ?? '-' },
    { label: 'API Errors (24h)', value: o?.apiErrors ?? '-' },
    { label: 'Deletions (24h)', value: o?.deletions ?? '-' },
  ];
});

async function fetchActive() {
  const params = { from: from.value, to: to.value, pageSize: 100 };
  if (activeTab.value === 'overview') overview.value = (await enterpriseAuditApi.overview()).data.data;
  else if (activeTab.value === 'recent') recentActivity.value = (await enterpriseAuditApi.recentActivity(50)).data.data;
  else if (activeTab.value === 'login') loginAudit.value = (await enterpriseAuditApi.login(params)).data.data;
  else if (activeTab.value === 'config') configAudit.value = (await enterpriseAuditApi.configuration(params)).data.data;
  else if (activeTab.value === 'api') apiAudit.value = (await enterpriseAuditApi.apiAudit(params)).data.data;
  else if (activeTab.value === 'export') exportAudit.value = (await enterpriseAuditApi.exports(params)).data.data;
}

watch(activeTab, fetchActive);
onMounted(fetchActive);
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
