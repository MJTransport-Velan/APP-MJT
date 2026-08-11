<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Maintenance</h2>
      <div class="d-flex ga-2">
        <AppBtnToggle v-model="viewMode" mandatory>
          <AppBtn value="list" icon="mdi-view-list-outline" size="small" />
          <AppBtn value="timeline" icon="mdi-timeline-outline" size="small" />
        </AppBtnToggle>
        <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Record</AppBtn>
      </div>
    </div>

    <AppCard v-if="store.upcomingDue.length > 0" class="pa-4 mb-4" color="warning" variant="tonal">
      <div class="text-subtitle-2 mb-2">Upcoming Service Due</div>
      <div v-for="rec in store.upcomingDue.slice(0, 5)" :key="rec.id" class="text-body-2">
        {{ rec.vehicle.registrationNumber }} — due {{ rec.nextServiceDueDate ? new Date(rec.nextServiceDueDate).toLocaleDateString() : '' }}
      </div>
    </AppCard>

    <AppCard class="mb-4 pa-4" v-if="viewMode === 'list'">
      <div class="row row-dense">
        <div class="col-6 col-sm-3">
          <AppSelect v-model="typeFilter" :items="typeOptions" label="Type" clearable @update:model-value="fetchData" />
        </div>
        <div class="col-6 col-sm-3">
          <AppSelect v-model="statusFilter" :items="statusOptions" label="Status" clearable @update:model-value="fetchData" />
        </div>
      </div>
    </AppCard>

    <MasterDataTable
      v-if="viewMode === 'list'"
      :headers="headers"
      :items="store.items"
      :items-length="store.meta?.total || 0"
      :loading="store.loading"
      :page="page"
      :page-size="pageSize"
      @update:page="onPageUpdate"
      @update:page-size="onPageSizeUpdate"
    >
      <template #item.vehicle="{ item }">{{ (item as any).vehicle.registrationNumber }}</template>
      <template #item.type="{ item }">
        <AppChip size="small" variant="outlined">{{ (item as any).type }}</AppChip>
      </template>
      <template #item.status="{ item }">
        <AppChip size="small" :color="(item as any).status === 'COMPLETED' ? 'success' : 'warning'" variant="flat">
          {{ (item as any).status }}
        </AppChip>
      </template>
      <template #item.cost="{ item }">
        {{ (item as any).cost ? formatCurrency((item as any).cost) : '-' }}
      </template>
      <template #item.serviceDate="{ item }">{{ new Date((item as any).serviceDate).toLocaleDateString() }}</template>
      <template #item.actions="{ item }">
        <AppBtn
          v-if="(item as any).status === 'OPEN'"
          icon="mdi-check-circle-outline"
          variant="text"
          size="small"
          @click="onComplete(item as any)"
        />
        <AppBtn icon="mdi-file-upload-outline" variant="text" size="small" @click="openAttachmentDialog(item as any)" />
        <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="openDeleteConfirm(item as any)" />
      </template>
    </MasterDataTable>

    <AppCard v-else class="pa-4">
      <MaintenanceTimeline :records="store.items" />
    </AppCard>

    <MasterFormDialog v-model="dialog" title="New Maintenance Record" :loading="submitting" @submit="onSubmit">
      <AppSelect v-model="form.vehicleId" :items="vehicleOptions" item-title="registrationNumber" item-value="id" label="Vehicle" :error-messages="errors.vehicleId" class="mb-2" />
      <AppSelect v-model="form.type" :items="typeOptions" label="Type" :error-messages="errors.type" class="mb-2" />
      <AppSelect v-model="form.serviceCategoryId" :items="serviceCategoryOptions" item-title="name" item-value="id" label="Service Category" clearable class="mb-2" />
      <AppTextarea v-model="form.description" label="Description" rows="2" :error-messages="errors.description" class="mb-2" />
      <div class="row row-dense">
        <div class="col-6">
          <AppTextField v-model="form.serviceDate" type="date" label="Service Date" />
        </div>
        <div class="col-6">
          <AppTextField v-model.number="form.cost" type="number" label="Cost" />
        </div>
      </div>
      <div class="row row-dense">
        <div class="col-6">
          <AppTextField v-model.number="form.nextServiceDueOdometer" type="number" label="Next Due Odometer" />
        </div>
        <div class="col-6">
          <AppTextField v-model="form.nextServiceDueDate" type="date" label="Next Due Date" />
        </div>
      </div>
    </MasterFormDialog>

    <AppDialog v-model="attachmentDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Attachments</AppCardTitle>
        <AppCardText>
          <AppFileInput v-model="billFile" label="Bill / Service Receipt" accept="image/*,application/pdf" class="mb-2" />
          <AppFileInput v-if="attachmentTarget?.type === 'ACCIDENT'" v-model="accidentFile" label="Accident Photo" accept="image/*" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="attachmentDialog = false">Close</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="uploadingAttachment" @click="submitAttachments">Upload</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Maintenance Record"
      message="Delete this maintenance record? This cannot be undone."
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useMaintenanceStore } from '@/stores/fleet';
import { maintenanceApi } from '@/services/fleet';
import { useVehicleStore, simpleMasterStoreMap } from '@/stores/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import MaintenanceTimeline from '@/components/fleet/MaintenanceTimeline.vue';
import {
  AppBtn,
  AppBtnToggle,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppChip,
  AppDialog,
  AppTextField,
  AppTextarea,
  AppSelect,
  AppFileInput,
} from '@/components/ui';

const store = useMaintenanceStore();
const vehicleStore = useVehicleStore();
const serviceCategoryStore = simpleMasterStoreMap['service-categories']();
const { success, error } = useSnackbar();

const viewMode = ref<'list' | 'timeline'>('list');
const page = ref(1);
const pageSize = ref(10);
const typeFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);

const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const serviceCategoryOptions = ref<{ id: string; name: string }[]>([]);

const typeOptions = ['SERVICE', 'REPAIR', 'BREAKDOWN', 'ACCIDENT'];
const statusOptions = ['OPEN', 'COMPLETED'];

const headers = [
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Type', key: 'type', sortable: false },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Cost', key: 'cost', sortable: false },
  { title: 'Date', key: 'serviceDate', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

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
    type: typeFilter.value || undefined,
    status: statusFilter.value || undefined,
  });
}

const dialog = ref(false);
const submitting = ref(false);
const form = reactive<{
  vehicleId: string;
  type: string;
  serviceCategoryId: string;
  description: string;
  serviceDate: string;
  cost: number | undefined;
  nextServiceDueDate: string;
  nextServiceDueOdometer: number | undefined;
}>({
  vehicleId: '',
  type: 'SERVICE',
  serviceCategoryId: '',
  description: '',
  serviceDate: new Date().toISOString().substring(0, 10),
  cost: undefined,
  nextServiceDueDate: '',
  nextServiceDueOdometer: undefined,
});
const errors = reactive({ vehicleId: '', type: '', description: '' });

function openCreateDialog() {
  Object.assign(form, {
    vehicleId: '',
    type: 'SERVICE',
    serviceCategoryId: '',
    description: '',
    serviceDate: new Date().toISOString().substring(0, 10),
    cost: undefined,
    nextServiceDueDate: '',
    nextServiceDueOdometer: undefined,
  });
  Object.assign(errors, { vehicleId: '', type: '', description: '' });
  dialog.value = true;
}

function validateForm(): boolean {
  errors.vehicleId = form.vehicleId ? '' : 'Vehicle is required';
  errors.type = form.type ? '' : 'Type is required';
  errors.description = form.description.trim() ? '' : 'Description is required';
  return !errors.vehicleId && !errors.type && !errors.description;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    await store.create({
      vehicleId: form.vehicleId,
      type: form.type,
      serviceCategoryId: form.serviceCategoryId || undefined,
      description: form.description,
      serviceDate: form.serviceDate,
      cost: form.cost,
      nextServiceDueDate: form.nextServiceDueDate || undefined,
      nextServiceDueOdometer: form.nextServiceDueOdometer,
    });
    success('Maintenance record created');
    dialog.value = false;
    fetchData();
    store.fetchUpcomingDue();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create maintenance record'));
  } finally {
    submitting.value = false;
  }
}

async function onComplete(record: any) {
  try {
    await store.update(record.id, { status: 'COMPLETED' });
    success('Marked as completed');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update record'));
  }
}

const attachmentDialog = ref(false);
const attachmentTarget = ref<any>(null);
const billFile = ref<File[]>([]);
const accidentFile = ref<File[]>([]);
const uploadingAttachment = ref(false);

function openAttachmentDialog(record: any) {
  attachmentTarget.value = record;
  billFile.value = [];
  accidentFile.value = [];
  attachmentDialog.value = true;
}

async function submitAttachments() {
  if (!attachmentTarget.value) return;
  uploadingAttachment.value = true;
  try {
    if (billFile.value[0]) {
      await maintenanceApi.uploadBill(attachmentTarget.value.id, billFile.value[0]);
    }
    if (accidentFile.value[0]) {
      await maintenanceApi.uploadAccidentPhoto(attachmentTarget.value.id, accidentFile.value[0]);
    }
    success('Attachments uploaded');
    attachmentDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload attachments'));
  } finally {
    uploadingAttachment.value = false;
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<any>(null);
const deleting = ref(false);

function openDeleteConfirm(record: any) {
  deleteTarget.value = record;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Maintenance record deleted');
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete record'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    vehicleStore.fetchList({ pageSize: 200 }),
    serviceCategoryStore.fetchList({ pageSize: 200 }),
    store.fetchUpcomingDue(),
  ]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  serviceCategoryOptions.value = serviceCategoryStore.items.map((s: any) => ({ id: s.id, name: s.name }));
  fetchData();
});
</script>
