<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Users</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New User</AppBtn>
    </div>

    <AppCard>
      <AppCardText>
        <div class="row row-dense">
          <div class="col-12 col-sm-4">
            <AppTextField
              v-model="search"
              label="Search username, name, email"
              prepend-inner-icon="mdi-magnify"
              clearable
              @update:model-value="debouncedFetch"
            />
          </div>
          <div class="col-6 col-sm-3">
            <AppSelect
              v-model="statusFilter"
              :items="statusOptions"
              label="Status"
              clearable
              @update:model-value="fetchUsers"
            />
          </div>
          <div class="col-6 col-sm-3">
            <AppSelect
              v-model="roleFilter"
              :items="roleOptions"
              item-title="name"
              item-value="id"
              label="Role"
              clearable
              @update:model-value="fetchUsers"
            />
          </div>
        </div>
      </AppCardText>

      <AppDataTable
        v-model:items-per-page="pageSize"
        v-model:page="page"
        :headers="headers"
        :items="userStore.items"
        :items-length="userStore.meta?.total || 0"
        :loading="userStore.loading"
        item-value="id"
        @update:options="fetchUsers"
      >
        <template #item.fullName="{ item }">
          <div class="d-flex align-center ga-2">
            <AppAvatar size="32" color="primary">
              <img v-if="item.profilePhoto" :src="uploadUrl(item.profilePhoto)" class="app-img" />
              <span v-else class="text-caption text-white">{{ initials(item.fullName) }}</span>
            </AppAvatar>
            <div>
              <div class="font-weight-medium">{{ item.fullName }}</div>
              <div class="text-caption text-medium-emphasis">@{{ item.username }}</div>
            </div>
          </div>
        </template>

        <template #item.roles="{ item }">
          <AppChip v-for="role in item.roles" :key="role.id" size="x-small" class="mr-1 mb-1">{{ role.name }}</AppChip>
        </template>

        <template #item.isActive="{ item }">
          <AppChip :color="item.isActive ? 'success' : 'default'" size="small" variant="flat">
            {{ item.isActive ? 'Active' : 'Inactive' }}
          </AppChip>
        </template>

        <template #item.actions="{ item }">
          <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditDialog(item)" />
          <AppBtn icon="mdi-lock-reset" variant="text" size="small" @click="openResetDialog(item)" />
          <AppBtn
            :icon="item.isActive ? 'mdi-account-off-outline' : 'mdi-account-check-outline'"
            variant="text"
            size="small"
            @click="toggleActive(item)"
          />
          <AppBtn
            v-if="item.id !== authStore.user?.id"
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            color="error"
            title="Delete"
            @click="openDeleteDialog(item)"
          />
        </template>
      </AppDataTable>
    </AppCard>

    <!-- Create / Edit Dialog -->
    <AppDialog v-model="dialog" max-width="640" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">{{ isEditing ? 'Edit User' : 'New User' }}</AppCardTitle>
        <AppCardText>
          <form @submit.prevent="onSubmit">
            <div class="row">
              <div class="col-12 col-sm-6">
                <AppTextField v-model="form.fullName" label="Full Name" :error-messages="formErrors.fullName" />
              </div>
              <div class="col-12 col-sm-6">
                <AppTextField
                  v-model="form.username"
                  label="Username"
                  :disabled="isEditing"
                  :error-messages="formErrors.username"
                />
              </div>
              <div class="col-12 col-sm-6">
                <AppTextField v-model="form.email" label="Email" :error-messages="formErrors.email" />
              </div>
              <div class="col-12 col-sm-6">
                <AppTextField v-model="form.phone" label="Phone" maxlength="10" />
              </div>
              <div v-if="!isEditing" class="col-12 col-sm-6">
                <AppTextField
                  v-model="form.password"
                  label="Temporary Password"
                  type="password"
                  :error-messages="formErrors.password"
                />
              </div>
              <div class="col-12 col-sm-6">
                <AppSelect
                  v-model="form.roleIds"
                  :items="roleOptions"
                  item-title="name"
                  item-value="id"
                  label="Roles"
                  multiple
                />
              </div>
              <div class="col-12 col-sm-6">
                <AppSelect
                  v-model="form.teamIds"
                  :items="teamOptions"
                  item-title="name"
                  item-value="id"
                  label="Teams"
                  multiple
                />
              </div>
            </div>
          </form>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="dialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmit">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Reset Password Dialog -->
    <AppDialog v-model="resetDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Reset Password</AppCardTitle>
        <AppCardText>
          <p class="text-body-2 mb-3">Set a new password for <strong>{{ resetTarget?.username }}</strong>.</p>
          <AppTextField v-model="newPassword" type="password" label="New Password" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="resetDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="resetting" @click="submitResetPassword">Reset</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Delete -->
    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete User"
      :message="`Delete ${deleteTarget?.fullName || 'this user'} (@${deleteTarget?.username})? They will lose access immediately. This cannot be undone from here.`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAdminUserStore } from '@/stores/admin-user.store';
import { useAuthStore } from '@/stores/auth.store';
import { adminRoleApi } from '@/services/admin-role.service';
import { adminTeamApi } from '@/services/admin-team.service';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import {
  AppBtn,
  AppCard,
  AppCardText,
  AppCardTitle,
  AppCardActions,
  AppTextField,
  AppSelect,
  AppDataTable,
  AppChip,
  AppAvatar,
  AppDialog,
} from '@/components/ui';
import type { AdminUser } from '@/types/admin.types';

const userStore = useAdminUserStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

import { uploadUrl } from '@/utils/uploadUrl';

const search = ref('');
const statusFilter = ref<string | null>(null);
const roleFilter = ref<string | null>(null);
const page = ref(1);
const pageSize = ref(10);

const statusOptions = [
  { title: 'Active', value: 'true' },
  { title: 'Inactive', value: 'false' },
];

const roleOptions = ref<{ id: string; name: string }[]>([]);
const teamOptions = ref<{ id: string; name: string }[]>([]);

const headers = [
  { title: 'User', key: 'fullName', sortable: false },
  { title: 'Roles', key: 'roles', sortable: false },
  { title: 'Status', key: 'isActive', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchUsers, 350);
}

async function fetchUsers() {
  await userStore.fetchList({
    page: page.value,
    pageSize: pageSize.value,
    search: search.value || undefined,
    isActive: statusFilter.value === undefined || statusFilter.value === null ? undefined : statusFilter.value === 'true',
    roleId: roleFilter.value || undefined,
  });
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

// --- Create / Edit ---
const dialog = ref(false);
const isEditing = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  fullName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  roleIds: [] as string[],
  teamIds: [] as string[],
});

const formErrors = reactive({ fullName: '', username: '', email: '', password: '' });

function resetForm() {
  form.fullName = '';
  form.username = '';
  form.email = '';
  form.phone = '';
  form.password = '';
  form.roleIds = [];
  form.teamIds = [];
  formErrors.fullName = '';
  formErrors.username = '';
  formErrors.email = '';
  formErrors.password = '';
}

function openCreateDialog() {
  resetForm();
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(user: AdminUser) {
  resetForm();
  isEditing.value = true;
  editingId.value = user.id;
  form.fullName = user.fullName;
  form.username = user.username;
  form.email = user.email || '';
  form.phone = user.phone || '';
  form.roleIds = user.roles.map((r) => r.id);
  form.teamIds = user.teams.map((t) => t.id);
  dialog.value = true;
}

function validateForm(): boolean {
  formErrors.fullName = form.fullName.trim() ? '' : 'Full name is required';
  formErrors.username = !isEditing.value && form.username.trim().length < 3 ? 'Username must be at least 3 characters' : '';
  formErrors.email = form.email && !/^\S+@\S+\.\S+$/.test(form.email) ? 'Invalid email' : '';
  formErrors.password = !isEditing.value && form.password.length < 6 ? 'Password must be at least 6 characters' : '';
  return !formErrors.fullName && !formErrors.username && !formErrors.email && !formErrors.password;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await userStore.update(editingId.value, {
        fullName: form.fullName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        roleIds: form.roleIds,
        teamIds: form.teamIds,
      });
      success('User updated successfully');
    } else {
      await userStore.create({
        fullName: form.fullName,
        username: form.username,
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
        roleIds: form.roleIds,
        teamIds: form.teamIds,
      });
      success('User created successfully');
    }
    dialog.value = false;
    fetchUsers();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save user'));
  } finally {
    submitting.value = false;
  }
}

// --- Activate / Deactivate ---
async function toggleActive(user: AdminUser) {
  try {
    if (user.isActive) {
      await userStore.deactivate(user.id);
      success(`${user.username} deactivated`);
    } else {
      await userStore.activate(user.id);
      success(`${user.username} activated`);
    }
    fetchUsers();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update user status'));
  }
}

// --- Reset Password ---
const resetDialog = ref(false);
const resetTarget = ref<AdminUser | null>(null);
const newPassword = ref('');
const resetting = ref(false);

function openResetDialog(user: AdminUser) {
  resetTarget.value = user;
  newPassword.value = '';
  resetDialog.value = true;
}

async function submitResetPassword() {
  if (!resetTarget.value || newPassword.value.length < 6) {
    error('Password must be at least 6 characters');
    return;
  }
  resetting.value = true;
  try {
    await userStore.resetPassword(resetTarget.value.id, newPassword.value);
    success('Password reset successfully');
    resetDialog.value = false;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reset password'));
  } finally {
    resetting.value = false;
  }
}

// --- Delete ---
const deleteDialog = ref(false);
const deleteTarget = ref<AdminUser | null>(null);
const deleting = ref(false);

function openDeleteDialog(user: AdminUser) {
  deleteTarget.value = user;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await userStore.remove(deleteTarget.value.id);
    success(`${deleteTarget.value.username} deleted`);
    deleteDialog.value = false;
    fetchUsers();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete user'));
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  const [rolesRes, teamsRes] = await Promise.all([
    adminRoleApi.list({ pageSize: 100 }),
    adminTeamApi.list({ pageSize: 100 }),
  ]);
  roleOptions.value = rolesRes.data.data.map((r) => ({ id: r.id, name: r.name }));
  teamOptions.value = teamsRes.data.data.map((t) => ({ id: t.id, name: t.name }));
  fetchUsers();
});
</script>

<style scoped>
.app-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
