<template>
  <div>
    <MasterToolbar title="Bank Transfers" :can-create="canCreate" create-label="New Transfer" @create="openCreateDialog" />

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
      <template #item.transferNumber="{ item }">
        <div class="font-weight-medium">{{ (item as any).transferNumber }}</div>
        <div class="text-caption text-medium-emphasis">{{ (item as any).transferDate?.slice(0, 10) }}</div>
      </template>
      <template #item.route="{ item }">
        {{ accountLabel((item as any).fromAccountType, (item as any).fromAccountId) }}
        <AppIcon icon="mdi-arrow-right" size="small" class="mx-1" />
        {{ accountLabel((item as any).toAccountType, (item as any).toAccountId) }}
      </template>
      <template #item.amount="{ item }">{{ formatCurrency(Number((item as any).amount)) }}</template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-pencil-outline" variant="text" size="small" :disabled="!canEdit" @click="openEditDialog(item as any)" />
        <AppBtn icon="mdi-delete-outline" variant="text" size="small" :disabled="!canDelete" @click="openDeleteConfirm(item as any)" />
      </template>
    </MasterDataTable>

    <AppDialog v-model="dialog" :max-width="640" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">{{ isEditing ? 'Edit Bank Transfer' : 'New Bank Transfer' }}</AppCardTitle>
        <AppCardText>
          <AppTextField v-model="form.transferDate" type="date" label="Transfer Date" class="mb-2" />
          <AppSelect v-model="fromKey" :items="accountOptions" item-title="label" item-value="key" label="From Account" :error-messages="errors.from" class="mb-2" />
          <AppSelect v-model="toKey" :items="accountOptions" item-title="label" item-value="key" label="To Account" :error-messages="errors.to" class="mb-2" />
          <AppTextField v-model.number="form.amount" type="number" label="Amount" :error-messages="errors.amount" class="mb-2" />
          <AppTextField v-model.number="form.transferCharges" type="number" label="Transfer Charges" class="mb-2" />
          <AppSelect v-model="form.paymentModeId" :items="paymentModeOptions" item-title="name" item-value="id" label="Payment Mode" clearable class="mb-2" />
          <AppTextField v-model="form.referenceNumber" label="Reference Number" class="mb-2" />
          <AppTextarea v-model="form.narration" label="Narration" rows="2" class="mb-2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="dialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmit">{{ isEditing ? 'Save Changes' : 'Create Transfer' }}</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Bank Transfer"
      :message="`Delete transfer ${deleteTarget?.transferNumber}? The money it moved goes back to where it came from.`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useBankTransferStore, useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { usePaymentModeStore } from '@/stores/masters';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterToolbar from '@/components/masters/MasterToolbar.vue';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import { AppBtn, AppDialog, AppCard, AppCardTitle, AppCardText, AppCardActions, AppTextField, AppTextarea, AppSelect, AppIcon } from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import type { BankTransfer } from '@/types/banking.types';

const store = useBankTransferStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const paymentModeStore = usePaymentModeStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('bankTransfer.create');
const canEdit = authStore.hasPermission('bankTransfer.edit');
const canDelete = authStore.hasPermission('bankTransfer.delete');

const headers = [
  { title: 'Transfer', key: 'transferNumber', sortable: false },
  { title: 'Route', key: 'route', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

const accountOptions = computed(() => [
  ...bankAccountStore.items.map((b) => ({ key: `BANK:${b.id}`, label: `🏦 ${b.accountHolderName} (${b.accountNumber})` })),
  ...cashAccountStore.items.map((c) => ({ key: `CASH:${c.id}`, label: `💵 ${c.cashAccountType}` })),
]);
function accountLabel(type: string, id: string) {
  const opt = accountOptions.value.find((o) => o.key === `${type}:${id}`);
  return opt?.label || `${type}`;
}
const paymentModeOptions = computed(() => paymentModeStore.items);

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
const submitting = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const fromKey = ref('');
const toKey = ref('');

function blankForm() {
  return {
    transferDate: new Date().toISOString().slice(0, 10),
    amount: undefined as number | undefined,
    transferCharges: 0,
    paymentModeId: '',
    referenceNumber: '',
    narration: '',
  };
}
const form = reactive(blankForm());
const errors = reactive({ from: '', to: '', amount: '' });

function openCreateDialog() {
  Object.assign(form, blankForm());
  Object.assign(errors, { from: '', to: '', amount: '' });
  fromKey.value = '';
  toKey.value = '';
  isEditing.value = false;
  editingId.value = null;
  dialog.value = true;
}

function openEditDialog(transfer: BankTransfer) {
  Object.assign(form, {
    ...blankForm(),
    transferDate: transfer.transferDate?.slice(0, 10) ?? blankForm().transferDate,
    amount: Number(transfer.amount),
    transferCharges: Number(transfer.transferCharges ?? 0),
    paymentModeId: transfer.paymentModeId || '',
    referenceNumber: transfer.referenceNumber || '',
    narration: transfer.narration || '',
  });
  Object.assign(errors, { from: '', to: '', amount: '' });
  fromKey.value = `${transfer.fromAccountType}:${transfer.fromAccountId}`;
  toKey.value = `${transfer.toAccountType}:${transfer.toAccountId}`;
  isEditing.value = true;
  editingId.value = transfer.id;
  dialog.value = true;
}

function validateForm(): boolean {
  errors.from = fromKey.value ? '' : 'From account is required';
  errors.to = !toKey.value ? 'To account is required' : toKey.value === fromKey.value ? 'To account must differ from From account' : '';
  errors.amount = form.amount && form.amount > 0 ? '' : 'Amount must be greater than 0';
  return !errors.from && !errors.to && !errors.amount;
}

async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    const [fromAccountType, fromAccountId] = fromKey.value.split(':');
    const [toAccountType, toAccountId] = toKey.value.split(':');
    const payload = {
      transferDate: form.transferDate,
      fromAccountType,
      fromAccountId,
      toAccountType,
      toAccountId,
      amount: form.amount,
      transferCharges: form.transferCharges || undefined,
      paymentModeId: form.paymentModeId || undefined,
      referenceNumber: form.referenceNumber || undefined,
      narration: form.narration || undefined,
    };
    if (isEditing.value && editingId.value) {
      await store.update(editingId.value, payload);
      success('Bank Transfer updated');
    } else {
      await store.create(payload);
      success('Bank Transfer created');
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save Bank Transfer'));
  } finally {
    submitting.value = false;
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<BankTransfer | null>(null);
const deleting = ref(false);

function openDeleteConfirm(transfer: BankTransfer) {
  deleteTarget.value = transfer;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Bank Transfer deleted');
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete Bank Transfer'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    bankAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
    cashAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
    paymentModeStore.fetchList({ pageSize: 50 }),
  ]);
  fetchData();
});
</script>
