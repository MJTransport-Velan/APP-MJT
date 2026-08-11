<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Roles</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Role</AppBtn>
    </div>

    <AppCard>
      <AppCardText>
        <AppTextField
          v-model="search"
          label="Search roles"
          prepend-inner-icon="mdi-magnify"
          clearable
          @update:model-value="debouncedFetch"
        />
      </AppCardText>

      <AppDataTable
        v-model:items-per-page="pageSize"
        v-model:page="page"
        :headers="headers"
        :items="roleStore.items"
        :items-length="roleStore.meta?.total || 0"
        :loading="roleStore.loading"
        item-value="id"
        @update:options="fetchRoles"
      >
        <template #item.name="{ item }">
          <div class="font-weight-medium">{{ item.name }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.description }}</div>
        </template>

        <template #item.permissions="{ item }">
          <span class="text-body-2">{{ item.permissions.length }} permission(s)</span>
        </template>

        <template #item.userCount="{ item }">
          <AppChip size="small">{{ item.userCount }} user(s)</AppChip>
        </template>

        <template #item.actions="{ item }">
          <AppBtn icon="mdi-shield-key-outline" variant="text" size="small" @click="openPermissionsDialog(item)" />
          <AppBtn icon="mdi-content-copy" variant="text" size="small" @click="openCloneDialog(item)" />
          <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditDialog(item)" />
          <AppBtn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            :disabled="item.name === 'SUPER_ADMIN'"
            @click="openDeleteConfirm(item)"
          />
        </template>
      </AppDataTable>
    </AppCard>

    <!-- Create / Edit Dialog -->
    <AppDialog v-model="dialog" max-width="480" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">{{ isEditing ? 'Edit Role' : 'New Role' }}</AppCardTitle>
        <AppCardText>
          <AppTextField v-model="form.name" label="Role Name" :error-messages="formErrors.name" class="mb-2" />
          <AppTextarea v-model="form.description" label="Description" rows="2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="dialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmit">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Clone Dialog -->
    <AppDialog v-model="cloneDialog" max-width="480" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Clone Role</AppCardTitle>
        <AppCardText>
          <p class="text-body-2 mb-3">
            Create a new role with the same permissions as <strong>{{ cloneSource?.name }}</strong>.
          </p>
          <AppTextField v-model="cloneName" label="New Role Name" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="cloneDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="cloning" @click="submitClone">Clone</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Assign Permissions Dialog -->
    <AppDialog v-model="permissionsDialog" max-width="700" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Permissions — {{ permissionsTarget?.name }}</AppCardTitle>
        <AppCardText style="max-height: 480px; overflow-y: auto">
          <div v-for="group in permissionStore.groups" :key="group.module" class="mb-4">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-subtitle-2 text-capitalize">{{ group.module }}</span>
              <AppBtn size="x-small" variant="text" @click="toggleGroup(group)">Toggle All</AppBtn>
            </div>
            <div class="row row-dense">
              <div v-for="perm in group.permissions" :key="perm.id" class="col-12 col-sm-6">
                <AppCheckbox
                  :model-value="selectedPermissionIds.includes(perm.id)"
                  :label="perm.name"
                  @update:model-value="(checked) => togglePermission(perm.id, checked)"
                />
              </div>
            </div>
            <AppDivider class="mt-2" />
          </div>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="permissionsDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="savingPermissions" @click="submitPermissions">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Role"
      :message="`Delete role '${deleteTarget?.name}'? This cannot be undone.`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useAdminRoleStore } from '@/stores/admin-role.store';
import { useAdminPermissionStore } from '@/stores/admin-permission.store';
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
  AppDataTable,
  AppChip,
  AppDialog,
  AppCheckbox,
  AppDivider,
} from '@/components/ui';
import type { AdminRole, AdminPermissionGroup } from '@/types/admin.types';

const roleStore = useAdminRoleStore();
const permissionStore = useAdminPermissionStore();
const { success, error } = useSnackbar();

const search = ref('');
const page = ref(1);
const pageSize = ref(10);

const headers = [
  { title: 'Role', key: 'name', sortable: false },
  { title: 'Permissions', key: 'permissions', sortable: false },
  { title: 'Users', key: 'userCount', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchRoles, 350);
}

async function fetchRoles() {
  await roleStore.fetchList({ page: page.value, pageSize: pageSize.value, search: search.value || undefined });
}

// --- Create / Edit ---
const dialog = ref(false);
const isEditing = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ name: '', description: '' });
const formErrors = reactive({ name: '' });

function openCreateDialog() {
  form.name = '';
  form.description = '';
  formErrors.name = '';
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(role: AdminRole) {
  form.name = role.name;
  form.description = role.description || '';
  formErrors.name = '';
  isEditing.value = true;
  editingId.value = role.id;
  dialog.value = true;
}

async function onSubmit() {
  formErrors.name = form.name.trim().length < 3 ? 'Role name must be at least 3 characters' : '';
  if (formErrors.name) return;

  submitting.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await roleStore.update(editingId.value, { name: form.name, description: form.description });
      success('Role updated successfully');
    } else {
      await roleStore.create({ name: form.name, description: form.description });
      success('Role created successfully');
    }
    dialog.value = false;
    fetchRoles();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save role'));
  } finally {
    submitting.value = false;
  }
}

// --- Clone ---
const cloneDialog = ref(false);
const cloneSource = ref<AdminRole | null>(null);
const cloneName = ref('');
const cloning = ref(false);

function openCloneDialog(role: AdminRole) {
  cloneSource.value = role;
  cloneName.value = `${role.name}_COPY`;
  cloneDialog.value = true;
}

async function submitClone() {
  if (!cloneSource.value) return;
  cloning.value = true;
  try {
    await roleStore.clone(cloneSource.value.id, { name: cloneName.value });
    success('Role cloned successfully');
    cloneDialog.value = false;
    fetchRoles();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to clone role'));
  } finally {
    cloning.value = false;
  }
}

// --- Assign Permissions ---
const permissionsDialog = ref(false);
const permissionsTarget = ref<AdminRole | null>(null);
const selectedPermissionIds = ref<string[]>([]);
const savingPermissions = ref(false);

async function openPermissionsDialog(role: AdminRole) {
  permissionsTarget.value = role;
  selectedPermissionIds.value = role.permissions.map((p) => p.id);
  if (permissionStore.groups.length === 0) {
    await permissionStore.fetchGrouped();
  }
  permissionsDialog.value = true;
}

function togglePermission(id: string, checked: boolean) {
  if (checked) {
    if (!selectedPermissionIds.value.includes(id)) {
      selectedPermissionIds.value = [...selectedPermissionIds.value, id];
    }
  } else {
    selectedPermissionIds.value = selectedPermissionIds.value.filter((pid) => pid !== id);
  }
}

function toggleGroup(group: AdminPermissionGroup) {
  const groupIds = group.permissions.map((p) => p.id);
  const allSelected = groupIds.every((id) => selectedPermissionIds.value.includes(id));
  if (allSelected) {
    selectedPermissionIds.value = selectedPermissionIds.value.filter((id) => !groupIds.includes(id));
  } else {
    selectedPermissionIds.value = Array.from(new Set([...selectedPermissionIds.value, ...groupIds]));
  }
}

async function submitPermissions() {
  if (!permissionsTarget.value) return;
  savingPermissions.value = true;
  try {
    await roleStore.assignPermissions(permissionsTarget.value.id, selectedPermissionIds.value);
    success('Permissions updated successfully');
    permissionsDialog.value = false;
    fetchRoles();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update permissions'));
  } finally {
    savingPermissions.value = false;
  }
}

// --- Delete ---
const deleteDialog = ref(false);
const deleteTarget = ref<AdminRole | null>(null);
const deleting = ref(false);

function openDeleteConfirm(role: AdminRole) {
  deleteTarget.value = role;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await roleStore.remove(deleteTarget.value.id);
    success('Role deleted successfully');
    deleteDialog.value = false;
    fetchRoles();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete role'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}
</script>
