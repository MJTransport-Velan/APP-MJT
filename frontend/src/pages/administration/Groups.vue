<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Groups</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Group</AppBtn>
    </div>

    <AppCard>
      <AppCardText>
        <AppTextField
          v-model="search"
          label="Search groups"
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
        :items="groupStore.items"
        :items-length="groupStore.meta?.total || 0"
        :loading="groupStore.loading"
        item-value="id"
        @update:options="fetchGroups"
      >
        <template #item.name="{ item }">
          <div class="font-weight-medium">{{ item.name }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.description }}</div>
        </template>

        <template #item.companyCount="{ item }">
          <AppChip size="small">{{ item.companyCount }} compan{{ item.companyCount === 1 ? 'y' : 'ies' }}</AppChip>
        </template>

        <template #item.memberCount="{ item }">
          <AppChip size="small">{{ item.memberCount }} member(s)</AppChip>
        </template>

        <template #item.actions="{ item }">
          <AppBtn icon="mdi-domain" variant="text" size="small" @click="openCompaniesDialog(item)" />
          <AppBtn icon="mdi-account-multiple-outline" variant="text" size="small" @click="openMembersDialog(item)" />
          <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditDialog(item)" />
          <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="openDeleteConfirm(item)" />
        </template>
      </AppDataTable>
    </AppCard>

    <!-- Create / Edit -->
    <AppDialog v-model="dialog" max-width="480" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">{{ isEditing ? 'Edit Group' : 'New Group' }}</AppCardTitle>
        <AppCardText>
          <AppTextField v-model="form.name" label="Group Name" :error-messages="formErrors.name" class="mb-2" />
          <AppTextarea v-model="form.description" label="Description" rows="2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="dialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmit">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Companies -->
    <AppDialog v-model="companiesDialog" max-width="560" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Companies — {{ companiesTarget?.name }}</AppCardTitle>
        <AppCardText>
          <p class="text-caption text-medium-emphasis mb-2">
            Picking a company already in another group moves it here.
          </p>
          <AppSelect
            v-model="selectedCompanyIds"
            :items="companyOptions"
            item-title="label"
            item-value="id"
            label="Companies"
            multiple
            chips
          />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="companiesDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="savingCompanies" @click="submitCompanies">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Members -->
    <AppDialog v-model="membersDialog" max-width="640" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Members — {{ membersTarget?.name }}</AppCardTitle>
        <AppCardText>
          <p class="text-caption text-medium-emphasis mb-2">
            A person belongs to only one group at a time — adding them here moves them out of any other group.
          </p>
          <AppSelect
            v-model="selectedIntentCreatorIds"
            :items="usersByRole.INTENT_CREATOR"
            item-title="fullName"
            item-value="id"
            label="Intent Creators"
            multiple
            chips
            class="mb-2"
          />
          <AppSelect
            v-model="selectedOwnFleetIds"
            :items="usersByRole.OWN_FLEET_OPERATOR"
            item-title="fullName"
            item-value="id"
            label="Own Fleet Operators"
            multiple
            chips
            class="mb-2"
          />
          <AppSelect
            v-model="selectedMarketFleetIds"
            :items="usersByRole.MARKET_FLEET_OPERATOR"
            item-title="fullName"
            item-value="id"
            label="Market Fleet Operators"
            multiple
            chips
            class="mb-2"
          />
          <AppSelect
            v-model="selectedAccountsExecutiveIds"
            :items="usersByRole.ACCOUNTS_EXECUTIVE"
            item-title="fullName"
            item-value="id"
            label="Accounts Executives"
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
      title="Delete Group"
      :message="`Delete group '${deleteTarget?.name}'? Companies and members must be moved out first.`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAdminGroupStore } from '@/stores/admin-group.store';
import { adminUserApi } from '@/services/admin-user.service';
import { adminCompanyApi } from '@/services/admin-company.service';
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
import type { AdminGroup, AdminUser } from '@/types/admin.types';

const groupStore = useAdminGroupStore();
const { success, error } = useSnackbar();

const search = ref('');
const page = ref(1);
const pageSize = ref(10);

const allUsers = ref<AdminUser[]>([]);
const companyOptions = ref<{ id: string; label: string }[]>([]);

const usersByRole = computed(() => {
  const buckets: Record<'INTENT_CREATOR' | 'OWN_FLEET_OPERATOR' | 'MARKET_FLEET_OPERATOR' | 'ACCOUNTS_EXECUTIVE', { id: string; fullName: string }[]> = {
    INTENT_CREATOR: [],
    OWN_FLEET_OPERATOR: [],
    MARKET_FLEET_OPERATOR: [],
    ACCOUNTS_EXECUTIVE: [],
  };
  for (const user of allUsers.value) {
    const roleNames = user.roles.map((r) => r.name);
    for (const bucket of Object.keys(buckets) as (keyof typeof buckets)[]) {
      if (roleNames.includes(bucket)) {
        buckets[bucket].push({ id: user.id, fullName: `${user.fullName} (@${user.username})` });
      }
    }
  }
  return buckets;
});

const headers = [
  { title: 'Group', key: 'name', sortable: false },
  { title: 'Companies', key: 'companyCount', sortable: false },
  { title: 'Members', key: 'memberCount', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchGroups, 350);
}

async function fetchGroups() {
  await groupStore.fetchList({ page: page.value, pageSize: pageSize.value, search: search.value || undefined });
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

function openEditDialog(group: AdminGroup) {
  form.name = group.name;
  form.description = group.description || '';
  formErrors.name = '';
  isEditing.value = true;
  editingId.value = group.id;
  dialog.value = true;
}

async function onSubmit() {
  formErrors.name = form.name.trim().length < 2 ? 'Group name must be at least 2 characters' : '';
  if (formErrors.name) return;

  submitting.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await groupStore.update(editingId.value, { name: form.name, description: form.description });
      success('Group updated successfully');
    } else {
      await groupStore.create({ name: form.name, description: form.description });
      success('Group created successfully');
    }
    dialog.value = false;
    fetchGroups();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save group'));
  } finally {
    submitting.value = false;
  }
}

// --- Companies ---
const companiesDialog = ref(false);
const companiesTarget = ref<AdminGroup | null>(null);
const selectedCompanyIds = ref<string[]>([]);
const savingCompanies = ref(false);

async function refreshCompanyOptions() {
  const res = await adminCompanyApi.list({ pageSize: 500 });
  companyOptions.value = res.data.data.map((c) => ({ id: c.id, label: `${c.name} (${c.group.name})` }));
}

async function openCompaniesDialog(group: AdminGroup) {
  await refreshCompanyOptions();
  const detail = await groupStore.getById(group.id);
  companiesTarget.value = detail;
  selectedCompanyIds.value = (detail.companies || []).map((c) => c.id);
  companiesDialog.value = true;
}

async function submitCompanies() {
  if (!companiesTarget.value) return;
  savingCompanies.value = true;
  try {
    await groupStore.setCompanies(companiesTarget.value.id, selectedCompanyIds.value);
    success('Group companies updated successfully');
    companiesDialog.value = false;
    fetchGroups();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update group companies'));
  } finally {
    savingCompanies.value = false;
  }
}

// --- Members ---
const membersDialog = ref(false);
const membersTarget = ref<AdminGroup | null>(null);
const selectedIntentCreatorIds = ref<string[]>([]);
const selectedOwnFleetIds = ref<string[]>([]);
const selectedMarketFleetIds = ref<string[]>([]);
const selectedAccountsExecutiveIds = ref<string[]>([]);
const savingMembers = ref(false);

async function openMembersDialog(group: AdminGroup) {
  if (allUsers.value.length === 0) {
    const res = await adminUserApi.list({ pageSize: 500 });
    allUsers.value = res.data.data;
  }
  const detail = await groupStore.getById(group.id);
  membersTarget.value = detail;
  const memberIds = new Set((detail.members || []).map((m) => m.id));
  selectedIntentCreatorIds.value = usersByRole.value.INTENT_CREATOR.filter((u) => memberIds.has(u.id)).map((u) => u.id);
  selectedOwnFleetIds.value = usersByRole.value.OWN_FLEET_OPERATOR.filter((u) => memberIds.has(u.id)).map((u) => u.id);
  selectedMarketFleetIds.value = usersByRole.value.MARKET_FLEET_OPERATOR.filter((u) => memberIds.has(u.id)).map((u) => u.id);
  selectedAccountsExecutiveIds.value = usersByRole.value.ACCOUNTS_EXECUTIVE.filter((u) => memberIds.has(u.id)).map((u) => u.id);
  membersDialog.value = true;
}

async function submitMembers() {
  if (!membersTarget.value) return;
  savingMembers.value = true;
  try {
    const desiredIds = new Set([
      ...selectedIntentCreatorIds.value,
      ...selectedOwnFleetIds.value,
      ...selectedMarketFleetIds.value,
      ...selectedAccountsExecutiveIds.value,
    ]);
    const previousIds = new Set((membersTarget.value.members || []).map((m) => m.id));
    const toRemove = [...previousIds].filter((id) => !desiredIds.has(id));

    if (desiredIds.size > 0) {
      await groupStore.setMembers(membersTarget.value.id, [...desiredIds]);
    }
    for (const userId of toRemove) {
      await groupStore.removeMember(membersTarget.value.id, userId);
    }

    success('Group members updated successfully');
    membersDialog.value = false;
    fetchGroups();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update group members'));
  } finally {
    savingMembers.value = false;
  }
}

// --- Delete ---
const deleteDialog = ref(false);
const deleteTarget = ref<AdminGroup | null>(null);
const deleting = ref(false);

function openDeleteConfirm(group: AdminGroup) {
  deleteTarget.value = group;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await groupStore.remove(deleteTarget.value.id);
    success('Group deleted successfully');
    deleteDialog.value = false;
    fetchGroups();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete group'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  fetchGroups();
});
</script>
