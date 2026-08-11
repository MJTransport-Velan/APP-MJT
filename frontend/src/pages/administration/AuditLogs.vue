<template>
  <div>
    <h2 class="text-h6 mb-4">Audit Logs</h2>

    <AppCard>
      <AppCardText>
        <div class="row row-dense">
          <div class="col-12 col-sm-4">
            <AppTextField
              v-model="search"
              label="Search description / entity"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
              @update:model-value="debouncedFetch"
            />
          </div>
          <div class="col-6 col-sm-3">
            <AppSelect
              v-model="actionFilter"
              :items="actionOptions"
              label="Action"
              clearable
              hide-details
              @update:model-value="fetchLogs"
            />
          </div>
          <div class="col-6 col-sm-3">
            <AppTextField v-model="entityTypeFilter" label="Entity Type" clearable hide-details @update:model-value="debouncedFetch" />
          </div>
          <div class="col-12 col-sm-2">
            <AppBtn variant="tonal" block @click="clearFilters">Clear</AppBtn>
          </div>
        </div>
      </AppCardText>

      <AppDataTable
        v-model:items-per-page="pageSize"
        v-model:page="page"
        :headers="headers"
        :items="auditStore.items"
        :items-length="auditStore.meta?.total || 0"
        :loading="auditStore.loading"
        item-value="id"
        @update:options="fetchLogs"
      >
        <template #item.action="{ item }">
          <AppChip size="small" :color="actionColor(item.action)" variant="flat">{{ item.action }}</AppChip>
        </template>

        <template #item.entityType="{ item }">
          <span class="text-body-2">{{ item.entityType }}</span>
        </template>

        <template #item.performedBy="{ item }">
          <span v-if="item.performedBy">{{ item.performedBy.fullName }}</span>
          <span v-else class="text-medium-emphasis">System</span>
        </template>

        <template #item.createdAt="{ item }">
          {{ new Date(item.createdAt).toLocaleString() }}
        </template>
      </AppDataTable>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAdminAuditStore } from '@/stores/admin-audit.store';
import { AppCard, AppCardText, AppTextField, AppSelect, AppBtn, AppDataTable, AppChip } from '@/components/ui';

const auditStore = useAdminAuditStore();

const search = ref('');
const actionFilter = ref<string | null>(null);
const entityTypeFilter = ref('');
const page = ref(1);
const pageSize = ref(10);

const actionOptions = [
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
  'ACTIVATE', 'DEACTIVATE', 'ROLE_CHANGE', 'PERMISSION_CHANGE',
  'PASSWORD_RESET', 'COMPANY_ASSIGNMENT',
];

const headers = [
  { title: 'Action', key: 'action', sortable: false },
  { title: 'Entity', key: 'entityType', sortable: false },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Performed By', key: 'performedBy', sortable: false },
  { title: 'Date', key: 'createdAt', sortable: false },
];

function actionColor(action: string) {
  if (action === 'DELETE') return 'error';
  if (action === 'CREATE') return 'success';
  if (action === 'LOGIN') return 'info';
  if (action === 'LOGOUT') return 'default';
  return 'warning';
}

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchLogs, 350);
}

async function fetchLogs() {
  await auditStore.fetchList({
    page: page.value,
    pageSize: pageSize.value,
    search: search.value || undefined,
    action: actionFilter.value || undefined,
    entityType: entityTypeFilter.value || undefined,
  });
}

function clearFilters() {
  search.value = '';
  actionFilter.value = null;
  entityTypeFilter.value = '';
  fetchLogs();
}
</script>
