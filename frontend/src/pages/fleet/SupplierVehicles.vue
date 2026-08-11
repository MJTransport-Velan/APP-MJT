<template>
  <div>
    <h2 class="text-h6 mb-4">Supplier Vehicles</h2>

    <AppCard class="mb-4 pa-4">
      <AppSelect
        v-model="supplierFilter"
        :items="supplierOptions"
        item-title="name"
        item-value="id"
        label="Filter by Supplier"
        clearable
        style="max-width: 320px"
        @update:model-value="fetchData"
      />
    </AppCard>

    <MasterDataTable
      :headers="headers"
      :items="store.items"
      :items-length="store.meta?.total || 0"
      :loading="store.loading"
      :search="search"
      :page="page"
      :page-size="pageSize"
      @update:search="onSearchUpdate"
      @update:page="onPageUpdate"
      @update:page-size="onPageSizeUpdate"
    >
      <template #item.vehicleType="{ item }">{{ (item as any).vehicleType?.name }}</template>
      <template #item.supplier="{ item }">{{ (item as any).supplier?.name }}</template>
      <template #item.status="{ item }">
        <VehicleStatusChip :status="(item as any).status" />
      </template>
      <template #item.activeAssignment="{ item }">
        <span v-if="(item as any).activeAssignment">
          {{ (item as any).activeAssignment.driver }}
        </span>
        <span v-else class="text-caption text-medium-emphasis">Unassigned</span>
      </template>
      <template #item.actions="{ item }">
        <AppBtn
          v-if="(item as any).supplier"
          icon="mdi-history"
          variant="text"
          size="small"
          @click="openHistory(item as any)"
        />
      </template>
    </MasterDataTable>

    <AppDialog v-model="historyDialog" max-width="600" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Assignment History — {{ historyTarget?.supplier?.name }}</AppCardTitle>
        <AppCardText style="max-height: 420px; overflow-y: auto">
          <AppTimeline side="end">
            <AppTimelineItem v-for="record in historyRecords" :key="record.id" size="small">
              <div class="text-body-2">
                {{ record.vehicle.registrationNumber }} — {{ record.driver.name }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ new Date(record.assignedAt).toLocaleDateString() }} · {{ record.status }}
              </div>
            </AppTimelineItem>
          </AppTimeline>
          <p v-if="historyRecords.length === 0" class="text-caption text-medium-emphasis">No assignment history.</p>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="historyDialog = false">Close</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSupplierVehicleStore } from '@/stores/fleet';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import VehicleStatusChip from '@/components/fleet/VehicleStatusChip.vue';
import {
  AppCard,
  AppSelect,
  AppBtn,
  AppDialog,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppTimeline,
  AppTimelineItem,
} from '@/components/ui';

// Suppliers list comes from the admin-company-adjacent Supplier catalog
// (Phase 3 Masters) — reused here for the filter dropdown.
import { supplierApi } from '@/services/masters';

const store = useSupplierVehicleStore();
const { error } = useSnackbar();

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const supplierFilter = ref<string | null>(null);
const supplierOptions = ref<{ id: string; name: string }[]>([]);

const headers = [
  { title: 'Registration No.', key: 'registrationNumber', sortable: false },
  { title: 'Type', key: 'vehicleType', sortable: false },
  { title: 'Supplier', key: 'supplier', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Current Driver', key: 'activeAssignment', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

let debounceTimer: ReturnType<typeof setTimeout>;
function onSearchUpdate(value: string) {
  search.value = value;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    fetchData();
  }, 350);
}
function onPageUpdate(v: number) {
  page.value = v;
  fetchData();
}
function onPageSizeUpdate(v: number) {
  pageSize.value = v;
  fetchData();
}

async function fetchData() {
  await store.fetchList({
    page: page.value,
    pageSize: pageSize.value,
    search: search.value || undefined,
    supplierId: supplierFilter.value || undefined,
  });
}

const historyDialog = ref(false);
const historyTarget = ref<any>(null);
const historyRecords = ref<any[]>([]);

async function openHistory(vehicle: any) {
  if (!vehicle.supplier) return;
  historyTarget.value = vehicle;
  historyDialog.value = true;
  try {
    historyRecords.value = await store.fetchAssignmentHistory(vehicle.supplier.id);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load assignment history'));
  }
}

onMounted(async () => {
  const suppliersRes = await supplierApi.list({ pageSize: 200 });
  supplierOptions.value = suppliersRes.data.data.map((s: any) => ({ id: s.id, name: s.name }));
  fetchData();
});
</script>
