<template>
  <div>
    <MasterToolbar title="Organization" :can-create="canCreate" @create="openCreateDialog" create-label="New Organization" />
    <p class="text-caption text-medium-emphasis mb-4">
      The legal entity these books belong to — distinct from the Companies you bill (see Masters → Companies).
    </p>

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
        <AppBtn icon="mdi-pencil-outline" variant="text" size="small" :disabled="!canEdit" @click="openEditDialog(item as any)" />
        <AppBtn
          :icon="(item as any).isActive ? 'mdi-toggle-switch-off-outline' : 'mdi-toggle-switch-outline'"
          variant="text"
          size="small"
          :disabled="!canEdit"
          @click="onToggleStatus(item as any)"
        />
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="dialog" :title="isEditing ? 'Edit Organization' : 'New Organization'" :loading="submitting" @submit="onSubmit">
      <AppTextField v-model="form.name" label="Name" :error-messages="errors.name" class="mb-2" />
      <AppTextField v-model="form.code" label="Code" :disabled="isEditing" :error-messages="errors.code" class="mb-2" />
      <AppTextField v-model="form.gstNumber" label="GST Number" :error-messages="errors.gstNumber" class="mb-2" />
      <AppTextField v-model="form.panNumber" label="PAN Number" :error-messages="errors.panNumber" class="mb-2" />
      <AppTextField v-model="form.tanNumber" label="TAN Number" :error-messages="errors.tanNumber" class="mb-2" />
      <AppTextarea v-model="form.address" label="Address" rows="2" class="mb-2" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useOrganizationStore } from '@/stores/accounting';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterToolbar from '@/components/masters/MasterToolbar.vue';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import StatusChip from '@/components/masters/StatusChip.vue';
import { AppBtn, AppTextField, AppTextarea } from '@/components/ui';

const store = useOrganizationStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('organization.create');
const canEdit = authStore.hasPermission('organization.edit');

const search = ref('');
const page = ref(1);
const pageSize = ref(10);

const headers = [
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Code', key: 'code', sortable: false },
  { title: 'GST Number', key: 'gstNumber', sortable: false },
  { title: 'PAN Number', key: 'panNumber', sortable: false },
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
const form = reactive({ name: '', code: '', gstNumber: '', panNumber: '', tanNumber: '', address: '' });
const errors = reactive({ name: '', code: '', gstNumber: '', panNumber: '', tanNumber: '' });

function resetForm() {
  Object.assign(form, { name: '', code: '', gstNumber: '', panNumber: '', tanNumber: '', address: '' });
  Object.assign(errors, { name: '', code: '', gstNumber: '', panNumber: '', tanNumber: '' });
}

function openCreateDialog() {
  resetForm();
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(org: any) {
  resetForm();
  isEditing.value = true;
  editingId.value = org.id;
  form.name = org.name;
  form.code = org.code;
  form.gstNumber = org.gstNumber || '';
  form.panNumber = org.panNumber || '';
  form.tanNumber = org.tanNumber || '';
  form.address = org.address || '';
  dialog.value = true;
}

function validateForm(): boolean {
  errors.name = form.name.trim() ? '' : 'Name is required';
  errors.code = !isEditing.value && !form.code.trim() ? 'Code is required' : '';
  return !errors.name && !errors.code;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await store.update(editingId.value, {
        name: form.name,
        gstNumber: form.gstNumber || undefined,
        panNumber: form.panNumber || undefined,
        tanNumber: form.tanNumber || undefined,
        address: form.address || undefined,
      });
      success('Organization updated successfully');
    } else {
      await store.create(form);
      success('Organization created successfully');
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save organization'));
  } finally {
    submitting.value = false;
  }
}

async function onToggleStatus(org: any) {
  try {
    await store.toggleStatus(org.id);
    success('Status updated successfully');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update status'));
  }
}

onMounted(fetchData);
</script>
