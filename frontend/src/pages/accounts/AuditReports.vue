<template>
  <div>
    <h2 class="text-h6 mb-4">Audit Reports — User Activity</h2>

    <AppCard class="pa-4 mb-4">
      <div class="row row-dense align-end">
        <div class="col-6 col-sm-3"><AppTextField v-model="from" type="date" label="From" density="compact" hide-details /></div>
        <div class="col-6 col-sm-3"><AppTextField v-model="to" type="date" label="To" density="compact" hide-details /></div>
        <div class="col-6 col-sm-2"><AppBtn color="primary" variant="flat" block @click="fetchActive">Apply</AppBtn></div>
      </div>
    </AppCard>

    <AppCard>
      <div class="tblwrap">
        <AppTable density="compact">
          <thead><tr><th>User</th><th>Action</th><th>Entity Type</th><th>Entity ID</th><th>Description</th><th>At</th></tr></thead>
          <tbody>
            <tr v-for="r in userActivity" :key="r.id">
              <td>{{ r.user }}</td>
              <td><AppChip size="x-small" variant="outlined">{{ r.action }}</AppChip></td>
              <td>{{ r.entityType }}</td>
              <td>{{ r.entityId || '-' }}</td>
              <td>{{ r.description || '-' }}</td>
              <td>{{ new Date(r.createdAt).toLocaleString() }}</td>
            </tr>
            <tr v-if="userActivity.length === 0">
              <td colspan="6" class="text-center text-medium-emphasis">No activity found.</td>
            </tr>
          </tbody>
        </AppTable>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { auditReportApi } from '@/services/accounts/financialReporting';
import { AppCard, AppTable, AppTextField, AppBtn, AppChip } from '@/components/ui';
import type { UserActivityRow } from '@/types/phase7.types';

const now = new Date();
const from = ref(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
const to = ref(now.toISOString().slice(0, 10));

const userActivity = ref<UserActivityRow[]>([]);

async function fetchActive() {
  const params = { from: from.value, to: to.value, pageSize: 100 };
  userActivity.value = (await auditReportApi.userActivity(params)).data.data;
}

onMounted(fetchActive);
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
