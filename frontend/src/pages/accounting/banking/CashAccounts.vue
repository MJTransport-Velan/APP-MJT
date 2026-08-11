<template>
  <div>
    <MasterToolbar title="Cash Accounts" :can-create="canCreate" create-label="New Cash Account" @create="openCreateDialog" />

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
      <template #item.cashAccountType="{ item }">
        <AppChip size="small">{{ (item as any).cashAccountType }}</AppChip>
      </template>
      <template #item.currentBalance="{ item }">{{ formatCurrency(Number((item as any).currentBalance)) }}</template>
      <template #item.limits="{ item }">
        <span v-if="(item as any).maximumLimit">Max: {{ Number((item as any).maximumLimit).toLocaleString() }}</span>
        <span v-else class="text-medium-emphasis">—</span>
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
      </template>
    </MasterDataTable>

    <AppDialog v-model="dialog" :max-width="600" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">{{ isEditing ? 'Edit Cash Account' : 'New Cash Account' }}</AppCardTitle>
        <AppCardText>
          <AppSelect v-model="form.cashAccountType" :items="cashAccountTypeOptions" label="Cash Account Type" class="mb-2" />
          <AppSelect
            v-model="form.responsiblePersonId"
            :items="userOptions"
            item-title="label"
            item-value="id"
            label="Responsible Person"
            clearable
            class="mb-2"
          />
          <AppTextField v-model.number="form.maximumLimit" type="number" label="Maximum Limit (soft ceiling)" class="mb-2" />
          <AppTextField v-model.number="form.approvalLimit" type="number" label="Approval Limit" class="mb-2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="dialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmit">Save</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useCashAccountStore } from '@/stores/banking';
import { useAdminUserStore } from '@/stores/admin-user.store';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterToolbar from '@/components/masters/MasterToolbar.vue';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import StatusChip from '@/components/masters/StatusChip.vue';
import { AppBtn, AppDialog, AppCard, AppCardTitle, AppCardText, AppCardActions, AppTextField, AppSelect, AppChip } from '@/components/ui';
import type { CashAccount } from '@/types/banking.types';

const store = useCashAccountStore();
const userStore = useAdminUserStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('cashAccount.create');
const canEdit = authStore.hasPermission('cashAccount.edit');

const headers = [
  { title: 'Type', key: 'cashAccountType', sortable: false },
  { title: 'Balance', key: 'currentBalance', sortable: false },
  { title: 'Limits', key: 'limits', sortable: false },
  { title: 'Status', key: 'isActive', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

const cashAccountTypeOptions = ['MAIN', 'PETTY', 'BRANCH', 'SITE', 'EMERGENCY'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}
const userOptions = computed(() => userStore.items.map((u) => ({ id: u.id, label: u.fullName || u.username })));

const search = ref('');
const page = ref(1);
const pageSize = ref(10);

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
  await store.fetchList({ page: page.value, pageSize: pageSize.value });
}

const dialog = ref(false);
const isEditing = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);

function blankForm() {
  return {
    cashAccountType: 'PETTY',
    responsiblePersonId: '',
    maximumLimit: undefined as number | undefined,
    approvalLimit: undefined as number | undefined,
  };
}
const form = reactive(blankForm());

function openCreateDialog() {
  Object.assign(form, blankForm());
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(account: CashAccount) {
  Object.assign(form, {
    ...blankForm(),
    cashAccountType: account.cashAccountType,
    responsiblePersonId: account.responsiblePersonId || '',
    maximumLimit: account.maximumLimit ? Number(account.maximumLimit) : undefined,
    approvalLimit: account.approvalLimit ? Number(account.approvalLimit) : undefined,
  });
  isEditing.value = true;
  editingId.value = account.id;
  dialog.value = true;
}

async function onSubmit() {
  submitting.value = true;
  try {
    const payload: Record<string, unknown> = {
      cashAccountType: form.cashAccountType,
      responsiblePersonId: form.responsiblePersonId || undefined,
      maximumLimit: form.maximumLimit,
      approvalLimit: form.approvalLimit,
    };
    if (isEditing.value && editingId.value) {
      await store.update(editingId.value, payload);
      success('Cash Account updated successfully');
    } else {
      await store.create(payload);
      success('Cash Account created successfully');
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save Cash Account'));
  } finally {
    submitting.value = false;
  }
}

async function onToggleStatus(account: CashAccount) {
  try {
    await store.toggleStatus(account.id);
    success('Status updated successfully');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update status'));
  }
}

onMounted(async () => {
  await userStore.fetchList({ pageSize: 500 });
  fetchData();
});
</script>
