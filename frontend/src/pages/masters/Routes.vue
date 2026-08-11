<template>
  <div>
    <MasterToolbar title="Routes" :can-create="canCreate" @create="openCreateDialog" />

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
      <template #item.fromLocation="{ item }">
        {{ (item as any).fromLocation?.name }}
      </template>
      <template #item.toLocation="{ item }">
        {{ (item as any).toLocation?.name }}
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

    <MasterFormDialog v-model="dialog" :title="isEditing ? 'Edit Route' : 'New Route'" :loading="submitting" @submit="onSubmit">
      <AppTextField v-model="form.name" label="Route Name" :error-messages="errors.name" class="mb-2" />
      <AppTextField v-model="form.code" label="Route Code" :disabled="isEditing" :error-messages="errors.code" class="mb-2" />
      <AppSelect
        v-model="form.fromLocationId"
        :items="locationOptions"
        item-title="name"
        item-value="id"
        label="Origin Location"
        :error-messages="errors.fromLocationId"
        class="mb-2"
      />
      <AppSelect
        v-model="form.toLocationId"
        :items="locationOptions"
        item-title="name"
        item-value="id"
        label="Destination Location"
        :error-messages="errors.toLocationId"
        class="mb-2"
      />
      <AppTextField v-model.number="form.distanceKm" type="number" label="Distance (km)" class="mb-2" />
    </MasterFormDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Route"
      :message="`Delete route '${deleteTarget?.name}'?`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouteStore, useLocationStore } from '@/stores/masters';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterToolbar from '@/components/masters/MasterToolbar.vue';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import StatusChip from '@/components/masters/StatusChip.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { AppBtn, AppTextField, AppSelect } from '@/components/ui';

const store = useRouteStore();
const locationStore = useLocationStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('route.create');
const canEdit = authStore.hasPermission('route.edit');
const canDelete = authStore.hasPermission('route.delete');

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const locationOptions = ref<{ id: string; name: string }[]>([]);

const headers = [
  { title: 'Route', key: 'name', sortable: false },
  { title: 'Code', key: 'code', sortable: false },
  { title: 'From', key: 'fromLocation', sortable: false },
  { title: 'To', key: 'toLocation', sortable: false },
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
const form = reactive<{ name: string; code: string; fromLocationId: string; toLocationId: string; distanceKm: number | undefined }>({
  name: '',
  code: '',
  fromLocationId: '',
  toLocationId: '',
  distanceKm: undefined,
});
const errors = reactive({ name: '', code: '', fromLocationId: '', toLocationId: '' });

function resetForm() {
  Object.assign(form, { name: '', code: '', fromLocationId: '', toLocationId: '', distanceKm: undefined });
  Object.assign(errors, { name: '', code: '', fromLocationId: '', toLocationId: '' });
}

function openCreateDialog() {
  resetForm();
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(route: any) {
  resetForm();
  isEditing.value = true;
  editingId.value = route.id;
  form.name = route.name;
  form.code = route.code;
  form.fromLocationId = route.fromLocation?.id || '';
  form.toLocationId = route.toLocation?.id || '';
  form.distanceKm = route.distanceKm ?? undefined;
  dialog.value = true;
}

function validateForm(): boolean {
  errors.name = form.name.trim() ? '' : 'Route name is required';
  errors.code = !isEditing.value && !form.code.trim() ? 'Route code is required' : '';
  errors.fromLocationId = form.fromLocationId ? '' : 'Origin location is required';
  errors.toLocationId = !form.toLocationId
    ? 'Destination location is required'
    : form.toLocationId === form.fromLocationId
    ? 'Origin and destination must be different'
    : '';
  return !errors.name && !errors.code && !errors.fromLocationId && !errors.toLocationId;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    const payload: Record<string, unknown> = {
      name: form.name,
      fromLocationId: form.fromLocationId,
      toLocationId: form.toLocationId,
      distanceKm: form.distanceKm,
    };
    if (isEditing.value && editingId.value) {
      await store.update(editingId.value, payload);
      success('Route updated successfully');
    } else {
      await store.create({ ...payload, code: form.code });
      success('Route created successfully');
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save route'));
  } finally {
    submitting.value = false;
  }
}

async function onToggleStatus(route: any) {
  try {
    await store.toggleStatus(route.id);
    success('Status updated successfully');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update status'));
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<any>(null);
const deleting = ref(false);

function openDeleteConfirm(route: any) {
  deleteTarget.value = route;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Route deleted successfully');
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete route'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  await locationStore.fetchList({ pageSize: 200 });
  locationOptions.value = locationStore.items.map((l: any) => ({ id: l.id, name: l.name }));
  fetchData();
});
</script>
