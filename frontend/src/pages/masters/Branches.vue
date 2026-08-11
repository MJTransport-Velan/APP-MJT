<template>
  <div>
    <MasterToolbar title="Branches" :can-create="canCreate" @create="openCreateDialog" />

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
      <template #item.company="{ item }">
        {{ (item as any).company?.name }}
      </template>
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
        <AppBtn icon="mdi-delete-outline" variant="text" size="small" :disabled="!canDelete" @click="openDeleteConfirm(item as any)" />
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="dialog" :title="isEditing ? 'Edit Branch' : 'New Branch'" :loading="submitting" @submit="onSubmit">
      <AppSelect
        v-model="form.companyId"
        :items="companyOptions"
        item-title="name"
        item-value="id"
        label="Company"
        :disabled="isEditing"
        :error-messages="errors.companyId"
        class="mb-2"
      />
      <AppTextField v-model="form.name" label="Branch Name" :error-messages="errors.name" class="mb-2" />
      <AppTextField v-model="form.code" label="Branch Code" :disabled="isEditing" :error-messages="errors.code" class="mb-2" />
      <AppTextField v-model="form.address" label="Address" class="mb-2" />
      <AppTextField v-model="form.phone" label="Phone" class="mb-2" />
      <AppTextField v-model="form.email" label="Email" :error-messages="errors.email" class="mb-2" />
    </MasterFormDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Branch"
      :message="`Delete branch '${deleteTarget?.name}'?`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useBranchStore } from '@/stores/masters';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { adminCompanyApi } from '@/services/admin-company.service';
import MasterToolbar from '@/components/masters/MasterToolbar.vue';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import StatusChip from '@/components/masters/StatusChip.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { AppBtn, AppSelect, AppTextField } from '@/components/ui';

const store = useBranchStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('branch.create');
const canEdit = authStore.hasPermission('branch.edit');
const canDelete = authStore.hasPermission('branch.delete');

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const companyOptions = ref<{ id: string; name: string }[]>([]);

const headers = [
  { title: 'Branch', key: 'name', sortable: false },
  { title: 'Code', key: 'code', sortable: false },
  { title: 'Company', key: 'company', sortable: false },
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
const form = reactive({ companyId: '', name: '', code: '', address: '', phone: '', email: '' });
const errors = reactive({ companyId: '', name: '', code: '', email: '' });

function resetForm() {
  Object.assign(form, { companyId: '', name: '', code: '', address: '', phone: '', email: '' });
  Object.assign(errors, { companyId: '', name: '', code: '', email: '' });
}

function openCreateDialog() {
  resetForm();
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(branch: any) {
  resetForm();
  isEditing.value = true;
  editingId.value = branch.id;
  form.companyId = branch.company?.id || '';
  form.name = branch.name;
  form.code = branch.code;
  form.address = branch.address || '';
  form.phone = branch.phone || '';
  form.email = branch.email || '';
  dialog.value = true;
}

function validateForm(): boolean {
  errors.companyId = form.companyId ? '' : 'Company is required';
  errors.name = form.name.trim() ? '' : 'Branch name is required';
  errors.code = !isEditing.value && !form.code.trim() ? 'Branch code is required' : '';
  errors.email = form.email && !/^\S+@\S+\.\S+$/.test(form.email) ? 'Invalid email' : '';
  return !errors.companyId && !errors.name && !errors.code && !errors.email;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await store.update(editingId.value, {
        name: form.name,
        address: form.address,
        phone: form.phone,
        email: form.email,
      });
      success('Branch updated successfully');
    } else {
      await store.create(form);
      success('Branch created successfully');
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save branch'));
  } finally {
    submitting.value = false;
  }
}

async function onToggleStatus(branch: any) {
  try {
    await store.toggleStatus(branch.id);
    success('Status updated successfully');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update status'));
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<any>(null);
const deleting = ref(false);

function openDeleteConfirm(branch: any) {
  deleteTarget.value = branch;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Branch deleted successfully');
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete branch'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  const companiesRes = await adminCompanyApi.list({ pageSize: 200 });
  companyOptions.value = companiesRes.data.data.map((c) => ({ id: c.id, name: c.name }));
  fetchData();
});
</script>
