<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Teams</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Team</AppBtn>
    </div>

    <AppCard>
      <AppCardText>
        <div class="row row-dense">
          <div class="col-12 col-sm-6">
            <AppTextField
              v-model="search"
              label="Search teams"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
              @update:model-value="debouncedFetch"
            />
          </div>
          <div class="col-12 col-sm-6">
            <AppSelect
              v-model="departmentFilter"
              :items="departmentOptions"
              item-title="name"
              item-value="id"
              label="Department"
              clearable
              hide-details
              @update:model-value="fetchTeams"
            />
          </div>
        </div>
      </AppCardText>

      <AppDataTable
        v-model:items-per-page="pageSize"
        v-model:page="page"
        :headers="headers"
        :items="teamStore.items"
        :items-length="teamStore.meta?.total || 0"
        :loading="teamStore.loading"
        item-value="id"
        @update:options="fetchTeams"
      >
        <template #item.name="{ item }">
          <div class="font-weight-medium">{{ item.name }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.description }}</div>
        </template>

        <template #item.department="{ item }">
          <AppChip size="small" variant="outlined">{{ item.department.name }}</AppChip>
        </template>

        <template #item.memberCount="{ item }">
          <AppChip size="small">{{ item.memberCount }} member(s)</AppChip>
        </template>

        <template #item.actions="{ item }">
          <AppBtn icon="mdi-account-multiple-outline" variant="text" size="small" @click="openMembersDialog(item)" />
          <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditDialog(item)" />
          <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="openDeleteConfirm(item)" />
        </template>
      </AppDataTable>
    </AppCard>

    <!-- Create / Edit -->
    <AppDialog v-model="dialog" max-width="480" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">{{ isEditing ? 'Edit Team' : 'New Team' }}</AppCardTitle>
        <AppCardText>
          <AppTextField v-model="form.name" label="Team Name" :error-messages="formErrors.name" class="mb-2" />
          <AppSelect
            v-model="form.departmentId"
            :items="departmentOptions"
            item-title="name"
            item-value="id"
            label="Department"
            :error-messages="formErrors.departmentId"
            class="mb-2"
          />
          <AppTextarea v-model="form.description" label="Description" rows="2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="dialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmit">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Members -->
    <AppDialog v-model="membersDialog" max-width="520" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Members — {{ membersTarget?.name }}</AppCardTitle>
        <AppCardText>
          <AppSelect
            v-model="selectedMemberIds"
            :items="userOptions"
            item-title="fullName"
            item-value="id"
            label="Team Members"
            multiple
            chips
          />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="membersDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="savingMembers" @click="submitMembers">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Team"
      :message="`Delete team '${deleteTarget?.name}'? Members must be reassigned first.`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAdminTeamStore } from '@/stores/admin-team.store';
import { adminDepartmentApi } from '@/services/admin-department.service';
import { adminUserApi } from '@/services/admin-user.service';
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
  AppSelect,
  AppChip,
  AppDialog,
  AppDataTable,
} from '@/components/ui';
import type { AdminTeam } from '@/types/admin.types';

const teamStore = useAdminTeamStore();
const { success, error } = useSnackbar();

const search = ref('');
const departmentFilter = ref<string | null>(null);
const page = ref(1);
const pageSize = ref(10);

const departmentOptions = ref<{ id: string; name: string }[]>([]);
const userOptions = ref<{ id: string; fullName: string }[]>([]);

const headers = [
  { title: 'Team', key: 'name', sortable: false },
  { title: 'Department', key: 'department', sortable: false },
  { title: 'Members', key: 'memberCount', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchTeams, 350);
}

async function fetchTeams() {
  await teamStore.fetchList({
    page: page.value,
    pageSize: pageSize.value,
    search: search.value || undefined,
    departmentId: departmentFilter.value || undefined,
  });
}

// --- Create / Edit ---
const dialog = ref(false);
const isEditing = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ name: '', departmentId: '', description: '' });
const formErrors = reactive({ name: '', departmentId: '' });

function openCreateDialog() {
  form.name = '';
  form.departmentId = '';
  form.description = '';
  formErrors.name = '';
  formErrors.departmentId = '';
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(team: AdminTeam) {
  form.name = team.name;
  form.departmentId = team.department.id;
  form.description = team.description || '';
  formErrors.name = '';
  formErrors.departmentId = '';
  isEditing.value = true;
  editingId.value = team.id;
  dialog.value = true;
}

async function onSubmit() {
  formErrors.name = form.name.trim().length < 2 ? 'Team name must be at least 2 characters' : '';
  formErrors.departmentId = form.departmentId ? '' : 'Department is required';
  if (formErrors.name || formErrors.departmentId) return;

  submitting.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await teamStore.update(editingId.value, {
        name: form.name,
        departmentId: form.departmentId,
        description: form.description,
      });
      success('Team updated successfully');
    } else {
      await teamStore.create({ name: form.name, departmentId: form.departmentId, description: form.description });
      success('Team created successfully');
    }
    dialog.value = false;
    fetchTeams();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save team'));
  } finally {
    submitting.value = false;
  }
}

// --- Members ---
const membersDialog = ref(false);
const membersTarget = ref<AdminTeam | null>(null);
const selectedMemberIds = ref<string[]>([]);
const savingMembers = ref(false);

async function openMembersDialog(team: AdminTeam) {
  const detail = await teamStore.getById(team.id);
  membersTarget.value = detail;
  selectedMemberIds.value = (detail.members || []).map((m) => m.id);
  membersDialog.value = true;
}

async function submitMembers() {
  if (!membersTarget.value) return;
  savingMembers.value = true;
  try {
    await teamStore.assignMembers(membersTarget.value.id, selectedMemberIds.value);
    success('Team members updated successfully');
    membersDialog.value = false;
    fetchTeams();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update team members'));
  } finally {
    savingMembers.value = false;
  }
}

// --- Delete ---
const deleteDialog = ref(false);
const deleteTarget = ref<AdminTeam | null>(null);
const deleting = ref(false);

function openDeleteConfirm(team: AdminTeam) {
  deleteTarget.value = team;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await teamStore.remove(deleteTarget.value.id);
    success('Team deleted successfully');
    deleteDialog.value = false;
    fetchTeams();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete team'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  const [deptRes, usersRes] = await Promise.all([
    adminDepartmentApi.list({ pageSize: 100 }),
    adminUserApi.list({ pageSize: 200 }),
  ]);
  departmentOptions.value = deptRes.data.data.map((d) => ({ id: d.id, name: d.name }));
  userOptions.value = usersRes.data.data.map((u) => ({ id: u.id, fullName: `${u.fullName} (@${u.username})` }));
  fetchTeams();
});
</script>
