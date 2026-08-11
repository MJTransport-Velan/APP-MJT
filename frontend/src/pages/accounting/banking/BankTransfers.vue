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
    </MasterDataTable>

    <AppDialog v-model="dialog" :max-width="640" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">New Bank Transfer</AppCardTitle>
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
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmit">Create Transfer</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
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

const store = useBankTransferStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const paymentModeStore = usePaymentModeStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('bankTransfer.create');

const headers = [
  { title: 'Transfer', key: 'transferNumber', sortable: false },
  { title: 'Route', key: 'route', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
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
    await store.create({
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
    });
    success('Bank Transfer created');
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create Bank Transfer'));
  } finally {
    submitting.value = false;
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
