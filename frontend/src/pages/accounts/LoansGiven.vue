<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Loans &amp; Advances Given</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Money you lent out — to a friend, a relative, or anyone else — that is coming back. It leaves the Bank/Cash
          account you choose and is held as an asset until it is repaid; it is never counted as an expense.
        </p>
      </div>
      <AppBtn v-if="canCreate" color="primary" prepend-icon="mdi-plus" @click="openFormDialog()">Lend Money</AppBtn>
    </div>

    <div v-if="summary" class="row mb-2">
      <div class="col-12 col-sm-6 col-md-3">
        <ProfitCard label="Still Owed to You" :value="summary.totalOutstanding" icon="mdi-hand-coin-outline" color="primary" />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <ProfitCard label="Total Lent" :value="summary.totalGiven" icon="mdi-cash-fast" color="info" />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <ProfitCard label="Repaid So Far" :value="summary.totalRepaid" icon="mdi-cash-refund" color="success" />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <ProfitCard
          :label="summary.overdueCount ? `Overdue (${summary.overdueCount})` : 'Overdue'"
          :value="summary.overdueAmount"
          icon="mdi-clock-alert-outline"
          color="error"
        />
      </div>
    </div>

    <AppAlert v-if="summary && summary.writtenOffTotal > 0" type="warning" variant="tonal" density="compact" class="mb-4">
      {{ formatCurrency(summary.writtenOffTotal) }} has been written off and is no longer counted as an asset on the
      Balance Sheet.
    </AppAlert>

    <div class="d-flex flex-wrap ga-2 mb-3">
      <div style="width: 240px">
        <AppTextField v-model="filters.search" label="Search name or reference" clearable @update:model-value="onFilterChanged" />
      </div>
      <div style="width: 190px">
        <AppSelect
          v-model="filters.status"
          :items="statusOptions"
          item-title="label"
          item-value="value"
          label="Status"
          clearable
          @update:model-value="onFilterChanged"
        />
      </div>
      <div style="width: 170px">
        <AppTextField v-model="filters.from" type="date" label="From" @update:model-value="onFilterChanged" />
      </div>
      <div style="width: 170px">
        <AppTextField v-model="filters.to" type="date" label="To" @update:model-value="onFilterChanged" />
      </div>
    </div>

    <MasterDataTable
      :headers="headers"
      :items="store.items"
      :items-length="store.meta?.total || 0"
      :loading="store.loading"
      :page="page"
      @update:page="(v: number) => { page = v; fetchList(); }"
    >
      <template #item.partyName="{ item }">
        <div class="d-flex align-center ga-2">
          <span class="font-weight-medium">{{ (item as any).partyName }}</span>
          <!-- Carried over from the old books: it debited no account when it
               was registered, so editing it moves no money either. -->
          <AppChip v-if="(item as any).origin === 'OPENING'" size="x-small" variant="tonal" color="secondary">
            Opening
          </AppChip>
        </div>
        <div class="text-caption text-medium-emphasis">
          {{ (item as any).referenceNumber
          }}<span v-if="(item as any).partyContact"> · {{ (item as any).partyContact }}</span>
        </div>
      </template>
      <template #item.amount="{ item }">{{ formatCurrency((item as any).amount) }}</template>
      <template #item.repaid="{ item }">{{ formatCurrency((item as any).totals.repaid) }}</template>
      <template #item.outstanding="{ item }">
        <span class="font-weight-medium">{{ formatCurrency((item as any).totals.outstanding) }}</span>
      </template>
      <template #item.givenDate="{ item }">{{ formatDate((item as any).givenDate) }}</template>
      <template #item.expectedReturnDate="{ item }">
        <span v-if="(item as any).expectedReturnDate" :class="(item as any).totals.isOverdue ? 'text-error' : ''">
          {{ formatDate((item as any).expectedReturnDate) }}
        </span>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template #item.status="{ item }">
        <AppChip size="small" variant="tonal" :color="statusColor(item as any)">{{ statusLabel(item as any) }}</AppChip>
      </template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-format-list-bulleted" variant="text" size="small" title="Repayments" @click="openDetail(item as any)" />
        <template v-if="canEdit">
          <AppBtn
            v-if="(item as any).status === 'OUTSTANDING'"
            icon="mdi-cash-plus"
            variant="text"
            size="small"
            color="success"
            title="Record a repayment"
            @click="openRepaymentDialog(item as any)"
          />
          <AppBtn
            v-if="(item as any).status === 'WRITTEN_OFF'"
            icon="mdi-restore"
            variant="text"
            size="small"
            title="Reopen — they owe it again"
            @click="onReopen(item as any)"
          />
          <AppBtn
            v-else-if="(item as any).totals.outstanding > 0"
            icon="mdi-cancel"
            variant="text"
            size="small"
            color="warning"
            title="Write off — give up on the money"
            @click="openWriteOffDialog(item as any)"
          />
          <AppBtn icon="mdi-pencil-outline" variant="text" size="small" title="Edit" @click="openFormDialog(item as any)" />
        </template>
        <AppBtn
          v-if="canDelete"
          icon="mdi-delete-outline"
          variant="text"
          size="small"
          color="error"
          title="Delete"
          @click="openDeleteDialog(item as any)"
        />
      </template>
    </MasterDataTable>

    <!-- ------------------------------------------------------ lend / edit -->
    <MasterFormDialog
      v-model="formDialog"
      :title="editTarget ? 'Edit Loan Given' : 'Lend Money'"
      :loading="submitting"
      @submit="onSubmit"
    >
      <AppAlert type="info" variant="tonal" density="compact" class="mb-3">
        The amount leaves the Bank/Cash account below and is held as an asset until it comes back. Nothing here is
        treated as an expense, so it does not affect Profit &amp; Loss.
      </AppAlert>
      <AppTextField v-model="form.partyName" label="Given To" :error-messages="errors.partyName" class="mb-2" />
      <AppTextField v-model="form.partyContact" label="Phone / Contact (optional)" class="mb-2" />
      <AppTextField v-model.number="form.amount" type="number" label="Amount" :error-messages="errors.amount" class="mb-2" />
      <AppSelect
        v-model="form.fundAccountKey"
        :items="fundAccountOptions"
        item-title="label"
        item-value="key"
        label="Paid From"
        :error-messages="errors.fundAccountKey"
        class="mb-2"
      />
      <div class="d-flex ga-2">
        <AppTextField v-model="form.givenDate" type="date" label="Date Given" class="mb-2 flex-1-1" />
        <AppTextField
          v-model="form.expectedReturnDate"
          type="date"
          label="Expected Back By (optional)"
          hint="Used only to flag it as overdue"
          persistent-hint
          class="mb-2 flex-1-1"
        />
      </div>
      <AppTextarea v-model="form.remarks" label="Remarks" rows="2" />
    </MasterFormDialog>

    <!-- --------------------------------------------------------- repayment -->
    <MasterFormDialog
      v-model="repaymentDialog"
      :title="`Record Repayment — ${actionTarget?.partyName || ''}`"
      :loading="submitting"
      @submit="onSubmitRepayment"
    >
      <p class="text-caption text-medium-emphasis mb-3">
        {{ formatCurrency(actionTarget?.totals.outstanding || 0) }} is still owed on
        {{ actionTarget?.referenceNumber }}. The amount below is added back to the account you choose.
      </p>
      <AppTextField v-model.number="repaymentForm.amount" type="number" label="Amount Received" :error-messages="errors.amount" class="mb-2" />
      <AppSelect
        v-model="repaymentForm.fundAccountKey"
        :items="fundAccountOptions"
        item-title="label"
        item-value="key"
        label="Received Into"
        :error-messages="errors.fundAccountKey"
        class="mb-2"
      />
      <AppTextField v-model="repaymentForm.repaymentDate" type="date" label="Date Received" class="mb-2" />
      <AppTextField v-model="repaymentForm.referenceNumber" label="Reference No. (optional)" class="mb-2" />
      <AppTextField v-model="repaymentForm.remarks" label="Remarks (optional)" />
    </MasterFormDialog>

    <!-- --------------------------------------------------------- write off -->
    <MasterFormDialog
      v-model="writeOffDialog"
      :title="`Write Off — ${actionTarget?.partyName || ''}`"
      :loading="submitting"
      @submit="onSubmitWriteOff"
    >
      <AppAlert type="warning" variant="tonal" density="compact" class="mb-3">
        Writing off {{ formatCurrency(actionTarget?.totals.outstanding || 0) }} means you no longer expect it back. No
        Bank or Cash balance moves — the money already left — but it stops counting as an asset on the Balance Sheet.
        You can reopen it later.
      </AppAlert>
      <AppTextarea v-model="writeOffForm.reason" label="Reason (required)" rows="2" :error-messages="errors.reason" />
    </MasterFormDialog>

    <!-- ------------------------------------------------------ repayments -->
    <AppDialog v-model="detailDialog" max-width="640">
      <AppCard>
        <AppCardTitle class="text-h6">Repayments — {{ actionTarget?.partyName }}</AppCardTitle>
        <AppCardText>
          <div class="d-flex flex-wrap ga-4 mb-3">
            <div><span class="text-caption text-medium-emphasis">Lent</span><div class="font-weight-medium">{{ formatCurrency(actionTarget?.amount || 0) }}</div></div>
            <div><span class="text-caption text-medium-emphasis">Repaid</span><div class="font-weight-medium">{{ formatCurrency(actionTarget?.totals.repaid || 0) }}</div></div>
            <div><span class="text-caption text-medium-emphasis">Still Owed</span><div class="font-weight-medium">{{ formatCurrency(actionTarget?.totals.outstanding || 0) }}</div></div>
          </div>
          <p v-if="!actionTarget?.repayments.length" class="text-caption text-medium-emphasis mb-0">
            Nothing repaid yet.
          </p>
          <div v-else class="tblwrap">
            <AppTable density="compact">
              <thead>
                <tr>
                  <th>Date</th><th class="text-right">Amount</th><th>Reference</th>
                  <th v-if="canEdit" class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="repayment in actionTarget.repayments" :key="repayment.id">
                  <td>{{ formatDate(repayment.repaymentDate) }}</td>
                  <td class="text-right">{{ formatCurrency(repayment.amount) }}</td>
                  <td class="text-caption">{{ repayment.referenceNumber || repayment.remarks || '—' }}</td>
                  <td v-if="canEdit" class="text-right">
                    <AppBtn
                      icon="mdi-undo-variant"
                      variant="text"
                      size="small"
                      color="error"
                      title="Reverse this repayment"
                      @click="onRemoveRepayment(repayment.id)"
                    />
                  </td>
                </tr>
              </tbody>
            </AppTable>
          </div>
          <p v-if="actionTarget?.writtenOffReason" class="text-caption text-warning mt-3 mb-0">
            Written off: {{ actionTarget.writtenOffReason }}
          </p>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="detailDialog = false">Close</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Loan Given"
      message="Delete this record? Every repayment against it is reversed and the amount lent goes back to the account it came from, as though the money never left. This cannot be undone."
      confirm-text="Delete"
      :loading="submitting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Finance → Loans & Advances Given.
 *
 * The mirror of Loans & EMI: that screen is money the business BORROWED,
 * this one is money it LENT OUT. Lending is an asset swap, not a cost — the
 * cash leaves a Bank/Cash account and is held as something owed back — so
 * nothing here reaches Profit & Loss. It shows on the Balance Sheet under
 * Current Assets on its own "Loans & Advances Given" line.
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { useLoanGivenStore } from '@/stores/accounts/loansGiven';
import { useAuthStore } from '@/stores/auth.store';
import { useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency, formatDate } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import {
  AppBtn, AppSelect, AppTextField, AppTextarea, AppChip, AppAlert, AppTable,
  AppCard, AppCardTitle, AppCardText, AppCardActions, AppDialog,
} from '@/components/ui';
import { LOAN_GIVEN_STATUS_LABELS, type LoanGiven, type LoanGivenStatus } from '@/types/loansGiven.types';

const store = useLoanGivenStore();
const authStore = useAuthStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

const canCreate = authStore.hasPermission('loan_given.create');
const canEdit = authStore.hasPermission('loan_given.edit');
const canDelete = authStore.hasPermission('loan_given.delete');

const submitting = ref(false);
const summary = computed(() => store.summary);

const statusOptions = (Object.keys(LOAN_GIVEN_STATUS_LABELS) as LoanGivenStatus[]).map((value) => ({
  value,
  label: LOAN_GIVEN_STATUS_LABELS[value],
}));

/** Overdue is worth shouting about; it is derived, so it is not a status of its own. */
function statusColor(loan: LoanGiven) {
  if (loan.status === 'WRITTEN_OFF') return 'error';
  if (loan.status === 'REPAID') return 'success';
  return loan.totals.isOverdue ? 'error' : 'warning';
}
function statusLabel(loan: LoanGiven) {
  if (loan.status === 'OUTSTANDING' && loan.totals.isOverdue) return 'Overdue';
  return LOAN_GIVEN_STATUS_LABELS[loan.status];
}

const headers = [
  { title: 'Given To', key: 'partyName', sortable: false },
  { title: 'Lent', key: 'amount', sortable: false, align: 'end' as const },
  { title: 'Repaid', key: 'repaid', sortable: false, align: 'end' as const },
  { title: 'Still Owed', key: 'outstanding', sortable: false, align: 'end' as const },
  { title: 'Date Given', key: 'givenDate', sortable: false },
  { title: 'Expected Back', key: 'expectedReturnDate', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

const bankOptions = computed(() =>
  bankAccountStore.items.map((b: any) => ({
    key: `BANK:${b.id}`,
    label: `Bank — ${b.accountHolderName}${b.bankName ? ` (${b.bankName})` : ''}`,
  }))
);
const cashOptions = computed(() => cashAccountStore.items.map((c: any) => ({ key: `CASH:${c.id}`, label: `Cash — ${c.cashAccountType}` })));
const fundAccountOptions = computed(() => [...bankOptions.value, ...cashOptions.value]);

const today = () => new Date().toISOString().slice(0, 10);

const errors = reactive({ partyName: '', amount: '', fundAccountKey: '', reason: '' });
function resetErrors() {
  Object.assign(errors, { partyName: '', amount: '', fundAccountKey: '', reason: '' });
}

// ------------------------------------------------------------------- list
const page = ref(1);
const filters = reactive({ search: '', status: '' as string, from: '', to: '' });

async function fetchList() {
  await store.fetchList({
    page: page.value,
    pageSize: 10,
    search: filters.search || undefined,
    status: filters.status || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  });
}
function onFilterChanged() {
  page.value = 1;
  fetchList();
}
async function reload() {
  await Promise.all([fetchList(), store.fetchSummary()]);
}

// ------------------------------------------------------------ lend / edit
const formDialog = ref(false);
const editTarget = ref<LoanGiven | null>(null);
const form = reactive({
  partyName: '',
  partyContact: '',
  amount: undefined as number | undefined,
  fundAccountKey: '',
  givenDate: today(),
  expectedReturnDate: '',
  remarks: '',
});

function openFormDialog(loan?: LoanGiven) {
  editTarget.value = loan ?? null;
  Object.assign(form, {
    partyName: loan?.partyName || '',
    partyContact: loan?.partyContact || '',
    amount: loan?.amount,
    fundAccountKey: loan ? `${loan.fundAccountType}:${loan.fundAccountId}` : '',
    givenDate: loan ? String(loan.givenDate).slice(0, 10) : today(),
    expectedReturnDate: loan?.expectedReturnDate ? String(loan.expectedReturnDate).slice(0, 10) : '',
    remarks: loan?.remarks || '',
  });
  resetErrors();
  formDialog.value = true;
}

async function onSubmit() {
  errors.partyName = form.partyName.trim() ? '' : 'Who the money was given to is required';
  errors.amount = form.amount && form.amount > 0 ? '' : 'Amount must be greater than 0';
  errors.fundAccountKey = form.fundAccountKey ? '' : 'Choose the account the money came from';
  if (errors.partyName || errors.amount || errors.fundAccountKey) return;

  const [fundAccountType, fundAccountId] = form.fundAccountKey.split(':');
  submitting.value = true;
  try {
    const payload = {
      partyName: form.partyName,
      partyContact: form.partyContact || undefined,
      amount: form.amount,
      fundAccountType,
      fundAccountId,
      givenDate: form.givenDate,
      expectedReturnDate: form.expectedReturnDate || undefined,
      remarks: form.remarks || undefined,
    };
    if (editTarget.value) {
      await store.update(editTarget.value.id, payload);
      success('Loan given updated');
    } else {
      await store.create(payload);
      success('Recorded — the amount has left the account you chose and is now owed back to you');
    }
    formDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, editTarget.value ? 'Failed to update' : 'Failed to record the money lent'));
  } finally {
    submitting.value = false;
  }
}

// --------------------------------------------------------------- repayment
const repaymentDialog = ref(false);
const actionTarget = ref<LoanGiven | null>(null);
const repaymentForm = reactive({
  amount: undefined as number | undefined,
  fundAccountKey: '',
  repaymentDate: today(),
  referenceNumber: '',
  remarks: '',
});

function openRepaymentDialog(loan: LoanGiven) {
  actionTarget.value = loan;
  Object.assign(repaymentForm, {
    // Defaults to settling it in full — the common case is being paid back
    // the whole amount at once.
    amount: loan.totals.outstanding,
    fundAccountKey: `${loan.fundAccountType}:${loan.fundAccountId}`,
    repaymentDate: today(),
    referenceNumber: '',
    remarks: '',
  });
  resetErrors();
  repaymentDialog.value = true;
}

async function onSubmitRepayment() {
  if (!actionTarget.value) return;
  errors.amount = repaymentForm.amount && repaymentForm.amount > 0 ? '' : 'Amount must be greater than 0';
  errors.fundAccountKey = repaymentForm.fundAccountKey ? '' : 'Choose the account the money came into';
  if (errors.amount || errors.fundAccountKey) return;

  const [fundAccountType, fundAccountId] = repaymentForm.fundAccountKey.split(':');
  submitting.value = true;
  try {
    await store.recordRepayment(actionTarget.value.id, {
      amount: repaymentForm.amount,
      fundAccountType,
      fundAccountId,
      repaymentDate: repaymentForm.repaymentDate || undefined,
      referenceNumber: repaymentForm.referenceNumber || undefined,
      remarks: repaymentForm.remarks || undefined,
    });
    success('Repayment recorded');
    repaymentDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record the repayment'));
  } finally {
    submitting.value = false;
  }
}

async function onRemoveRepayment(repaymentId: string) {
  if (!actionTarget.value) return;
  try {
    const updated = await store.removeRepayment(actionTarget.value.id, repaymentId);
    actionTarget.value = updated;
    success('Repayment reversed');
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reverse the repayment'));
  }
}

// --------------------------------------------------------------- write off
const writeOffDialog = ref(false);
const writeOffForm = reactive({ reason: '' });

function openWriteOffDialog(loan: LoanGiven) {
  actionTarget.value = loan;
  writeOffForm.reason = '';
  resetErrors();
  writeOffDialog.value = true;
}

async function onSubmitWriteOff() {
  if (!actionTarget.value) return;
  errors.reason = writeOffForm.reason.trim() ? '' : 'A reason is required to write this money off';
  if (errors.reason) return;

  submitting.value = true;
  try {
    await store.writeOff(actionTarget.value.id, { reason: writeOffForm.reason });
    success('Written off — it no longer counts as an asset');
    writeOffDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to write this off'));
  } finally {
    submitting.value = false;
  }
}

async function onReopen(loan: LoanGiven) {
  try {
    await store.reopen(loan.id);
    success('Reopened — it counts as an asset again');
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reopen'));
  }
}

// ------------------------------------------------------------- repayments
const detailDialog = ref(false);
function openDetail(loan: LoanGiven) {
  actionTarget.value = loan;
  detailDialog.value = true;
}

// ----------------------------------------------------------------- delete
const deleteDialog = ref(false);
const deleteTarget = ref<LoanGiven | null>(null);

function openDeleteDialog(loan: LoanGiven) {
  deleteTarget.value = loan;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  submitting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Deleted — the money is back on the account it came from');
    deleteDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete'));
    deleteDialog.value = false;
  } finally {
    submitting.value = false;
  }
}

// ------------------------------------------------------------------- load
onMounted(async () => {
  await Promise.all([
    reload(),
    bankAccountStore.fetchList({ pageSize: 200 }),
    cashAccountStore.fetchList({ pageSize: 200 }),
  ]);
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
