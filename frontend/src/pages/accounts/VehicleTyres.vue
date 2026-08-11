<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Vehicle Tyres</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openInstallDialog">Install Tyre</AppBtn>
    </div>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.meta?.total || 0" :loading="store.loading" :page="page" :page-size="pageSize" @update:page="onPageUpdate" @update:page-size="onPageSizeUpdate">
      <template #filters>
        <AppSelect v-model="vehicleFilter" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle" clearable density="compact" hide-details @update:model-value="fetchData" />
        <AppSelect v-model="statusFilter" :items="statusOptions" label="Status" clearable density="compact" hide-details @update:model-value="fetchData" />
      </template>
      <template #item.tyre="{ item }">{{ (item as any).tyre.brand }} ({{ (item as any).tyre.code }})</template>
      <template #item.vehicle="{ item }">{{ (item as any).vehicle?.registrationNumber || '-' }}</template>
      <template #item.cost="{ item }">{{ (item as any).cost ? formatCurrency((item as any).cost) : '-' }}</template>
      <template #item.status="{ item }"><AppChip size="small" :color="statusColor((item as any).status)">{{ (item as any).status }}</AppChip></template>
      <template #item.actions="{ item }">
        <template v-if="(item as any).status === 'INSTALLED'">
          <AppBtn icon="mdi-swap-horizontal" variant="text" size="small" @click="openRotateDialog(item as any)" />
          <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" @click="onRemove(item as any)" />
          <AppBtn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="onScrap(item as any)" />
        </template>
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="installDialog" title="Install Tyre" :loading="submitting" @submit="onInstall">
      <AppSelect v-model="form.tyreId" :items="tyreOptions" item-title="brand" item-value="id" label="Tyre (Catalog)" :error-messages="errors.tyreId" class="mb-2" />
      <AppSelect v-model="form.vehicleId" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle" :error-messages="errors.vehicleId" class="mb-2" />
      <AppTextField v-model="form.position" label="Position (e.g. FL, FR, RL1)" class="mb-2" />
      <AppTextField v-model="form.serialNumber" label="Serial Number" class="mb-2" />
      <div class="d-flex ga-2">
        <AppTextField v-model="form.installedDate" type="date" label="Installed Date" class="mb-2 flex-1-1" />
        <AppTextField v-model.number="form.installedOdometer" type="number" label="Odometer" class="mb-2 flex-1-1" />
      </div>
      <AppTextField v-model.number="form.cost" type="number" label="Cost" class="mb-2" />
    </MasterFormDialog>

    <MasterFormDialog v-model="rotateDialog" title="Rotate Tyre" :loading="rotating" @submit="onRotate">
      <AppSelect v-model="rotateForm.toVehicleId" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="To Vehicle" clearable class="mb-2" />
      <AppTextField v-model="rotateForm.toPosition" label="To Position" class="mb-2" />
      <AppTextField v-model.number="rotateForm.odometerReading" type="number" label="Odometer" class="mb-2" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useVehicleTyreStore } from '@/stores/accounts/vehicleAssets';
import { useVehicleStore, useTyreStore } from '@/stores/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppChip } from '@/components/ui';
import type { VehicleTyre } from '@/types/phase6.types';

const store = useVehicleTyreStore();
const vehicleStore = useVehicleStore();
const tyreStore = useTyreStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const vehicleFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);
const statusOptions = ['INSTALLED', 'REMOVED', 'SCRAPPED'];
const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const tyreOptions = ref<{ id: string; brand: string }[]>([]);

function statusColor(status: string) {
  return ({ INSTALLED: 'success', REMOVED: 'warning', SCRAPPED: 'default' } as Record<string, string>)[status] || 'info';
}

const headers = [
  { title: 'Tyre', key: 'tyre', sortable: false },
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Position', key: 'position', sortable: false },
  { title: 'Cost', key: 'cost', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onPageUpdate(v: number) { page.value = v; fetchData(); }
function onPageSizeUpdate(v: number) { pageSize.value = v; fetchData(); }
async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, vehicleId: vehicleFilter.value || undefined, status: statusFilter.value || undefined });
}

const installDialog = ref(false);
const submitting = ref(false);
const form = reactive({
  tyreId: '', vehicleId: '', position: '', serialNumber: '',
  installedDate: new Date().toISOString().slice(0, 10), installedOdometer: undefined as number | undefined, cost: undefined as number | undefined,
});
const errors = reactive({ tyreId: '', vehicleId: '' });

function openInstallDialog() {
  Object.assign(form, { tyreId: '', vehicleId: '', position: '', serialNumber: '', installedDate: new Date().toISOString().slice(0, 10), installedOdometer: undefined, cost: undefined });
  Object.assign(errors, { tyreId: '', vehicleId: '' });
  installDialog.value = true;
}

async function onInstall() {
  errors.tyreId = form.tyreId ? '' : 'Tyre is required';
  errors.vehicleId = form.vehicleId ? '' : 'Vehicle is required';
  if (errors.tyreId || errors.vehicleId) return;
  submitting.value = true;
  try {
    await store.install({ ...form, position: form.position || undefined, serialNumber: form.serialNumber || undefined });
    success('Tyre installed');
    installDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to install tyre'));
  } finally {
    submitting.value = false;
  }
}

const rotateDialog = ref(false);
const rotating = ref(false);
const rotateTarget = ref<VehicleTyre | null>(null);
const rotateForm = reactive({ toVehicleId: '', toPosition: '', odometerReading: undefined as number | undefined });
function openRotateDialog(tyre: VehicleTyre) {
  rotateTarget.value = tyre;
  Object.assign(rotateForm, { toVehicleId: tyre.vehicle?.id || '', toPosition: '', odometerReading: undefined });
  rotateDialog.value = true;
}
async function onRotate() {
  if (!rotateTarget.value) return;
  rotating.value = true;
  try {
    await store.rotate(rotateTarget.value.id, { toVehicleId: rotateForm.toVehicleId || undefined, toPosition: rotateForm.toPosition || undefined, odometerReading: rotateForm.odometerReading });
    success('Tyre rotated');
    rotateDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to rotate tyre'));
  } finally {
    rotating.value = false;
  }
}

async function onRemove(tyre: VehicleTyre) {
  try {
    await store.remove(tyre.id);
    success('Tyre removed');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to remove tyre'));
  }
}
async function onScrap(tyre: VehicleTyre) {
  try {
    await store.scrap(tyre.id);
    success('Tyre scrapped');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to scrap tyre'));
  }
}

onMounted(async () => {
  await Promise.all([vehicleStore.fetchList({ pageSize: 200 }), tyreStore.fetchList({ pageSize: 200 })]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  tyreOptions.value = tyreStore.items.map((t: any) => ({ id: t.id, brand: `${t.brand} (${t.size || ''})` }));
  fetchData();
});
</script>
