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
        <AppBtn icon="mdi-pencil-outline" variant="text" size="small" :disabled="!canAssign" @click="openEditDialog(item as any)" />
        <AppBtn
          v-if="(item as any).status !== 'ACTIVE'"
          icon="mdi-delete-outline"
          variant="text"
          size="small"
          :disabled="!canAssign"
          @click="openDeleteConfirm(item as any)"
        />
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="dialog" title="New Assignment" :loading="submitting" @submit="onSubmit">
      <AppSelect
        v-model="form.vehicleId"
        :items="availableVehicleOptions"
        item-title="registrationNumber"
        item-value="id"
        label="Vehicle (already-assigned vehicles are hidden)"
        :error-messages="errors.vehicleId"
        class="mb-2"
      />
      <AppSelect
        v-model="form.driverId"
        :items="availableDriverOptions"
        item-title="name"
        item-value="id"
        label="Driver (already-assigned drivers are hidden)"
        :error-messages="errors.driverId"
        class="mb-2"
      />
      <div v-if="loadingAvailability" class="text-caption text-medium-emphasis mb-2">Checking who's already assigned…</div>
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

    <AppDialog v-model="editDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Edit Assignment</AppCardTitle>
        <AppCardText>
          <p class="text-body-2 text-medium-emphasis mb-3">
            {{ editTarget?.vehicle.registrationNumber }} &mdash; {{ editTarget?.driver.name }}
          </p>
          <AppTextarea v-model="editNotes" label="Notes" rows="2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="editDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="editSubmitting" @click="submitEdit">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Assignment"
      :message="`Delete assignment record for ${deleteTarget?.vehicle.registrationNumber} / ${deleteTarget?.driver.name}?`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useVehicleAssignmentStore } from '@/stores/fleet';
import { vehicleAssignmentApi } from '@/services/fleet';
import { useVehicleStore, useDriverStore } from '@/stores/masters';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
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
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canAssign = authStore.hasPermission('vehicle.assign');

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

// --- Availability filtering for the New Assignment dialog ---
// A vehicle/driver already holding an ACTIVE assignment is hidden from
// these pickers entirely, rather than only surfacing the conflict as an
// error toast after submission (matches Trip's allocate/assign pattern).
const loadingAvailability = ref(false);
const busyVehicleIds = ref(new Set<string>());
const busyDriverIds = ref(new Set<string>());
const availableVehicleOptions = computed(() => vehicleOptions.value.filter((v) => !busyVehicleIds.value.has(v.id)));
const availableDriverOptions = computed(() => driverOptions.value.filter((d) => !busyDriverIds.value.has(d.id)));

async function refreshAvailability() {
  loadingAvailability.value = true;
  try {
    const response = await vehicleAssignmentApi.list({ status: 'ACTIVE', pageSize: 500 });
    busyVehicleIds.value = new Set(response.data.data.map((a: any) => a.vehicle.id));
    busyDriverIds.value = new Set(response.data.data.map((a: any) => a.driver.id));
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to check current assignments'));
  } finally {
    loadingAvailability.value = false;
  }
}

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
  refreshAvailability();
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

const editDialog = ref(false);
const editTarget = ref<any>(null);
const editNotes = ref('');
const editSubmitting = ref(false);

function openEditDialog(assignment: any) {
  editTarget.value = assignment;
  editNotes.value = assignment.notes || '';
  editDialog.value = true;
}

async function submitEdit() {
  if (!editTarget.value) return;
  editSubmitting.value = true;
  try {
    await store.update(editTarget.value.id, editNotes.value || undefined);
    success('Assignment updated');
    editDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update assignment'));
  } finally {
    editSubmitting.value = false;
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<any>(null);
const deleting = ref(false);

function openDeleteConfirm(assignment: any) {
  deleteTarget.value = assignment;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Assignment deleted');
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete assignment'));
  } finally {
    deleting.value = false;
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
