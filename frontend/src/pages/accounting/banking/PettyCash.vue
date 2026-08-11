<template>
  <div>
    <MasterToolbar title="Petty Cash Requests" :can-create="canCreate" create-label="New Request" @create="openCreateDialog" />

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
      <template #filters>
        <AppSelect v-model="statusFilter" :items="statusFilterOptions" label="Status" @update:model-value="onFilterChange" />
      </template>
      <template #item.purpose="{ item }">
        <div class="font-weight-medium">{{ (item as any).purpose }}</div>
        <div class="text-caption text-medium-emphasis">{{ (item as any).cashAccount?.cashAccountType }}</div>
      </template>
      <template #item.amount="{ item }">{{ formatCurrency(Number((item as any).amount)) }}</template>
      <template #item.status="{ item }">
        <AppChip size="small" :color="statusColor((item as any).status)">{{ (item as any).status }}</AppChip>
      </template>
      <template #item.actions="{ item }">
        <AppBtn v-if="(item as any).status === 'PENDING' && canApprove" size="small" variant="text" color="success" @click="onDecide(item as any, 'APPROVED')">Approve</AppBtn>
        <AppBtn v-if="(item as any).status === 'PENDING' && canApprove" size="small" variant="text" color="error" @click="onDecide(item as any, 'REJECTED')">Reject</AppBtn>
        <AppBtn v-if="(item as any).status === 'APPROVED'" size="small" variant="text" @click="openDisburseDialog(item as any)">Disburse</AppBtn>
        <AppBtn v-if="(item as any).status === 'DISBURSED'" size="small" variant="text" @click="openCloseDialog(item as any)">Close / Settle</AppBtn>
      </template>
    </MasterDataTable>

    <AppDialog v-model="dialog" :max-width="520" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">New Petty Cash Request</AppCardTitle>
        <AppCardText>
          <AppSelect v-model="form.cashAccountId" :items="cashAccountOptions" item-title="label" item-value="id" label="Cash Account" :error-messages="errors.cashAccountId" class="mb-2" />
          <AppTextField v-model.number="form.amount" type="number" label="Amount" :error-messages="errors.amount" class="mb-2" />
          <AppTextarea v-model="form.purpose" label="Purpose" rows="2" :error-messages="errors.purpose" class="mb-2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="dialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmit">Request</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <AppDialog v-model="disburseDialog" :max-width="480" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Disburse Request</AppCardTitle>
        <AppCardText>
          <AppSelect v-model="disburseForm.fromBankAccountId" :items="bankAccountOptions" item-title="label" item-value="id" label="From Bank Account" :error-messages="disburseErrors.fromBankAccountId" class="mb-2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="disburseDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmitDisburse">Disburse</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <AppDialog v-model="closeDialogOpen" :max-width="520" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Close &amp; Settle Request</AppCardTitle>
        <AppCardText>
          <AppTextField v-model.number="closeForm.settledAmount" type="number" label="Settled Amount" :error-messages="closeErrors.settledAmount" class="mb-2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="closeDialogOpen = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmitClose">Close Request</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { usePettyCashRequestStore, useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterToolbar from '@/components/masters/MasterToolbar.vue';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import { AppBtn, AppDialog, AppCard, AppCardTitle, AppCardText, AppCardActions, AppTextField, AppTextarea, AppSelect, AppChip } from '@/components/ui';
import type { PettyCashRequest } from '@/types/banking.types';

const store = usePettyCashRequestStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('pettyCashRequest.create');
const canApprove = authStore.hasPermission('pettyCashRequest.approve');

const headers = [
  { title: 'Purpose', key: 'purpose', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

const statusFilterOptions = ['', 'PENDING', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED'].map((v) => ({ title: v || 'All Statuses', value: v }));

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}
function statusColor(status: string): string {
  return { APPROVED: 'success', REJECTED: 'error', DISBURSED: 'info', CLOSED: 'default' }[status] || 'warning';
}

const cashAccountOptions = computed(() => cashAccountStore.items.map((c) => ({ id: c.id, label: c.cashAccountType })));
const bankAccountOptions = computed(() => bankAccountStore.items.map((b) => ({ id: b.id, label: `${b.accountHolderName} (${b.accountNumber})` })));

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const statusFilter = ref('');

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
function onFilterChange() {
  page.value = 1;
  fetchData();
}

async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, status: statusFilter.value || undefined });
}

const dialog = ref(false);
const submitting = ref(false);

function blankForm() {
  return { cashAccountId: '', amount: undefined as number | undefined, purpose: '' };
}
const form = reactive(blankForm());
const errors = reactive({ cashAccountId: '', amount: '', purpose: '' });

function openCreateDialog() {
  Object.assign(form, blankForm());
  Object.assign(errors, { cashAccountId: '', amount: '', purpose: '' });
  dialog.value = true;
}
function validateForm(): boolean {
  errors.cashAccountId = form.cashAccountId ? '' : 'Cash Account is required';
  errors.amount = form.amount && form.amount > 0 ? '' : 'Amount must be greater than 0';
  errors.purpose = form.purpose.trim() ? '' : 'Purpose is required';
  return !errors.cashAccountId && !errors.amount && !errors.purpose;
}
async function onSubmit() {
  if (!validateForm()) return;
  submitting.value = true;
  try {
    await store.create({ ...form });
    success('Petty Cash Request submitted');
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to submit request'));
  } finally {
    submitting.value = false;
  }
}

async function onDecide(request: PettyCashRequest, decision: 'APPROVED' | 'REJECTED') {
  try {
    await store.decide(request.id, decision);
    success(`Request ${decision.toLowerCase()}`);
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record decision'));
  }
}

const activeRequest = ref<PettyCashRequest | null>(null);

const disburseDialog = ref(false);
const disburseForm = reactive({ fromBankAccountId: '' });
const disburseErrors = reactive({ fromBankAccountId: '' });
function openDisburseDialog(request: PettyCashRequest) {
  activeRequest.value = request;
  disburseForm.fromBankAccountId = '';
  disburseErrors.fromBankAccountId = '';
  disburseDialog.value = true;
}
async function onSubmitDisburse() {
  if (!activeRequest.value) return;
  disburseErrors.fromBankAccountId = disburseForm.fromBankAccountId ? '' : 'Bank Account is required';
  if (disburseErrors.fromBankAccountId) return;
  submitting.value = true;
  try {
    await store.disburse(activeRequest.value.id, { fromBankAccountId: disburseForm.fromBankAccountId });
    success('Disbursed via Bank Transfer');
    disburseDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to disburse'));
  } finally {
    submitting.value = false;
  }
}

const closeDialogOpen = ref(false);
const closeForm = reactive({ settledAmount: undefined as number | undefined });
const closeErrors = reactive({ settledAmount: '' });
function openCloseDialog(request: PettyCashRequest) {
  activeRequest.value = request;
  closeForm.settledAmount = Number(request.amount);
  closeErrors.settledAmount = '';
  closeDialogOpen.value = true;
}
async function onSubmitClose() {
  if (!activeRequest.value) return;
  closeErrors.settledAmount = closeForm.settledAmount !== undefined && closeForm.settledAmount >= 0 ? '' : 'Settled amount is required';
  if (closeErrors.settledAmount) return;
  submitting.value = true;
  try {
    await store.close(activeRequest.value.id, {
      settledAmount: closeForm.settledAmount,
    });
    success('Petty Cash Request closed');
    closeDialogOpen.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to close request'));
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    cashAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
    bankAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
  ]);
  fetchData();
});
</script>
