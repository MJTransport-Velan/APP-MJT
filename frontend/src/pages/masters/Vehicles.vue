<template>
  <div>
    <MasterToolbar title="Vehicles" :can-create="canCreate" @create="openCreateDialog" />

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
      <template #item.vehicleType="{ item }">
        {{ (item as any).vehicleType?.name }}
      </template>
      <template #item.ownership="{ item }">
        <AppChip size="small" variant="outlined">{{ (item as any).ownership === 'OWN' ? 'Own Fleet' : 'Market Fleet' }}</AppChip>
      </template>
      <template #item.supplier="{ item }">
        {{ (item as any).supplier?.name || '-' }}
      </template>
      <template #item.isActive="{ item }">
        <StatusChip :is-active="(item as any).isActive" />
      </template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-file-upload-outline" variant="text" size="small" :disabled="!canEdit" @click="openDocumentsDialog(item as any)" />
        <AppBtn icon="mdi-pencil-outline" variant="text" size="small" :disabled="!canEdit" @click="openEditDialog(item as any)" />
        <AppBtn
          :icon="(item as any).isActive ? 'mdi-toggle-switch-off-outline' : 'mdi-toggle-switch-outline'"
          variant="text"
          size="small"
          :disabled="!canEdit"
          @click="onToggleStatus(item as any)"
        />
        <AppBtn icon="mdi-delete-outline" variant="text" size="small" :disabled="!canDelete" @click="openDeleteConfirm(item as any)" />
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="dialog" :title="isEditing ? 'Edit Vehicle' : 'New Vehicle'" :loading="submitting" @submit="onSubmit">
      <AppTextField
        v-model="form.registrationNumber"
        label="Registration Number"
        :disabled="isEditing"
        :error-messages="errors.registrationNumber"
        class="mb-2"
      />
      <AppSelect
        v-model="form.vehicleTypeId"
        :items="vehicleTypeOptions"
        item-title="name"
        item-value="id"
        label="Vehicle Type"
        :error-messages="errors.vehicleTypeId"
        class="mb-2"
      />
      <AppSelect
        v-model="form.ownership"
        :items="[{ title: 'Own Fleet', value: 'OWN' }, { title: 'Market Fleet', value: 'MARKET' }]"
        label="Ownership"
        class="mb-2"
      />
      <AppSelect
        v-if="form.ownership === 'MARKET'"
        v-model="form.supplierId"
        :items="supplierOptions"
        item-title="name"
        item-value="id"
        label="Supplier"
        :error-messages="errors.supplierId"
        class="mb-2"
      />
      <AppTextField v-model="form.manufacturer" label="Manufacturer" class="mb-2" />
      <AppTextField v-model="form.model" label="Model" class="mb-2" />
      <AppTextField v-model.number="form.capacityTon" type="number" label="Capacity (Tons)" class="mb-2" />
    </MasterFormDialog>

    <!-- Documents Upload -->
    <AppDialog v-model="documentsDialog" max-width="480" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Documents — {{ documentsTarget?.registrationNumber }}</AppCardTitle>
        <AppCardText>
          <AppFileInput v-model="rcFile" label="RC Document" accept="image/*,application/pdf" class="mb-2" />
          <AppFileInput v-model="insuranceFile" label="Insurance Document" accept="image/*,application/pdf" class="mb-2" />
          <AppFileInput v-model="permitFile" label="Permit Document" accept="image/*,application/pdf" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="documentsDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="uploadingDocuments" @click="submitDocuments">Upload</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Vehicle"
      :message="`Delete vehicle '${deleteTarget?.registrationNumber}'?`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useVehicleStore, useVehicleTypeStore, useSupplierStore } from '@/stores/masters';
import { uploadVehicleDocuments } from '@/services/masters';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterToolbar from '@/components/masters/MasterToolbar.vue';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import StatusChip from '@/components/masters/StatusChip.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import {
  AppBtn,
  AppChip,
  AppTextField,
  AppSelect,
  AppDialog,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppFileInput,
} from '@/components/ui';

const store = useVehicleStore();
const vehicleTypeStore = useVehicleTypeStore();
const supplierStore = useSupplierStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('vehicle.create');
const canEdit = authStore.hasPermission('vehicle.edit');
const canDelete = authStore.hasPermission('vehicle.delete');

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const vehicleTypeOptions = ref<{ id: string; name: string }[]>([]);
const supplierOptions = ref<{ id: string; name: string }[]>([]);

const headers = [
  { title: 'Registration No.', key: 'registrationNumber', sortable: false },
  { title: 'Type', key: 'vehicleType', sortable: false },
  { title: 'Ownership', key: 'ownership', sortable: false },
  { title: 'Supplier', key: 'supplier', sortable: false },
  { title: 'Status', key: 'isActive', sortable: false },
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
function onPageUpdate(value: number) {
  page.value = value;
  fetchData();
}
function onPageSizeUpdate(value: number) {
  pageSize.value = value;
  fetchData();
}

async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, search: search.value || undefined });
}

const dialog = ref(false);
const isEditing = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const form = reactive<{
  registrationNumber: string;
  vehicleTypeId: string;
  ownership: 'OWN' | 'MARKET';
  supplierId: string;
  manufacturer: string;
  model: string;
  capacityTon: number | undefined;
}>({
  registrationNumber: '',
  vehicleTypeId: '',
  ownership: 'OWN',
  supplierId: '',
  manufacturer: '',
  model: '',
  capacityTon: undefined,
});
const errors = reactive({ registrationNumber: '', vehicleTypeId: '', supplierId: '' });

function resetForm() {
  Object.assign(form, {
    registrationNumber: '',
    vehicleTypeId: '',
    ownership: 'OWN',
    supplierId: '',
    manufacturer: '',
    model: '',
    capacityTon: undefined,
  });
  Object.assign(errors, { registrationNumber: '', vehicleTypeId: '', supplierId: '' });
}

function openCreateDialog() {
  resetForm();
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(vehicle: any) {
  resetForm();
  isEditing.value = true;
  editingId.value = vehicle.id;
  form.registrationNumber = vehicle.registrationNumber;
  form.vehicleTypeId = vehicle.vehicleType?.id || '';
  form.ownership = vehicle.ownership;
  form.supplierId = vehicle.supplier?.id || '';
  form.manufacturer = vehicle.manufacturer || '';
  form.model = vehicle.model || '';
  form.capacityTon = vehicle.capacityTon ?? undefined;
  dialog.value = true;
}

function validateForm(): boolean {
  errors.registrationNumber = !isEditing.value && !form.registrationNumber.trim() ? 'Registration number is required' : '';
  errors.vehicleTypeId = form.vehicleTypeId ? '' : 'Vehicle type is required';
  errors.supplierId = form.ownership === 'MARKET' && !form.supplierId ? 'Supplier is required for market fleet' : '';
  return !errors.registrationNumber && !errors.vehicleTypeId && !errors.supplierId;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    const payload: Record<string, unknown> = {
      vehicleTypeId: form.vehicleTypeId,
      ownership: form.ownership,
      supplierId: form.ownership === 'MARKET' ? form.supplierId : undefined,
      manufacturer: form.manufacturer,
      model: form.model,
      capacityTon: form.capacityTon,
    };
    if (isEditing.value && editingId.value) {
      await store.update(editingId.value, payload);
      success('Vehicle updated successfully');
    } else {
      await store.create({ ...payload, registrationNumber: form.registrationNumber });
      success('Vehicle created successfully');
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save vehicle'));
  } finally {
    submitting.value = false;
  }
}

async function onToggleStatus(vehicle: any) {
  try {
    await store.toggleStatus(vehicle.id);
    success('Status updated successfully');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update status'));
  }
}

// --- Documents ---
const documentsDialog = ref(false);
const documentsTarget = ref<any>(null);
const rcFile = ref<File[]>([]);
const insuranceFile = ref<File[]>([]);
const permitFile = ref<File[]>([]);
const uploadingDocuments = ref(false);

function openDocumentsDialog(vehicle: any) {
  documentsTarget.value = vehicle;
  rcFile.value = [];
  insuranceFile.value = [];
  permitFile.value = [];
  documentsDialog.value = true;
}

async function submitDocuments() {
  if (!documentsTarget.value) return;
  uploadingDocuments.value = true;
  try {
    await uploadVehicleDocuments(documentsTarget.value.id, {
      rcDocument: rcFile.value[0],
      insuranceDocument: insuranceFile.value[0],
      permitDocument: permitFile.value[0],
    });
    success('Documents uploaded successfully');
    documentsDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload documents'));
  } finally {
    uploadingDocuments.value = false;
  }
}

// --- Delete ---
const deleteDialog = ref(false);
const deleteTarget = ref<any>(null);
const deleting = ref(false);

function openDeleteConfirm(vehicle: any) {
  deleteTarget.value = vehicle;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Vehicle deleted successfully');
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete vehicle'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    vehicleTypeStore.fetchList({ pageSize: 200 }),
    supplierStore.fetchList({ pageSize: 200 }),
  ]);
  vehicleTypeOptions.value = vehicleTypeStore.items.map((v: any) => ({ id: v.id, name: v.name }));
  supplierOptions.value = supplierStore.items.map((s: any) => ({ id: s.id, name: s.name }));
  fetchData();
});
</script>
