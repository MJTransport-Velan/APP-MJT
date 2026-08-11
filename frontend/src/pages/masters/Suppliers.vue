<template>
  <div>
    <MasterToolbar title="Suppliers" :can-create="canCreate" @create="openCreateDialog" />

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
      <template #item.isActive="{ item }">
        <StatusChip :is-active="(item as any).isActive" />
      </template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-file-upload-outline" variant="text" size="small" :disabled="!canEdit" @click="openDocumentDialog(item as any)" />
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

    <MasterFormDialog v-model="dialog" :title="isEditing ? 'Edit Supplier' : 'New Supplier'" :loading="submitting" @submit="onSubmit">
      <AppTextField v-model="form.name" label="Supplier Name" :error-messages="errors.name" class="mb-2" />
      <AppTextField v-model="form.code" label="Supplier Code" :disabled="isEditing" :error-messages="errors.code" class="mb-2" />
      <AppTextField v-model="form.gstNumber" label="GST Number" :error-messages="errors.gstNumber" class="mb-2" />
      <AppTextField v-model="form.panNumber" label="PAN Number" :error-messages="errors.panNumber" class="mb-2" />
      <AppTextField v-model="form.contactPerson" label="Contact Person" class="mb-2" />
      <AppTextField v-model="form.phone" label="Phone" :error-messages="errors.phone" class="mb-2" />
      <AppTextField v-model="form.email" label="Email" :error-messages="errors.email" class="mb-2" />
      <AppTextarea v-model="form.address" label="Address" rows="2" />
    </MasterFormDialog>

    <!-- Document Upload -->
    <AppDialog v-model="documentDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Document — {{ documentTarget?.name }}</AppCardTitle>
        <AppCardText>
          <AppFileInput v-model="documentFile" label="Supplier Document" accept="image/*,application/pdf" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="documentDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="uploadingDocument" @click="submitDocument">Upload</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Supplier"
      :message="`Delete supplier '${deleteTarget?.name}'?`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useSupplierStore } from '@/stores/masters';
import { uploadSupplierDocument } from '@/services/masters';
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
  AppTextarea,
  AppDialog,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppFileInput,
} from '@/components/ui';

const store = useSupplierStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('supplier.create');
const canEdit = authStore.hasPermission('supplier.edit');
const canDelete = authStore.hasPermission('supplier.delete');

const search = ref('');
const page = ref(1);
const pageSize = ref(10);

const headers = [
  { title: 'Supplier', key: 'name', sortable: false },
  { title: 'Code', key: 'code', sortable: false },
  { title: 'GST Number', key: 'gstNumber', sortable: false },
  { title: 'Phone', key: 'phone', sortable: false },
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
const form = reactive({
  name: '',
  code: '',
  gstNumber: '',
  panNumber: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
});
const errors = reactive({ name: '', code: '', gstNumber: '', panNumber: '', phone: '', email: '' });

const gstRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/;
const panRegex = /^[A-Z]{5}\d{4}[A-Z]{1}$/;

function resetForm() {
  Object.assign(form, {
    name: '',
    code: '',
    gstNumber: '',
    panNumber: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });
  Object.assign(errors, { name: '', code: '', gstNumber: '', panNumber: '', phone: '', email: '' });
}

function openCreateDialog() {
  resetForm();
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(supplier: any) {
  resetForm();
  isEditing.value = true;
  editingId.value = supplier.id;
  form.name = supplier.name;
  form.code = supplier.code;
  form.gstNumber = supplier.gstNumber || '';
  form.panNumber = supplier.panNumber || '';
  form.contactPerson = supplier.contactPerson || '';
  form.phone = supplier.phone || '';
  form.email = supplier.email || '';
  form.address = supplier.address || '';
  dialog.value = true;
}

function validateForm(): boolean {
  errors.name = form.name.trim() ? '' : 'Supplier name is required';
  errors.code = !isEditing.value && !form.code.trim() ? 'Supplier code is required' : '';
  errors.gstNumber = form.gstNumber && !gstRegex.test(form.gstNumber) ? 'Invalid GST number' : '';
  errors.panNumber = form.panNumber && !panRegex.test(form.panNumber) ? 'Invalid PAN number' : '';
  errors.phone = form.phone && !/^[6-9]\d{9}$/.test(form.phone) ? 'Phone must be a valid 10-digit number' : '';
  errors.email = form.email && !/^\S+@\S+\.\S+$/.test(form.email) ? 'Invalid email' : '';
  return !errors.name && !errors.code && !errors.gstNumber && !errors.panNumber && !errors.phone && !errors.email;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    const payload: Record<string, unknown> = {
      name: form.name,
      gstNumber: form.gstNumber || undefined,
      panNumber: form.panNumber || undefined,
      contactPerson: form.contactPerson || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
    };
    if (isEditing.value && editingId.value) {
      await store.update(editingId.value, payload);
      success('Supplier updated successfully');
    } else {
      await store.create({ ...payload, code: form.code });
      success('Supplier created successfully');
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save supplier'));
  } finally {
    submitting.value = false;
  }
}

async function onToggleStatus(supplier: any) {
  try {
    await store.toggleStatus(supplier.id);
    success('Status updated successfully');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update status'));
  }
}

// --- Document Upload ---
const documentDialog = ref(false);
const documentTarget = ref<any>(null);
const documentFile = ref<File[]>([]);
const uploadingDocument = ref(false);

function openDocumentDialog(supplier: any) {
  documentTarget.value = supplier;
  documentFile.value = [];
  documentDialog.value = true;
}

async function submitDocument() {
  if (!documentTarget.value || !documentFile.value[0]) {
    error('Please select a file to upload');
    return;
  }
  uploadingDocument.value = true;
  try {
    await uploadSupplierDocument(documentTarget.value.id, documentFile.value[0]);
    success('Document uploaded successfully');
    documentDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload document'));
  } finally {
    uploadingDocument.value = false;
  }
}

// --- Delete ---
const deleteDialog = ref(false);
const deleteTarget = ref<any>(null);
const deleting = ref(false);

function openDeleteConfirm(supplier: any) {
  deleteTarget.value = supplier;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Supplier deleted successfully');
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete supplier'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(fetchData);
</script>
