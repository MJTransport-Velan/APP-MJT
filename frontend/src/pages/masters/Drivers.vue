<template>
  <div>
    <MasterToolbar title="Drivers" :can-create="canCreate" @create="openCreateDialog" />

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
      <template #item.licenseExpiryDate="{ item }">
        {{ (item as any).licenseExpiryDate ? new Date((item as any).licenseExpiryDate).toLocaleDateString() : '-' }}
      </template>
      <template #item.isActive="{ item }">
        <StatusChip :is-active="(item as any).isActive" />
      </template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-file-upload-outline" variant="text" size="small" :disabled="!canEdit" @click="openLicenseDialog(item as any)" />
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

    <MasterFormDialog v-model="dialog" :title="isEditing ? 'Edit Driver' : 'New Driver'" :loading="submitting" @submit="onSubmit">
      <AppTextField v-model="form.name" label="Driver Name" :error-messages="errors.name" class="mb-2" />
      <AppTextField v-model="form.code" label="Driver Code" :disabled="isEditing" :error-messages="errors.code" class="mb-2" />
      <AppTextField v-model="form.licenseNumber" label="License Number" :error-messages="errors.licenseNumber" class="mb-2" />
      <AppTextField v-model="form.phone" label="Phone" maxlength="10" :error-messages="errors.phone" class="mb-2" />
      <AppTextField v-model="form.licenseExpiryDate" type="date" label="License Expiry Date" class="mb-2" />
    </MasterFormDialog>

    <!-- License Upload -->
    <AppDialog v-model="licenseDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">License Document — {{ licenseTarget?.name }}</AppCardTitle>
        <AppCardText>
          <AppFileInput v-model="licenseFile" label="License Document" accept="image/*,application/pdf" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="licenseDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="uploadingLicense" @click="submitLicense">Upload</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Driver"
      :message="`Delete driver '${deleteTarget?.name}'?`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useDriverStore } from '@/stores/masters';
import { uploadDriverLicense } from '@/services/masters';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterToolbar from '@/components/masters/MasterToolbar.vue';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import StatusChip from '@/components/masters/StatusChip.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import {
  AppBtn,
  AppTextField,
  AppDialog,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppFileInput,
} from '@/components/ui';

const store = useDriverStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('driver.create');
const canEdit = authStore.hasPermission('driver.edit');
const canDelete = authStore.hasPermission('driver.delete');

const search = ref('');
const page = ref(1);
const pageSize = ref(10);

const headers = [
  { title: 'Driver', key: 'name', sortable: false },
  { title: 'Code', key: 'code', sortable: false },
  { title: 'License No.', key: 'licenseNumber', sortable: false },
  { title: 'License Expiry', key: 'licenseExpiryDate', sortable: false },
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
const form = reactive({ name: '', code: '', licenseNumber: '', phone: '', licenseExpiryDate: '' });
const errors = reactive({ name: '', code: '', licenseNumber: '', phone: '' });

function resetForm() {
  Object.assign(form, { name: '', code: '', licenseNumber: '', phone: '', licenseExpiryDate: '' });
  Object.assign(errors, { name: '', code: '', licenseNumber: '', phone: '' });
}

function openCreateDialog() {
  resetForm();
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(driver: any) {
  resetForm();
  isEditing.value = true;
  editingId.value = driver.id;
  form.name = driver.name;
  form.code = driver.code;
  form.licenseNumber = driver.licenseNumber;
  form.phone = driver.phone || '';
  form.licenseExpiryDate = driver.licenseExpiryDate ? driver.licenseExpiryDate.substring(0, 10) : '';
  dialog.value = true;
}

function validateForm(): boolean {
  errors.name = form.name.trim() ? '' : 'Driver name is required';
  errors.code = !isEditing.value && !form.code.trim() ? 'Driver code is required' : '';
  errors.licenseNumber = form.licenseNumber.trim() ? '' : 'License number is required';
  errors.phone = form.phone && !/^[6-9]\d{9}$/.test(form.phone) ? 'Phone must be a valid 10-digit number' : '';
  return !errors.name && !errors.code && !errors.licenseNumber && !errors.phone;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    const payload: Record<string, unknown> = {
      name: form.name,
      licenseNumber: form.licenseNumber,
      phone: form.phone || undefined,
      licenseExpiryDate: form.licenseExpiryDate || undefined,
    };
    if (isEditing.value && editingId.value) {
      await store.update(editingId.value, payload);
      success('Driver updated successfully');
    } else {
      await store.create({ ...payload, code: form.code });
      success('Driver created successfully');
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save driver'));
  } finally {
    submitting.value = false;
  }
}

async function onToggleStatus(driver: any) {
  try {
    await store.toggleStatus(driver.id);
    success('Status updated successfully');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update status'));
  }
}

// --- License Upload ---
const licenseDialog = ref(false);
const licenseTarget = ref<any>(null);
const licenseFile = ref<File[]>([]);
const uploadingLicense = ref(false);

function openLicenseDialog(driver: any) {
  licenseTarget.value = driver;
  licenseFile.value = [];
  licenseDialog.value = true;
}

async function submitLicense() {
  if (!licenseTarget.value || !licenseFile.value[0]) {
    error('Please select a file to upload');
    return;
  }
  uploadingLicense.value = true;
  try {
    await uploadDriverLicense(licenseTarget.value.id, licenseFile.value[0]);
    success('License document uploaded successfully');
    licenseDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload license document'));
  } finally {
    uploadingLicense.value = false;
  }
}

// --- Delete ---
const deleteDialog = ref(false);
const deleteTarget = ref<any>(null);
const deleting = ref(false);

function openDeleteConfirm(driver: any) {
  deleteTarget.value = driver;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Driver deleted successfully');
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete driver'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(fetchData);
</script>
