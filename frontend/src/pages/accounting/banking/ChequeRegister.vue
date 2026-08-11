<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6 mb-0">Cheque Register</h2>
      <div class="d-flex ga-2">
        <AppBtn v-if="canCreate" color="primary" variant="flat" @click="openIssueDialog">Issue Cheque</AppBtn>
        <AppBtn v-if="canCreate" variant="outlined" @click="openReceiveDialog">Record Received Cheque</AppBtn>
      </div>
    </div>

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
        <AppSelect v-model="directionFilter" :items="directionFilterOptions" label="Direction" @update:model-value="onFilterChange" />
        <AppSelect v-model="statusFilter" :items="statusFilterOptions" label="Status" @update:model-value="onFilterChange" />
      </template>
      <template #item.chequeNumber="{ item }">
        <div class="font-weight-medium">{{ (item as any).chequeNumber }}</div>
        <div class="text-caption text-medium-emphasis">{{ (item as any).chequeDate?.slice(0, 10) }}</div>
      </template>
      <template #item.direction="{ item }">
        <AppChip size="small" :color="(item as any).direction === 'ISSUED' ? 'warning' : 'info'">{{ (item as any).direction }}</AppChip>
      </template>
      <template #item.party="{ item }">{{ (item as any).payeeOrPayerName || '-' }}</template>
      <template #item.amount="{ item }">{{ formatCurrency(Number((item as any).amount)) }}</template>
      <template #item.bankAccount="{ item }">{{ (item as any).bankAccount?.accountHolderName }}</template>
      <template #item.status="{ item }">
        <AppChip size="small" :color="statusColor((item as any).status)">{{ (item as any).status }}</AppChip>
      </template>
      <template #item.actions="{ item }">
        <AppBtn
          v-if="(item as any).direction === 'RECEIVED' && (item as any).status === 'RECEIVED'"
          size="small"
          variant="text"
          @click="onDeposit(item as any)"
        >Deposit</AppBtn>
        <AppBtn
          v-if="isPresentable(item as any)"
          size="small"
          variant="text"
          @click="onPresent(item as any)"
        >Present</AppBtn>
        <AppBtn v-if="(item as any).status === 'PRESENTED'" size="small" variant="text" color="success" @click="onClear(item as any)">Clear</AppBtn>
        <AppBtn v-if="(item as any).status === 'PRESENTED'" size="small" variant="text" color="error" @click="openBounceDialog(item as any)">Bounce</AppBtn>
        <AppBtn
          v-if="['ISSUED', 'RECEIVED'].includes((item as any).status)"
          size="small"
          variant="text"
          @click="openCancelDialog(item as any, 'cancel')"
        >Cancel</AppBtn>
        <AppBtn
          v-if="(item as any).direction === 'ISSUED' && (item as any).status === 'ISSUED'"
          size="small"
          variant="text"
          color="error"
          @click="openCancelDialog(item as any, 'stop')"
        >Stop Payment</AppBtn>
      </template>
    </MasterDataTable>

    <!-- Issue Cheque -->
    <AppDialog v-model="issueDialog" :max-width="640" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Issue Cheque</AppCardTitle>
        <AppCardText>
          <AppSelect v-model="issueForm.bankAccountId" :items="bankAccountOptions" item-title="label" item-value="id" label="Bank Account" :error-messages="issueErrors.bankAccountId" class="mb-2" @update:model-value="onIssueBankChanged" />
          <AppSelect v-model="issueForm.chequeBookId" :items="chequeBookOptionsFor(issueForm.bankAccountId)" item-title="label" item-value="id" label="Cheque Book (optional)" clearable class="mb-2" @update:model-value="onChequeBookChanged" />
          <AppTextField v-model="issueForm.chequeNumber" label="Cheque Number" :error-messages="issueErrors.chequeNumber" class="mb-2" />
          <AppTextField v-model="issueForm.chequeDate" type="date" label="Cheque Date" class="mb-2" />
          <AppCheckbox v-model="issueForm.isPostDated" label="Post-Dated Cheque" class="mb-2" />
          <AppSelect v-model="issueForm.partyType" :items="partyTypeOptions" label="Party Type" clearable class="mb-2" />
          <AppTextField v-if="issueForm.partyType" v-model="issueForm.partyId" label="Linked Record ID" class="mb-2" />
          <AppTextField v-model="issueForm.payeeOrPayerName" label="Payee Name" class="mb-2" />
          <AppTextField v-model.number="issueForm.amount" type="number" label="Amount" :error-messages="issueErrors.amount" class="mb-2" />
          <AppTextarea v-model="issueForm.narration" label="Narration" rows="2" class="mb-2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="issueDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmitIssue">Issue</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Receive Cheque -->
    <AppDialog v-model="receiveDialog" :max-width="640" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Record Received Cheque</AppCardTitle>
        <AppCardText>
          <AppSelect v-model="receiveForm.bankAccountId" :items="bankAccountOptions" item-title="label" item-value="id" label="Intended Deposit Account" :error-messages="receiveErrors.bankAccountId" class="mb-2" />
          <AppTextField v-model="receiveForm.chequeNumber" label="Cheque Number" :error-messages="receiveErrors.chequeNumber" class="mb-2" />
          <AppTextField v-model="receiveForm.chequeDate" type="date" label="Cheque Date" class="mb-2" />
          <AppCheckbox v-model="receiveForm.isPostDated" label="Post-Dated Cheque" class="mb-2" />
          <AppSelect v-model="receiveForm.partyType" :items="partyTypeOptions" label="Party Type" clearable class="mb-2" />
          <AppTextField v-if="receiveForm.partyType" v-model="receiveForm.partyId" label="Linked Record ID" class="mb-2" />
          <AppTextField v-model="receiveForm.payeeOrPayerName" label="Payer Name" class="mb-2" />
          <AppTextField v-model.number="receiveForm.amount" type="number" label="Amount" :error-messages="receiveErrors.amount" class="mb-2" />
          <AppTextarea v-model="receiveForm.narration" label="Narration" rows="2" class="mb-2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="receiveDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="submitting" @click="onSubmitReceive">Record</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Bounce -->
    <AppDialog v-model="bounceDialog" :max-width="520" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Bounce Cheque {{ activeCheque?.chequeNumber }}</AppCardTitle>
        <AppCardText>
          <AppTextarea v-model="bounceForm.bounceReason" label="Bounce Reason" rows="2" :error-messages="bounceErrors.bounceReason" class="mb-2" />
          <AppTextField v-model.number="bounceForm.bounceChargeAmount" type="number" label="Bounce Charge (optional)" class="mb-2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="bounceDialog = false">Cancel</AppBtn>
          <AppBtn color="error" variant="flat" :loading="submitting" @click="onSubmitBounce">Record Bounce</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Cancel / Stop Payment -->
    <AppDialog v-model="cancelDialog" :max-width="480" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">{{ cancelMode === 'stop' ? 'Stop Payment' : 'Cancel Cheque' }} {{ activeCheque?.chequeNumber }}</AppCardTitle>
        <AppCardText>
          <AppTextarea v-model="cancelReason" label="Reason" rows="2" :error-messages="cancelError" class="mb-2" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="cancelDialog = false">Close</AppBtn>
          <AppBtn color="error" variant="flat" :loading="submitting" @click="onSubmitCancel">Confirm</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useChequeStore, useChequeBookStore, useBankAccountStore } from '@/stores/banking';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import { AppBtn, AppDialog, AppCard, AppCardTitle, AppCardText, AppCardActions, AppTextField, AppTextarea, AppSelect, AppChip, AppCheckbox } from '@/components/ui';
import type { Cheque } from '@/types/banking.types';

const store = useChequeStore();
const chequeBookStore = useChequeBookStore();
const bankAccountStore = useBankAccountStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('cheque.create');

const headers = [
  { title: 'Cheque', key: 'chequeNumber', sortable: false },
  { title: 'Direction', key: 'direction', sortable: false },
  { title: 'Party', key: 'party', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Bank Account', key: 'bankAccount', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

const directionFilterOptions = ['', 'ISSUED', 'RECEIVED'].map((v) => ({ title: v || 'All Directions', value: v }));
const statusFilterOptions = ['', 'ISSUED', 'RECEIVED', 'DEPOSITED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'CANCELLED', 'STOP_PAYMENT'].map((v) => ({
  title: v || 'All Statuses',
  value: v,
}));
const partyTypeOptions = ['CUSTOMER', 'SUPPLIER', 'DRIVER', 'EMPLOYEE', 'BANK', 'CASH', 'LOAN_PROVIDER', 'VEHICLE', 'TRIP', 'EXPENSE', 'OTHER'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}
function statusColor(status: string): string {
  return (
    { CLEARED: 'success', BOUNCED: 'error', CANCELLED: 'default', STOP_PAYMENT: 'error', PRESENTED: 'warning', DEPOSITED: 'info' }[status] || 'info'
  );
}
function isPresentable(cheque: Cheque) {
  return (cheque.direction === 'ISSUED' && cheque.status === 'ISSUED') || (cheque.direction === 'RECEIVED' && cheque.status === 'DEPOSITED');
}

const bankAccountOptions = computed(() => bankAccountStore.items.map((b) => ({ id: b.id, label: `${b.accountHolderName} (${b.accountNumber})` })));
function chequeBookOptionsFor(bankAccountId: string) {
  return chequeBookStore.items
    .filter((b) => b.bankAccountId === bankAccountId && b.isActive)
    .map((b) => ({ id: b.id, label: `${b.bookNumber} (${b.startNumber}-${b.endNumber})` }));
}

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const directionFilter = ref('');
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
  await store.fetchList({
    page: page.value,
    pageSize: pageSize.value,
    search: search.value || undefined,
    direction: directionFilter.value || undefined,
    status: statusFilter.value || undefined,
  });
}

const submitting = ref(false);

// --- Issue ---
const issueDialog = ref(false);
function blankIssueForm() {
  return {
    bankAccountId: '',
    chequeBookId: '',
    chequeNumber: '',
    chequeDate: new Date().toISOString().slice(0, 10),
    isPostDated: false,
    partyType: '',
    partyId: '',
    payeeOrPayerName: '',
    amount: undefined as number | undefined,
    narration: '',
  };
}
const issueForm = reactive(blankIssueForm());
const issueErrors = reactive({ bankAccountId: '', chequeNumber: '', amount: '' });

function openIssueDialog() {
  Object.assign(issueForm, blankIssueForm());
  Object.assign(issueErrors, { bankAccountId: '', chequeNumber: '', amount: '' });
  issueDialog.value = true;
}
async function onIssueBankChanged() {
  issueForm.chequeBookId = '';
}
async function onChequeBookChanged() {
  if (!issueForm.chequeBookId) return;
  const next = await chequeBookStore.nextAvailable(issueForm.chequeBookId);
  if (next) issueForm.chequeNumber = next;
}
function validateIssue(): boolean {
  issueErrors.bankAccountId = issueForm.bankAccountId ? '' : 'Bank Account is required';
  issueErrors.chequeNumber = issueForm.chequeNumber.trim() ? '' : 'Cheque number is required';
  issueErrors.amount = issueForm.amount && issueForm.amount > 0 ? '' : 'Amount must be greater than 0';
  return !issueErrors.bankAccountId && !issueErrors.chequeNumber && !issueErrors.amount;
}
async function onSubmitIssue() {
  if (!validateIssue()) return;
  submitting.value = true;
  try {
    await store.issue({
      bankAccountId: issueForm.bankAccountId,
      chequeBookId: issueForm.chequeBookId || undefined,
      chequeNumber: issueForm.chequeNumber,
      chequeDate: issueForm.chequeDate,
      isPostDated: issueForm.isPostDated,
      partyType: issueForm.partyType || undefined,
      partyId: issueForm.partyType ? issueForm.partyId || undefined : undefined,
      payeeOrPayerName: issueForm.payeeOrPayerName || undefined,
      amount: issueForm.amount,
      narration: issueForm.narration || undefined,
    });
    success('Cheque issued');
    issueDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to issue cheque'));
  } finally {
    submitting.value = false;
  }
}

// --- Receive ---
const receiveDialog = ref(false);
function blankReceiveForm() {
  return {
    bankAccountId: '',
    chequeNumber: '',
    chequeDate: new Date().toISOString().slice(0, 10),
    isPostDated: false,
    partyType: '',
    partyId: '',
    payeeOrPayerName: '',
    amount: undefined as number | undefined,
    narration: '',
  };
}
const receiveForm = reactive(blankReceiveForm());
const receiveErrors = reactive({ bankAccountId: '', chequeNumber: '', amount: '' });

function openReceiveDialog() {
  Object.assign(receiveForm, blankReceiveForm());
  Object.assign(receiveErrors, { bankAccountId: '', chequeNumber: '', amount: '' });
  receiveDialog.value = true;
}
function validateReceive(): boolean {
  receiveErrors.bankAccountId = receiveForm.bankAccountId ? '' : 'Deposit account is required';
  receiveErrors.chequeNumber = receiveForm.chequeNumber.trim() ? '' : 'Cheque number is required';
  receiveErrors.amount = receiveForm.amount && receiveForm.amount > 0 ? '' : 'Amount must be greater than 0';
  return !receiveErrors.bankAccountId && !receiveErrors.chequeNumber && !receiveErrors.amount;
}
async function onSubmitReceive() {
  if (!validateReceive()) return;
  submitting.value = true;
  try {
    await store.receive({
      bankAccountId: receiveForm.bankAccountId,
      chequeNumber: receiveForm.chequeNumber,
      chequeDate: receiveForm.chequeDate,
      isPostDated: receiveForm.isPostDated,
      partyType: receiveForm.partyType || undefined,
      partyId: receiveForm.partyType ? receiveForm.partyId || undefined : undefined,
      payeeOrPayerName: receiveForm.payeeOrPayerName || undefined,
      amount: receiveForm.amount,
      narration: receiveForm.narration || undefined,
    });
    success('Cheque recorded');
    receiveDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record cheque'));
  } finally {
    submitting.value = false;
  }
}

// --- Lifecycle actions ---
async function onDeposit(cheque: Cheque) {
  try {
    await store.deposit(cheque.id);
    success(`Cheque ${cheque.chequeNumber} deposited`);
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to deposit cheque'));
  }
}
async function onPresent(cheque: Cheque) {
  try {
    await store.markPresented(cheque.id);
    success(`Cheque ${cheque.chequeNumber} marked as presented`);
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to mark cheque as presented'));
  }
}
async function onClear(cheque: Cheque) {
  try {
    await store.clear(cheque.id);
    success(`Cheque ${cheque.chequeNumber} cleared`);
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to clear cheque'));
  }
}

const activeCheque = ref<Cheque | null>(null);

const bounceDialog = ref(false);
const bounceForm = reactive({ bounceReason: '', bounceChargeAmount: undefined as number | undefined });
const bounceErrors = reactive({ bounceReason: '' });
function openBounceDialog(cheque: Cheque) {
  activeCheque.value = cheque;
  Object.assign(bounceForm, { bounceReason: '', bounceChargeAmount: undefined });
  bounceErrors.bounceReason = '';
  bounceDialog.value = true;
}
async function onSubmitBounce() {
  if (!activeCheque.value) return;
  bounceErrors.bounceReason = bounceForm.bounceReason.trim() ? '' : 'A reason is required';
  if (bounceErrors.bounceReason) return;
  submitting.value = true;
  try {
    await store.bounce(activeCheque.value.id, {
      bounceReason: bounceForm.bounceReason,
      bounceChargeAmount: bounceForm.bounceChargeAmount || undefined,
    });
    success(`Cheque ${activeCheque.value.chequeNumber} bounced`);
    bounceDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record bounce'));
  } finally {
    submitting.value = false;
  }
}

const cancelDialog = ref(false);
const cancelMode = ref<'cancel' | 'stop'>('cancel');
const cancelReason = ref('');
const cancelError = ref('');
function openCancelDialog(cheque: Cheque, mode: 'cancel' | 'stop') {
  activeCheque.value = cheque;
  cancelMode.value = mode;
  cancelReason.value = '';
  cancelError.value = '';
  cancelDialog.value = true;
}
async function onSubmitCancel() {
  if (!activeCheque.value) return;
  cancelError.value = cancelReason.value.trim() ? '' : 'A reason is required';
  if (cancelError.value) return;
  submitting.value = true;
  try {
    if (cancelMode.value === 'stop') {
      await store.stopPayment(activeCheque.value.id, cancelReason.value);
      success(`Stop payment recorded for cheque ${activeCheque.value.chequeNumber}`);
    } else {
      await store.cancel(activeCheque.value.id, cancelReason.value);
      success(`Cheque ${activeCheque.value.chequeNumber} cancelled`);
    }
    cancelDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update cheque'));
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    bankAccountStore.fetchList({ pageSize: 200, isActive: 'true' }),
    chequeBookStore.fetchList({}),
  ]);
  fetchData();
});
</script>
