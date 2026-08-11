<template>
  <div>
    <MasterToolbar title="Bank Accounts" :can-create="canCreate" create-label="New Bank Account" @create="openCreateDialog" />

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
      <template #item.accountNumber="{ item }">
        <div class="font-weight-medium">{{ (item as any).accountHolderName }}</div>
        <div class="text-caption text-medium-emphasis">{{ (item as any).bankName ? `${(item as any).bankName} — ` : '' }}{{ (item as any).accountNumber }}</div>
      </template>
      <template #item.accountType="{ item }">
        <AppChip size="small">{{ (item as any).accountType }}</AppChip>
      </template>
      <template #item.currentBalance="{ item }">{{ formatCurrency(Number((item as any).currentBalance)) }}</template>
      <template #item.flags="{ item }">
        <AppChip v-if="(item as any).isPrimary" size="small" color="primary">Primary</AppChip>
        <AppChip v-if="(item as any).isDefaultPaymentAccount" size="small" color="info">Default Payment</AppChip>
        <AppChip v-if="(item as any).isDefaultReceiptAccount" size="small" color="success">Default Receipt</AppChip>
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

    <AppDialog v-model="dialog" :max-width="640" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">{{ isEditing ? 'Edit Bank Account' : 'New Bank Account' }}</AppCardTitle>
        <AppCardText>
          <AppTextField v-model="form.accountHolderName" label="Account Holder Name" :error-messages="errors.accountHolderName" class="mb-2" />
          <AppTextField v-model="form.accountNumber" label="Account Number" :error-messages="errors.accountNumber" class="mb-2" />
          <AppTextField v-model="form.bankName" label="Bank Name" class="mb-2" />
          <AppSelect v-model="form.accountType" :items="accountTypeOptions" label="Account Type" class="mb-2" />
          <AppTextField v-model="form.ifscCode" label="IFSC Code" class="mb-2" />
          <AppTextField v-model="form.micrCode" label="MICR Code" class="mb-2" />
          <AppTextField v-model="form.swiftCode" label="SWIFT Code" class="mb-2" />
          <AppTextField v-model="form.branchName" label="Branch" class="mb-2" />
          <AppCheckbox v-model="form.isPrimary" label="Primary Account" class="mb-2" />
          <AppCheckbox v-model="form.isDefaultPaymentAccount" label="Default Payment Account" class="mb-2" />
          <AppCheckbox v-model="form.isDefaultReceiptAccount" label="Default Receipt Account" class="mb-2" />
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
import { ref, reactive, onMounted } from 'vue';
import { useBankAccountStore } from '@/stores/banking';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterToolbar from '@/components/masters/MasterToolbar.vue';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import StatusChip from '@/components/masters/StatusChip.vue';
import { AppBtn, AppDialog, AppCard, AppCardTitle, AppCardText, AppCardActions, AppTextField, AppSelect, AppChip, AppCheckbox } from '@/components/ui';
import type { BankAccount } from '@/types/banking.types';

const store = useBankAccountStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('bankAccount.create');
const canEdit = authStore.hasPermission('bankAccount.edit');

const headers = [
  { title: 'Account', key: 'accountNumber', sortable: false },
  { title: 'Type', key: 'accountType', sortable: false },
  { title: 'Branch', key: 'branchName', sortable: false },
  { title: 'Balance', key: 'currentBalance', sortable: false },
  { title: 'Flags', key: 'flags', sortable: false },
  { title: 'Status', key: 'isActive', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

const accountTypeOptions = ['SAVINGS', 'CURRENT', 'OD', 'CC', 'FIXED_DEPOSIT'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

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
  await store.fetchList({ page: page.value, pageSize: pageSize.value, search: search.value || undefined });
}

const dialog = ref(false);
const isEditing = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);

function blankForm() {
  return {
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    accountType: 'CURRENT',
    ifscCode: '',
    micrCode: '',
    swiftCode: '',
    branchName: '',
    isPrimary: false,
    isDefaultPaymentAccount: false,
    isDefaultReceiptAccount: false,
  };
}
const form = reactive(blankForm());
const errors = reactive({ accountHolderName: '', accountNumber: '' });

function openCreateDialog() {
  Object.assign(form, blankForm());
  Object.assign(errors, { accountHolderName: '', accountNumber: '' });
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(account: BankAccount) {
  Object.assign(form, {
    ...blankForm(),
    accountHolderName: account.accountHolderName,
    accountNumber: account.accountNumber,
    bankName: account.bankName || '',
    accountType: account.accountType,
    ifscCode: account.ifscCode || '',
    micrCode: account.micrCode || '',
    swiftCode: account.swiftCode || '',
    branchName: account.branchName || '',
    isPrimary: account.isPrimary,
    isDefaultPaymentAccount: account.isDefaultPaymentAccount,
    isDefaultReceiptAccount: account.isDefaultReceiptAccount,
  });
  isEditing.value = true;
  editingId.value = account.id;
  dialog.value = true;
}

function validateForm(): boolean {
  errors.accountHolderName = form.accountHolderName.trim() ? '' : 'Account holder name is required';
  errors.accountNumber = form.accountNumber.trim() ? '' : 'Account number is required';
  return !errors.accountHolderName && !errors.accountNumber;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    const payload: Record<string, unknown> = {
      accountHolderName: form.accountHolderName,
      accountNumber: form.accountNumber,
      bankName: form.bankName || undefined,
      accountType: form.accountType,
      ifscCode: form.ifscCode || undefined,
      micrCode: form.micrCode || undefined,
      swiftCode: form.swiftCode || undefined,
      branchName: form.branchName || undefined,
      isPrimary: form.isPrimary,
      isDefaultPaymentAccount: form.isDefaultPaymentAccount,
      isDefaultReceiptAccount: form.isDefaultReceiptAccount,
    };
    if (isEditing.value && editingId.value) {
      await store.update(editingId.value, payload);
      success('Bank Account updated successfully');
    } else {
      await store.create(payload);
      success('Bank Account created successfully');
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save Bank Account'));
  } finally {
    submitting.value = false;
  }
}

async function onToggleStatus(account: BankAccount) {
  try {
    await store.toggleStatus(account.id);
    success('Status updated successfully');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update status'));
  }
}

onMounted(async () => {
  fetchData();
});
</script>
