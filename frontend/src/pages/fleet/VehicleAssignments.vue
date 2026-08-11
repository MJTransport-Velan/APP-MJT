<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Vehicle Assignments</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Assignment</AppBtn>
    </div>

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
      <template #filters>
        <AppSelect
          v-model="statusFilter"
          :items="statusOptions"
          label="Status"
          clearable
          @update:model-value="fetchData"
        />
      </template>

      <template #item.vehicle="{ item }">
        {{ (item as any).vehicle.registrationNumber }}
      </template>
      <template #item.driver="{ item }">
        {{ (item as any).driver.name }}
      </template>
      <template #item.status="{ item }">
        <AppChip size="small" :color="statusColor((item as any).status)" variant="flat">{{ (item as any).status }}</AppChip>
      </template>
      <template #item.assignedAt="{ item }">
        {{ new Date((item as any).assignedAt).toLocaleDateString() }}
      </template>
      <template #item.actions="{ item }">
        <template v-if="(item as any).status === 'ACTIVE'">
          <AppBtn icon="mdi-check-circle-outline" variant="text" size="small" @click="openCompleteDialog(item as any)" />
          <AppBtn icon="mdi-close-circle-outline" variant="text" size="small" @click="onCancel(item as any)" />
        </template>
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="dialog" title="New Assignment" :loading="submitting" @submit="onSubmit">
      <AppSelect
        v-model="form.vehicleId"
        :items="vehicleOptions"
        item-title="registrationNumber"
        item-value="id"
        label="Vehicle"
        :error-messages="errors.vehicleId"
        class="mb-2"
      />
      <AppSelect
        v-model="form.driverId"
        :items="driverOptions"
        item-title="name"
        item-value="id"
        label="Driver"
        :error-messages="errors.driverId"
        class="mb-2"
      />
      <AppTextarea v-model="form.notes" label="Notes" rows="2" />
    </MasterFormDialog>

    <AppDialog v-model="completeDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Complete Assignment</AppCardTitle>
        <AppCardText>
          <AppTextarea v-model="completeNotes" label="Closing Notes" rows="2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="completeDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="completing" @click="submitComplete">Complete</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useVehicleAssignmentStore } from '@/stores/fleet';
import { useVehicleStore, useDriverStore } from '@/stores/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import {
  AppBtn,
  AppSelect,
  AppChip,
  AppTextarea,
  AppDialog,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
} from '@/components/ui';

const store = useVehicleAssignmentStore();
const vehicleStore = useVehicleStore();
const driverStore = useDriverStore();
const { success, error } = useSnackbar();

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const statusFilter = ref<string | null>(null);

const statusOptions = [
  { title: 'Active', value: 'ACTIVE' },
  { title: 'Completed', value: 'COMPLETED' },
  { title: 'Cancelled', value: 'CANCELLED' },
];

const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const driverOptions = ref<{ id: string; name: string }[]>([]);

const headers = [
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Driver', key: 'driver', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Assigned On', key: 'assignedAt', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function statusColor(status: string) {
  if (status === 'ACTIVE') return 'info';
  if (status === 'COMPLETED') return 'success';
  return 'default';
}

let debounceTimer: ReturnType<typeof setTimeout>;
function onSearchUpdate(value: string) {
  search.value = value;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    fetchData();
  }, 350);
}
function onPageUpdate(value: number) {
  page.value = value;
  fetchData();
}
function onPageSizeUpdate(value: number) {
  pageSize.value = value;
  fetchData();
}

async function fetchData() {
  await store.fetchList({
    page: page.value,
    pageSize: pageSize.value,
    status: statusFilter.value || undefined,
  });
}

const dialog = ref(false);
const submitting = ref(false);
const form = reactive({ vehicleId: '', driverId: '', notes: '' });
const errors = reactive({ vehicleId: '', driverId: '' });

function openCreateDialog() {
  Object.assign(form, { vehicleId: '', driverId: '', notes: '' });
  Object.assign(errors, { vehicleId: '', driverId: '' });
  dialog.value = true;
}

function validateForm(): boolean {
  errors.vehicleId = form.vehicleId ? '' : 'Vehicle is required';
  errors.driverId = form.driverId ? '' : 'Driver is required';
  return !errors.vehicleId && !errors.driverId;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    await store.create({
      vehicleId: form.vehicleId,
      driverId: form.driverId,
      notes: form.notes || undefined,
    });
    success('Vehicle assigned successfully');
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create assignment'));
  } finally {
    submitting.value = false;
  }
}

const completeDialog = ref(false);
const completeTarget = ref<any>(null);
const completeNotes = ref('');
const completing = ref(false);

function openCompleteDialog(assignment: any) {
  completeTarget.value = assignment;
  completeNotes.value = '';
  completeDialog.value = true;
}

async function submitComplete() {
  if (!completeTarget.value) return;
  completing.value = true;
  try {
    await store.complete(completeTarget.value.id, completeNotes.value || undefined);
    success('Assignment completed');
    completeDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to complete assignment'));
  } finally {
    completing.value = false;
  }
}

async function onCancel(assignment: any) {
  try {
    await store.cancel(assignment.id);
    success('Assignment cancelled');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to cancel assignment'));
  }
}

onMounted(async () => {
  const [vehiclesRes] = await Promise.all([
    vehicleStore.fetchList({ pageSize: 200 }),
    driverStore.fetchList({ pageSize: 200 }),
  ]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  driverOptions.value = driverStore.items.map((d: any) => ({ id: d.id, name: d.name }));
  void vehiclesRes;
  fetchData();
});
</script>
