<template>
  <div v-if="config">
    <MasterToolbar :title="config.label" :can-create="canCreate" @create="openCreateDialog" />

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
        <AppBtn
          icon="mdi-pencil-outline"
          variant="text"
          size="small"
          :disabled="!canEdit"
          @click="openEditDialog(item as Record<string, unknown>)"
        />
        <AppBtn
          :icon="(item as any).isActive ? 'mdi-toggle-switch-off-outline' : 'mdi-toggle-switch-outline'"
          variant="text"
          size="small"
          :disabled="!canEdit"
          @click="onToggleStatus(item as Record<string, unknown>)"
        />
        <AppBtn
          icon="mdi-delete-outline"
          variant="text"
          size="small"
          :disabled="!canDelete"
          @click="openDeleteConfirm(item as Record<string, unknown>)"
        />
      </template>
    </MasterDataTable>

    <MasterFormDialog
      v-model="dialog"
      :title="isEditing ? `Edit ${config.singularLabel}` : `New ${config.singularLabel}`"
      :loading="submitting"
      @submit="onSubmit"
    >
      <AppTextField
        v-model="(form[config.nameFieldKey] as string)"
        :label="config.nameFieldLabel"
        :error-messages="errors[config.nameFieldKey]"
        class="mb-2"
      />
      <AppTextField
        v-model="(form[codeFieldKey] as string)"
        label="Code"
        :disabled="isEditing"
        :error-messages="errors[codeFieldKey]"
        class="mb-2"
      />
      <template v-for="field in config.fields" :key="field.key">
        <AppTextarea
          v-if="field.type === 'textarea'"
          v-model="(form[field.key] as string)"
          :label="field.label"
          rows="2"
          :error-messages="errors[field.key]"
          class="mb-2"
        />
        <AppTextField
          v-else-if="field.type === 'number'"
          v-model.number="(form[field.key] as number)"
          type="number"
          :label="field.label"
          :error-messages="errors[field.key]"
          class="mb-2"
        />
        <AppTextField
          v-else-if="field.type === 'date'"
          v-model="(form[field.key] as string)"
          type="date"
          :label="field.label"
          :error-messages="errors[field.key]"
          class="mb-2"
        />
        <AppSelect
          v-else-if="field.type === 'select'"
          v-model="form[field.key]"
          :label="field.label"
          :items="field.options || []"
          item-title="title"
          item-value="value"
          :error-messages="errors[field.key]"
          class="mb-2"
        />
        <AppCheckbox
          v-else-if="field.type === 'boolean'"
          v-model="(form[field.key] as unknown as boolean)"
          :label="field.label"
          class="mb-2"
        />
        <AppTextField
          v-else
          v-model="(form[field.key] as string)"
          :label="field.label"
          :maxlength="field.key === 'phone' ? 10 : undefined"
          :error-messages="errors[field.key]"
          class="mb-2"
        />
      </template>
    </MasterFormDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Record"
      :message="`Delete '${deleteTarget ? deleteTarget[config.nameFieldKey] : ''}'? This cannot be undone.`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getSimpleMasterConfig } from '@/config/simpleMasterModules';
import { simpleMasterStoreMap } from '@/stores/masters';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterToolbar from '@/components/masters/MasterToolbar.vue';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import StatusChip from '@/components/masters/StatusChip.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { AppBtn, AppTextField, AppTextarea, AppSelect, AppCheckbox } from '@/components/ui';

const route = useRoute();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const routeKey = computed(() => route.params.module as string);
const config = computed(() => getSimpleMasterConfig(routeKey.value));
const store = computed(() => simpleMasterStoreMap[routeKey.value]());
const codeFieldKey = computed(() => config.value?.codeFieldKey || 'code');

const canCreate = computed(
  () => !!config.value && authStore.hasPermission(`${config.value.permissionPrefix}.create`)
);
const canEdit = computed(() => !!config.value && authStore.hasPermission(`${config.value.permissionPrefix}.edit`));
const canDelete = computed(
  () => !!config.value && authStore.hasPermission(`${config.value.permissionPrefix}.delete`)
);

const search = ref('');
const page = ref(1);
const pageSize = ref(10);

const headers = computed(() => {
  if (!config.value) return [];
  return [
    { title: config.value.nameFieldLabel, key: config.value.nameFieldKey, sortable: false },
    { title: 'Code', key: codeFieldKey.value, sortable: false },
    ...config.value.fields
      .filter((f) => f.type !== 'textarea')
      .map((f) => ({ title: f.label, key: f.key, sortable: false })),
    { title: 'Status', key: 'isActive', sortable: false },
    { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
  ];
});

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
  if (!config.value) return;
  await store.value.fetchList({ page: page.value, pageSize: pageSize.value, search: search.value || undefined });
}

// --- Create / Edit form ---
const dialog = ref(false);
const isEditing = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const form = reactive<Record<string, string | number | boolean | undefined>>({});
const errors = reactive<Record<string, string>>({});

function resetForm() {
  if (!config.value) return;
  Object.keys(form).forEach((k) => delete form[k]);
  Object.keys(errors).forEach((k) => delete errors[k]);
  form[config.value.nameFieldKey] = '';
  form[codeFieldKey.value] = '';
  config.value.fields.forEach((f) => {
    form[f.key] = f.type === 'number' ? undefined : f.type === 'boolean' ? false : '';
  });
}

function openCreateDialog() {
  resetForm();
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(item: Record<string, unknown>) {
  resetForm();
  isEditing.value = true;
  editingId.value = item.id as string;
  if (config.value) {
    form[config.value.nameFieldKey] = item[config.value.nameFieldKey] as string;
    form[codeFieldKey.value] = item[codeFieldKey.value] as string;
    config.value.fields.forEach((f) => {
      const value = item[f.key];
      const empty = f.type === 'number' ? undefined : f.type === 'boolean' ? false : '';
      form[f.key] = (value === null || value === undefined ? empty : value) as string | number | boolean;
    });
  }
  dialog.value = true;
}

function validateForm(): boolean {
  if (!config.value) return false;
  Object.keys(errors).forEach((k) => delete errors[k]);
  let valid = true;

  if (!String(form[config.value.nameFieldKey] || '').trim()) {
    errors[config.value.nameFieldKey] = `${config.value.nameFieldLabel} is required`;
    valid = false;
  }
  if (!isEditing.value && !String(form[codeFieldKey.value] || '').trim()) {
    errors[codeFieldKey.value] = 'Code is required';
    valid = false;
  }
  for (const field of config.value.fields) {
    if (field.required && (form[field.key] === undefined || form[field.key] === '')) {
      errors[field.key] = `${field.label} is required`;
      valid = false;
    }
  }
  return valid;
}

async function onSubmit() {
  if (!config.value || !validateForm()) return;
  submitting.value = true;
  try {
    const payload: Record<string, unknown> = { [config.value.nameFieldKey]: form[config.value.nameFieldKey] };
    if (!isEditing.value) payload[codeFieldKey.value] = form[codeFieldKey.value];
    config.value.fields.forEach((f) => {
      if (form[f.key] !== '' && form[f.key] !== undefined) payload[f.key] = form[f.key];
    });

    if (isEditing.value && editingId.value) {
      await store.value.update(editingId.value, payload);
      success(`${config.value.singularLabel} updated successfully`);
    } else {
      await store.value.create(payload);
      success(`${config.value.singularLabel} created successfully`);
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, `Failed to save ${config.value.singularLabel}`));
  } finally {
    submitting.value = false;
  }
}

async function onToggleStatus(item: Record<string, unknown>) {
  try {
    await store.value.toggleStatus(item.id as string);
    success('Status updated successfully');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update status'));
  }
}

// --- Delete ---
const deleteDialog = ref(false);
const deleteTarget = ref<Record<string, unknown> | null>(null);
const deleting = ref(false);

function openDeleteConfirm(item: Record<string, unknown>) {
  deleteTarget.value = item;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value || !config.value) return;
  deleting.value = true;
  try {
    await store.value.remove(deleteTarget.value.id as string);
    success(`${config.value.singularLabel} deleted successfully`);
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, `Failed to delete ${config.value?.singularLabel}`));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

watch(routeKey, () => {
  page.value = 1;
  search.value = '';
  fetchData();
});

onMounted(fetchData);
</script>
