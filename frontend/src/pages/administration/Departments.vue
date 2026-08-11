<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Departments</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Department</AppBtn>
    </div>

    <AppCard>
      <AppCardText>
        <AppTextField
          v-model="search"
          label="Search departments"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
          @update:model-value="debouncedFetch"
        />
      </AppCardText>

      <AppDataTable
        v-model:items-per-page="pageSize"
        v-model:page="page"
        :headers="headers"
        :items="departmentStore.items"
        :items-length="departmentStore.meta?.total || 0"
        :loading="departmentStore.loading"
        item-value="id"
        @update:options="fetchDepartments"
      >
        <template #item.name="{ item }">
          <div class="font-weight-medium">{{ item.name }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.description }}</div>
        </template>

        <template #item.teamCount="{ item }">
          <AppChip size="small">{{ item.teamCount }} team(s)</AppChip>
        </template>

        <template #item.isActive="{ item }">
          <AppChip :color="item.isActive ? 'success' : 'default'" size="small" variant="flat">
            {{ item.isActive ? 'Active' : 'Inactive' }}
          </AppChip>
        </template>

        <template #item.actions="{ item }">
          <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditDialog(item)" />
          <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="openDeleteConfirm(item)" />
        </template>
      </AppDataTable>
    </AppCard>

    <AppDialog v-model="dialog" max-width="480" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">{{ isEditing ? 'Edit Department' : 'New Department' }}</AppCardTitle>
        <AppCardText>
          <AppTextField v-model="form.name" label="Department Name" :error-messages="formErrors.name" class="mb-2" />
          <AppTextarea v-model="form.description" label="Description" rows="2" class="mb-2" />
          <AppSwitch v-if="isEditing" v-model="form.isActive" label="Active" color="primary" hide-details />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="dialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmit">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Department"
      :message="`Delete department '${deleteTarget?.name}'? Teams must be reassigned or removed first.`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useAdminDepartmentStore } from '@/stores/admin-department.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import {
  AppBtn,
  AppCard,
  AppCardText,
  AppCardTitle,
  AppCardActions,
  AppTextField,
  AppTextarea,
  AppSwitch,
  AppChip,
  AppDialog,
  AppDataTable,
} from '@/components/ui';
import type { AdminDepartment } from '@/types/admin.types';

const departmentStore = useAdminDepartmentStore();
const { success, error } = useSnackbar();

const search = ref('');
const page = ref(1);
const pageSize = ref(10);

const headers = [
  { title: 'Department', key: 'name', sortable: false },
  { title: 'Teams', key: 'teamCount', sortable: false },
  { title: 'Status', key: 'isActive', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchDepartments, 350);
}

async function fetchDepartments() {
  await departmentStore.fetchList({ page: page.value, pageSize: pageSize.value, search: search.value || undefined });
}

const dialog = ref(false);
const isEditing = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ name: '', description: '', isActive: true });
const formErrors = reactive({ name: '' });

function openCreateDialog() {
  form.name = '';
  form.description = '';
  form.isActive = true;
  formErrors.name = '';
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(department: AdminDepartment) {
  form.name = department.name;
  form.description = department.description || '';
  form.isActive = department.isActive;
  formErrors.name = '';
  isEditing.value = true;
  editingId.value = department.id;
  dialog.value = true;
}

async function onSubmit() {
  formErrors.name = form.name.trim().length < 2 ? 'Department name must be at least 2 characters' : '';
  if (formErrors.name) return;

  submitting.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await departmentStore.update(editingId.value, {
        name: form.name,
        description: form.description,
        isActive: form.isActive,
      });
      success('Department updated successfully');
    } else {
      await departmentStore.create({ name: form.name, description: form.description });
      success('Department created successfully');
    }
    dialog.value = false;
    fetchDepartments();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save department'));
  } finally {
    submitting.value = false;
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<AdminDepartment | null>(null);
const deleting = ref(false);

function openDeleteConfirm(department: AdminDepartment) {
  deleteTarget.value = department;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await departmentStore.remove(deleteTarget.value.id);
    success('Department deleted successfully');
    deleteDialog.value = false;
    fetchDepartments();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete department'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}
</script>
