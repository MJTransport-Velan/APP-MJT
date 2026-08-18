<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Groups</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Group</AppBtn>
    </div>

    <div class="row">
      <!-- Groups list -->
      <div class="col-12 col-md-4">
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
          <AppList>
            <AppListItem
              v-for="g in groupStore.items"
              :key="g.id"
              :active="selectedGroupId === g.id"
              @click="selectGroup(g)"
            >
              <div class="flex-1">
                <div class="font-weight-medium">{{ g.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ g.companyCount }} companies &middot; {{ g.memberCount }} member(s)</div>
              </div>
              <template #append>
                <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click.stop="openEditDialog(g)" />
                <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click.stop="openDeleteConfirm(g)" />
              </template>
            </AppListItem>
            <p v-if="!groupStore.loading && groupStore.items.length === 0" class="text-caption text-medium-emphasis pa-4">No groups found.</p>
          </AppList>
        </AppCard>
      </div>

      <!-- Selected group detail — in page, no dialog -->
      <div class="col-12 col-md-8">
        <AppCard v-if="!selectedGroupId" class="pa-8 text-center text-medium-emphasis">
          Select a group on the left to manage its companies and members.
        </AppCard>

        <AppCard v-else class="pa-4">
          <div v-if="detailLoading" class="d-flex justify-center pa-6"><AppProgressCircular indeterminate color="primary" size="32" /></div>
          <template v-else-if="selectedGroupDetail">
            <div class="text-h6 mb-1">{{ selectedGroupDetail.name }}</div>
            <p v-if="selectedGroupDetail.description" class="text-caption text-medium-emphasis mb-3">{{ selectedGroupDetail.description }}</p>

            <AppTabs v-model="detailTab" color="primary" class="mb-3">
              <AppTab value="companies">Companies ({{ selectedCompanyIds.length }})</AppTab>
              <AppTab value="members">Members ({{ totalSelectedMembers }})</AppTab>
            </AppTabs>

            <AppWindow v-model="detailTab">
              <AppWindowItem value="companies">
                <p class="text-caption text-medium-emphasis mb-2">Check a company to put it in this group — picking one already in another group moves it here.</p>
                <AppTextField v-model="companySearch" label="Search companies" prepend-inner-icon="mdi-magnify" clearable hide-details class="mb-3" />

                <div class="assign-section-title">Selected ({{ selectedCompaniesFiltered.length }})</div>
                <div class="assign-list mb-3">
                  <div v-for="c in selectedCompaniesFiltered" :key="c.id" class="assign-row" @click="toggleCompany(c.id, false)">
                    <AppCheckbox :model-value="true" />
                    <span class="assign-row__label">{{ c.name }}</span>
                    <AppChip v-if="c.groupId !== selectedGroupId" size="x-small" variant="outlined">currently {{ c.groupName }}</AppChip>
                  </div>
                  <p v-if="selectedCompaniesFiltered.length === 0" class="text-caption text-medium-emphasis pa-2">None selected yet.</p>
                </div>

                <div class="assign-section-title">Available ({{ availableCompaniesFiltered.length }})</div>
                <div class="assign-list">
                  <div v-for="c in availableCompaniesFiltered" :key="c.id" class="assign-row" @click="toggleCompany(c.id, true)">
                    <AppCheckbox :model-value="false" />
                    <span class="assign-row__label">{{ c.name }}</span>
                    <AppChip v-if="c.groupId !== selectedGroupId" size="x-small" variant="outlined">currently {{ c.groupName }}</AppChip>
                  </div>
                  <p v-if="availableCompaniesFiltered.length === 0" class="text-caption text-medium-emphasis pa-2">
                    {{ companySearch ? `No companies match "${companySearch}".` : 'Nothing left to add.' }}
                  </p>
                </div>

                <div class="d-flex justify-end mt-3">
                  <AppBtn color="primary" variant="flat" :loading="savingCompanies" @click="submitCompanies">Save Changes</AppBtn>
                </div>
              </AppWindowItem>

              <AppWindowItem value="members">
                <p class="text-caption text-medium-emphasis mb-2">A person belongs to only one group at a time — checking them here moves them out of any other group.</p>
                <AppTextField v-model="memberSearch" label="Search members" prepend-inner-icon="mdi-magnify" clearable hide-details class="mb-3" />

                <div class="assign-section-title">Selected ({{ selectedMembersFiltered.length }})</div>
                <div class="assign-list mb-3">
                  <div v-for="u in selectedMembersFiltered" :key="u.id" class="assign-row" @click="toggleMember(u.bucketKey, u.id, false)">
                    <AppCheckbox :model-value="true" />
                    <span class="assign-row__label">{{ u.fullName }} (@{{ u.username }})</span>
                    <AppChip size="x-small" variant="outlined">{{ u.bucketLabel }}</AppChip>
                  </div>
                  <p v-if="selectedMembersFiltered.length === 0" class="text-caption text-medium-emphasis pa-2">None selected yet.</p>
                </div>

                <div class="assign-section-title">Available</div>
                <div v-for="bucket in memberBuckets" :key="bucket.key" class="mb-3">
                  <div v-if="bucket.available.length > 0" class="text-subtitle-2 mb-1">{{ bucket.label }}</div>
                  <div v-if="bucket.available.length > 0" class="assign-list">
                    <div v-for="u in bucket.available" :key="u.id" class="assign-row" @click="toggleMember(bucket.key, u.id, true)">
                      <AppCheckbox :model-value="false" />
                      <span class="assign-row__label">{{ u.fullName }} (@{{ u.username }})</span>
                    </div>
                  </div>
                </div>
                <p v-if="memberBuckets.every((b) => b.available.length === 0)" class="text-caption text-medium-emphasis pa-2">
                  {{ memberSearch ? `No members match "${memberSearch}".` : 'Nothing left to add.' }}
                </p>

                <div class="d-flex justify-end mt-3">
                  <AppBtn color="primary" variant="flat" :loading="savingMembers" @click="submitMembers">Save Changes</AppBtn>
                </div>
              </AppWindowItem>
            </AppWindow>
          </template>
        </AppCard>
      </div>
    </div>

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
  AppChip,
  AppDialog,
  AppList,
  AppListItem,
  AppTabs,
  AppTab,
  AppWindow,
  AppWindowItem,
  AppCheckbox,
  AppProgressCircular,
} from '@/components/ui';
import type { AdminGroup, AdminUser } from '@/types/admin.types';

const groupStore = useAdminGroupStore();
const { success, error } = useSnackbar();

const search = ref('');
const page = ref(1);
const pageSize = ref(100);

const allUsers = ref<AdminUser[]>([]);
const companyOptions = ref<{ id: string; name: string; groupId: string; groupName: string }[]>([]);

const usersByRole = computed(() => {
  const buckets: Record<'INTENT_CREATOR' | 'OWN_FLEET_OPERATOR' | 'MARKET_FLEET_OPERATOR' | 'ACCOUNTS_EXECUTIVE', { id: string; fullName: string; username: string }[]> = {
    INTENT_CREATOR: [],
    OWN_FLEET_OPERATOR: [],
    MARKET_FLEET_OPERATOR: [],
    ACCOUNTS_EXECUTIVE: [],
  };
  for (const user of allUsers.value) {
    const roleNames = user.roles.map((r) => r.name);
    for (const bucket of Object.keys(buckets) as (keyof typeof buckets)[]) {
      if (roleNames.includes(bucket)) {
        buckets[bucket].push({ id: user.id, fullName: user.fullName, username: user.username });
      }
    }
  }
  return buckets;
});

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchGroups, 350);
}

async function fetchGroups() {
  await groupStore.fetchList({ page: page.value, pageSize: pageSize.value, search: search.value || undefined });
}

async function refreshCompanyOptions() {
  const res = await adminCompanyApi.list({ pageSize: 500 });
  companyOptions.value = res.data.data.map((c) => ({ id: c.id, name: c.name, groupId: c.group.id, groupName: c.group.name }));
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

// --- Selected group detail (in-page, no dialog) ---
const selectedGroupId = ref<string | null>(null);
const selectedGroupDetail = ref<AdminGroup | null>(null);
const detailLoading = ref(false);
const detailTab = ref<'companies' | 'members'>('companies');

const companySearch = ref('');
const memberSearch = ref('');
const selectedCompanyIds = ref<string[]>([]);
const selectedIntentCreatorIds = ref<string[]>([]);
const selectedOwnFleetIds = ref<string[]>([]);
const selectedMarketFleetIds = ref<string[]>([]);
const selectedAccountsExecutiveIds = ref<string[]>([]);
const savingCompanies = ref(false);
const savingMembers = ref(false);

const filteredCompanyOptions = computed(() => {
  const q = companySearch.value.trim().toLowerCase();
  return q ? companyOptions.value.filter((c) => c.name.toLowerCase().includes(q)) : companyOptions.value;
});
const selectedCompaniesFiltered = computed(() => filteredCompanyOptions.value.filter((c) => selectedCompanyIds.value.includes(c.id)));
const availableCompaniesFiltered = computed(() => filteredCompanyOptions.value.filter((c) => !selectedCompanyIds.value.includes(c.id)));

type MemberBucketKey = 'INTENT_CREATOR' | 'OWN_FLEET_OPERATOR' | 'MARKET_FLEET_OPERATOR' | 'ACCOUNTS_EXECUTIVE';
const memberBucketDefs: { key: MemberBucketKey; label: string; selected: typeof selectedIntentCreatorIds }[] = [
  { key: 'INTENT_CREATOR', label: 'Intent Creators', selected: selectedIntentCreatorIds },
  { key: 'OWN_FLEET_OPERATOR', label: 'Own Fleet Operators', selected: selectedOwnFleetIds },
  { key: 'MARKET_FLEET_OPERATOR', label: 'Market Fleet Operators', selected: selectedMarketFleetIds },
  { key: 'ACCOUNTS_EXECUTIVE', label: 'Accounts Executives', selected: selectedAccountsExecutiveIds },
];

// Available (unselected) members, still bucketed by role — matches how they're picked.
const memberBuckets = computed(() => {
  const q = memberSearch.value.trim().toLowerCase();
  return memberBucketDefs.map((d) => ({
    ...d,
    available: usersByRole.value[d.key].filter(
      (u) => !d.selected.value.includes(u.id) && (!q || u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    ),
  }));
});

// Selected members, flattened across buckets with a role tag — so "who's already in" reads as one list.
const selectedMembersFiltered = computed(() => {
  const q = memberSearch.value.trim().toLowerCase();
  const rows: { id: string; fullName: string; username: string; bucketKey: MemberBucketKey; bucketLabel: string }[] = [];
  for (const d of memberBucketDefs) {
    for (const u of usersByRole.value[d.key]) {
      if (!d.selected.value.includes(u.id)) continue;
      if (q && !u.fullName.toLowerCase().includes(q) && !u.username.toLowerCase().includes(q)) continue;
      rows.push({ id: u.id, fullName: u.fullName, username: u.username, bucketKey: d.key, bucketLabel: d.label });
    }
  }
  return rows;
});

const totalSelectedMembers = computed(
  () => selectedIntentCreatorIds.value.length + selectedOwnFleetIds.value.length + selectedMarketFleetIds.value.length + selectedAccountsExecutiveIds.value.length
);

function toggleCompany(id: string, checked: boolean) {
  selectedCompanyIds.value = checked ? [...new Set([...selectedCompanyIds.value, id])] : selectedCompanyIds.value.filter((cid) => cid !== id);
}

function bucketRef(key: MemberBucketKey) {
  return { INTENT_CREATOR: selectedIntentCreatorIds, OWN_FLEET_OPERATOR: selectedOwnFleetIds, MARKET_FLEET_OPERATOR: selectedMarketFleetIds, ACCOUNTS_EXECUTIVE: selectedAccountsExecutiveIds }[key];
}
function toggleMember(key: MemberBucketKey, id: string, checked: boolean) {
  const target = bucketRef(key);
  target.value = checked ? [...new Set([...target.value, id])] : target.value.filter((uid) => uid !== id);
}

async function selectGroup(group: AdminGroup) {
  selectedGroupId.value = group.id;
  detailTab.value = 'companies';
  companySearch.value = '';
  memberSearch.value = '';
  detailLoading.value = true;
  try {
    const detail = await groupStore.getById(group.id);
    selectedGroupDetail.value = detail;
    selectedCompanyIds.value = (detail.companies || []).map((c) => c.id);
    const memberIds = new Set((detail.members || []).map((m) => m.id));
    selectedIntentCreatorIds.value = usersByRole.value.INTENT_CREATOR.filter((u) => memberIds.has(u.id)).map((u) => u.id);
    selectedOwnFleetIds.value = usersByRole.value.OWN_FLEET_OPERATOR.filter((u) => memberIds.has(u.id)).map((u) => u.id);
    selectedMarketFleetIds.value = usersByRole.value.MARKET_FLEET_OPERATOR.filter((u) => memberIds.has(u.id)).map((u) => u.id);
    selectedAccountsExecutiveIds.value = usersByRole.value.ACCOUNTS_EXECUTIVE.filter((u) => memberIds.has(u.id)).map((u) => u.id);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load group detail'));
    selectedGroupId.value = null;
  } finally {
    detailLoading.value = false;
  }
}

async function refreshSelectedGroup() {
  if (!selectedGroupId.value) return;
  const detail = await groupStore.getById(selectedGroupId.value);
  selectedGroupDetail.value = detail;
}

async function submitCompanies() {
  if (!selectedGroupId.value) return;
  savingCompanies.value = true;
  try {
    await groupStore.setCompanies(selectedGroupId.value, selectedCompanyIds.value);
    success('Group companies updated successfully');
    await Promise.all([refreshCompanyOptions(), refreshSelectedGroup(), fetchGroups()]);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update group companies'));
  } finally {
    savingCompanies.value = false;
  }
}

async function submitMembers() {
  if (!selectedGroupId.value) return;
  savingMembers.value = true;
  try {
    const desiredIds = new Set([
      ...selectedIntentCreatorIds.value,
      ...selectedOwnFleetIds.value,
      ...selectedMarketFleetIds.value,
      ...selectedAccountsExecutiveIds.value,
    ]);
    const previousIds = new Set((selectedGroupDetail.value?.members || []).map((m) => m.id));
    const toRemove = [...previousIds].filter((id) => !desiredIds.has(id));

    if (desiredIds.size > 0) {
      await groupStore.setMembers(selectedGroupId.value, [...desiredIds]);
    }
    for (const userId of toRemove) {
      await groupStore.removeMember(selectedGroupId.value, userId);
    }

    success('Group members updated successfully');
    await Promise.all([refreshSelectedGroup(), fetchGroups()]);
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
    if (selectedGroupId.value === deleteTarget.value.id) {
      selectedGroupId.value = null;
      selectedGroupDetail.value = null;
    }
    deleteDialog.value = false;
    fetchGroups();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete group'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  const [usersRes] = await Promise.all([adminUserApi.list({ pageSize: 500 }), refreshCompanyOptions()]);
  allUsers.value = usersRes.data.data;
  fetchGroups();
});
</script>

<style scoped>
.flex-1 {
  flex: 1 1 auto;
  min-width: 0;
}
.assign-section-title {
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 4px;
}
.assign-list {
  width: 100%;
  max-width: 100%;
  max-height: 360px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  padding: 4px;
  box-sizing: border-box;
}
/* Grid, not flex: a bare 1fr track can still refuse to shrink below its
   content's intrinsic width (the same "min-width:auto" gotcha flexbox
   has) — minmax(0, 1fr) is what actually forces the name to truncate
   instead of pushing the chip/checkbox past the card's edge. */
.assign-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
}
.assign-row:hover {
  background: var(--color-surface-variant, #f5f7fa);
}
.assign-row__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
