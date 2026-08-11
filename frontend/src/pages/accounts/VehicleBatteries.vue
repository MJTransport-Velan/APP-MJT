<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Vehicle Batteries</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openInstallDialog">Install Battery</AppBtn>
    </div>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.meta?.total || 0" :loading="store.loading" :page="page" :page-size="pageSize" @update:page="onPageUpdate" @update:page-size="onPageSizeUpdate">
      <template #filters>
        <AppSelect v-model="vehicleFilter" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle" clearable density="compact" hide-details @update:model-value="fetchData" />
      </template>
      <template #item.vehicle="{ item }">{{ (item as any).vehicle.registrationNumber }}</template>
      <template #item.cost="{ item }">{{ (item as any).cost ? formatCurrency((item as any).cost) : '-' }}</template>
      <template #item.warrantyExpiryDate="{ item }">{{ (item as any).warrantyExpiryDate ? new Date((item as any).warrantyExpiryDate).toLocaleDateString() : '-' }}</template>
      <template #item.status="{ item }"><AppChip size="small" :color="statusColor((item as any).status)">{{ (item as any).status }}</AppChip></template>
      <template #item.actions="{ item }">
        <AppBtn v-if="(item as any).status === 'INSTALLED'" icon="mdi-close-circle-outline" variant="text" size="small" color="error" @click="onDispose(item as any)" />
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="installDialog" title="Install Battery" :loading="submitting" @submit="onInstall">
      <AppSelect v-model="form.vehicleId" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle" :error-messages="errors.vehicleId" class="mb-2" />
      <AppTextField v-model="form.brand" label="Brand" :error-messages="errors.brand" class="mb-2" />
      <AppTextField v-model="form.serialNumber" label="Serial Number" class="mb-2" />
      <div class="d-flex ga-2">
        <AppTextField v-model="form.installedDate" type="date" label="Installed Date" class="mb-2 flex-1-1" />
        <AppTextField v-model.number="form.installedOdometer" type="number" label="Odometer" class="mb-2 flex-1-1" />
      </div>
      <div class="d-flex ga-2">
        <AppTextField v-model.number="form.warrantyMonths" type="number" label="Warranty (months)" class="mb-2 flex-1-1" />
        <AppTextField v-model.number="form.cost" type="number" label="Cost" class="mb-2 flex-1-1" />
      </div>
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useVehicleBatteryStore } from '@/stores/accounts/vehicleAssets';
import { useVehicleStore } from '@/stores/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppChip } from '@/components/ui';
import type { VehicleBattery } from '@/types/phase6.types';

const store = useVehicleBatteryStore();
const vehicleStore = useVehicleStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const vehicleFilter = ref<string | null>(null);
const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);

function statusColor(status: string) {
  return ({ INSTALLED: 'success', REPLACED: 'warning', DISPOSED: 'default' } as Record<string, string>)[status] || 'info';
}

const headers = [
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Brand', key: 'brand', sortable: false },
  { title: 'Cost', key: 'cost', sortable: false },
  { title: 'Warranty Expiry', key: 'warrantyExpiryDate', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onPageUpdate(v: number) { page.value = v; fetchData(); }
function onPageSizeUpdate(v: number) { pageSize.value = v; fetchData(); }
async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, vehicleId: vehicleFilter.value || undefined });
}

const installDialog = ref(false);
const submitting = ref(false);
const form = reactive({
  vehicleId: '', brand: '', serialNumber: '',
  installedDate: new Date().toISOString().slice(0, 10), installedOdometer: undefined as number | undefined,
  warrantyMonths: undefined as number | undefined, cost: undefined as number | undefined,
});
const errors = reactive({ vehicleId: '', brand: '' });

function openInstallDialog() {
  Object.assign(form, { vehicleId: '', brand: '', serialNumber: '', installedDate: new Date().toISOString().slice(0, 10), installedOdometer: undefined, warrantyMonths: undefined, cost: undefined });
  Object.assign(errors, { vehicleId: '', brand: '' });
  installDialog.value = true;
}

async function onInstall() {
  errors.vehicleId = form.vehicleId ? '' : 'Vehicle is required';
  errors.brand = form.brand ? '' : 'Brand is required';
  if (errors.vehicleId || errors.brand) return;
  submitting.value = true;
  try {
    await store.install({ ...form, serialNumber: form.serialNumber || undefined });
    success('Battery installed');
    installDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to install battery'));
  } finally {
    submitting.value = false;
  }
}

async function onDispose(battery: VehicleBattery) {
  try {
    await store.dispose(battery.id);
    success('Battery disposed');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to dispose battery'));
  }
}

onMounted(async () => {
  await vehicleStore.fetchList({ pageSize: 200 });
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  fetchData();
});
</script>
