<template>
  <div>
    <AppCard variant="outlined" class="pa-4 mb-4">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3">
        <div>
          <div class="text-caption text-medium-emphasis">Diesel Card Account Balance</div>
          <div class="text-h4 font-weight-bold" :class="balanceClass">
            {{ formatCurrency(store.account?.currentBalance ?? 0) }}
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            One prepaid account behind every fuel card — recharge it once and any card
            spends from this same balance.
          </div>
        </div>
        <div v-if="canEdit" class="d-flex flex-wrap ga-2">
          <AppBtn
            color="success"
            variant="tonal"
            prepend-icon="mdi-cash-plus"
            @click="openRechargeDialog"
            >Recharge</AppBtn
          >
          <AppBtn variant="tonal" prepend-icon="mdi-cash-refund" @click="openRefundDialog"
            >Refund</AppBtn
          >
          <AppBtn variant="tonal" prepend-icon="mdi-tune" @click="openAdjustDialog"
            >Adjust Balance</AppBtn
          >
        </div>
      </div>
    </AppCard>

    <AppAlert type="info" variant="tonal" density="compact" class="mb-4">
      A fill is charged to this account by recording it under
      <strong>Fuel Entries</strong> with the billing method set to
      <strong>Fuel Card</strong> or <strong>OTP</strong> — the balance drops by that
      fill's amount automatically. A fill the driver paid in cash or UPI (<strong
        >Direct Payment</strong
      >) never touches this balance.
    </AppAlert>

    <div v-if="summary" class="row mb-2">
      <div class="col-12 col-sm-6 col-md-3">
        <ProfitCard
          label="Total Recharged"
          :value="summary.totalRecharge"
          icon="mdi-cash-plus"
          color="success"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <ProfitCard
          label="Spent on Cards"
          :value="summary.totalUsage"
          icon="mdi-credit-card-outline"
          color="warning"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <ProfitCard
          label="Refunded Back"
          :value="summary.totalRefund"
          icon="mdi-cash-refund"
          color="info"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <ProfitCard
          label="Adjustments"
          :value="summary.totalAdjustment"
          icon="mdi-tune"
          color="primary"
        />
      </div>
    </div>

    <!-- ------------------------------------------------------ transactions -->
    <AppCard class="pa-4 mb-4" mt-4>
      <div class="text-subtitle-2 mb-3">Account Transactions</div>
      <div class="d-flex flex-wrap ga-2 mb-3">
        <div style="width: 200px">
          <AppSelect
            v-model="txnCardFilter"
            :items="cardOptions"
            item-title="cardNumber"
            item-value="id"
            label="Card"
            clearable
            @update:model-value="onTxnFilterChanged"
          />
        </div>
        <div style="width: 200px">
          <AppSelect
            v-model="txnVehicleFilter"
            :items="vehicleOptions"
            item-title="registrationNumber"
            item-value="id"
            label="Truck"
            clearable
            @update:model-value="onTxnFilterChanged"
          />
        </div>
        <div style="width: 170px">
          <AppSelect
            v-model="txnTypeFilter"
            :items="typeOptions"
            item-title="label"
            item-value="value"
            label="Type"
            clearable
            @update:model-value="onTxnFilterChanged"
          />
        </div>
        <div style="width: 160px">
          <AppTextField
            v-model="txnFromFilter"
            type="date"
            label="From"
            @update:model-value="onTxnFilterChanged"
          />
        </div>
        <div style="width: 160px">
          <AppTextField
            v-model="txnToFilter"
            type="date"
            label="To"
            @update:model-value="onTxnFilterChanged"
          />
        </div>
      </div>

      <MasterDataTable
        :headers="txnHeaders"
        :items="store.transactions"
        :items-length="store.transactionsMeta?.total || 0"
        :loading="store.loading"
        :page="txnPage"
        @update:page="(v: number) => { txnPage = v; fetchTransactions(); }"
      >
        <template #item.type="{ item }">
          <AppChip size="small" variant="tonal" :color="typeColor((item as any).type)">
            {{ FUEL_CARD_TRANSACTION_LABELS[(item as any).type as FuelCardTransactionType] }}
          </AppChip>
        </template>
        <template #item.amount="{ item }">
          <span :class="signedClass(item as any)">{{ signedAmount(item as any) }}</span>
        </template>
        <template
          #item.fuelCard="{ item }"
          >{{ (item as any).fuelCard?.cardNumber || '—' }}</template
        >
        <template
          #item.vehicle="{ item }"
          >{{ (item as any).vehicle?.registrationNumber || '—' }}</template
        >
        <template #item.source="{ item }">
          <span v-if="(item as any).type === 'USAGE'" class="text-caption">
            Fuel entry{{ (item as any).fuelEntry?.location ? ` — ${(item as any).fuelEntry.location}` : '' }}
          </span>
          <span
            v-else
            class="text-caption"
            >{{ (item as any).referenceNumber || (item as any).remarks || '—' }}</span
          >
        </template>
        <template
          #item.transactionDate="{ item }"
          >{{ formatDate((item as any).transactionDate) }}</template
        >
        <template #item.actions="{ item }">
          <!--
            A USAGE row belongs to the fuel entry that was billed to a card,
            so it is corrected there, on the Fuel Entries tab — editing the
            drawdown on its own would desync it from the fill behind it.
          -->
          <span
            v-if="(item as any).type === 'USAGE'"
            class="text-caption text-medium-emphasis"
            >from a fuel entry</span
          >
          <template v-else-if="canEdit">
            <AppBtn
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              title="Edit"
              @click="openEditDialog(item as any)"
            />
            <AppBtn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              color="error"
              title="Delete"
              @click="openDeleteDialog(item as any)"
            />
          </template>
        </template>
      </MasterDataTable>
    </AppCard>

    <!-- --------------------------------------------------------- card-wise -->
    <AppCard class="pa-4">
      <div class="text-subtitle-2 mb-1">What each card has spent</div>
      <p class="text-caption text-medium-emphasis mb-3">
        The balance is shared, so this is spend per card — not a balance per card.
      </p>
      <p v-if="!summary?.cardUsage.length" class="text-caption text-medium-emphasis mb-0">
        No card payments recorded yet.
      </p>
      <div v-else class="tblwrap">
        <AppTable density="compact">
          <thead>
            <tr>
              <th>Card</th>
              <th>Issued To</th>
              <th class="text-right">Fills</th>
              <th class="text-right">Total Spent</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.cardUsage" :key="row.fuelCardId || 'unassigned'">
              <td>{{ row.cardNumber }}</td>
              <td>{{ row.issuedTo || "—" }}</td>
              <td class="text-right">{{ row.transactionCount }}</td>
              <td class="text-right">{{ formatCurrency(row.totalUsage) }}</td>
            </tr>
          </tbody>
        </AppTable>
      </div>
    </AppCard>

    <!-- ---------------------------------------------------------- recharge -->
    <MasterFormDialog
      v-model="rechargeDialog"
      title="Recharge Diesel Card Account"
      :loading="submitting"
      @submit="onRecharge"
    >
      <AppAlert type="info" variant="tonal" density="compact" class="mb-3">
        The money leaves the Bank/Cash account you choose and lands on the shared card
        balance, where any card can spend it. No card is picked here on purpose.
      </AppAlert>
      <AppTextField
        v-model.number="rechargeForm.amount"
        type="number"
        label="Amount"
        :error-messages="formErrors.amount"
        class="mb-2"
      />
      <AppSelect
        v-model="rechargeForm.fundAccountKey"
        :items="fundAccountOptions"
        item-title="label"
        item-value="key"
        label="Paid From"
        :error-messages="formErrors.fundAccountKey"
        class="mb-2"
      />
      <AppTextField
        v-model="rechargeForm.transactionDate"
        type="date"
        label="Date"
        class="mb-2"
      />
      <AppTextField
        v-model="rechargeForm.referenceNumber"
        label="Reference No. (optional)"
        class="mb-2"
      />
      <AppTextField v-model="rechargeForm.remarks" label="Remarks (optional)" />
    </MasterFormDialog>

    <!-- ------------------------------------------------------------ refund -->
    <MasterFormDialog
      v-model="refundDialog"
      title="Record Card Refund"
      :loading="submitting"
      @submit="onRefund"
    >
      <AppAlert type="info" variant="tonal" density="compact" class="mb-3">
        Money the fuel company put back on the card account — a reversed swipe or a
        credit. It adds to the shared balance and does not touch any Bank/Cash account.
      </AppAlert>
      <AppTextField
        v-model.number="refundForm.amount"
        type="number"
        label="Refund Amount"
        :error-messages="formErrors.amount"
        class="mb-2"
      />
      <AppSelect
        v-model="refundForm.fuelCardId"
        :items="cardOptions"
        item-title="cardNumber"
        item-value="id"
        label="Card (optional)"
        clearable
        class="mb-2"
      />
      <AppSelect
        v-model="refundForm.vehicleId"
        :items="vehicleOptions"
        item-title="registrationNumber"
        item-value="id"
        label="Truck (optional)"
        clearable
        class="mb-2"
      />
      <AppTextField
        v-model="refundForm.transactionDate"
        type="date"
        label="Date"
        class="mb-2"
      />
      <AppTextField
        v-model="refundForm.referenceNumber"
        label="Reference No. (optional)"
        class="mb-2"
      />
      <AppTextField v-model="refundForm.remarks" label="Remarks (optional)" />
    </MasterFormDialog>

    <!-- ------------------------------------------------------------ adjust -->
    <MasterFormDialog
      v-model="adjustDialog"
      title="Adjust Card Account Balance"
      :loading="submitting"
      @submit="onAdjust"
    >
      <AppAlert type="warning" variant="tonal" density="compact" class="mb-3">
        Use this only to line the balance up with the fuel company's own statement. It
        moves the balance without any fill or payment behind it, so say why in the
        remarks.
      </AppAlert>
      <AppTextField
        v-model.number="adjustForm.amount"
        type="number"
        label="Amount"
        :error-messages="formErrors.amount"
        class="mb-2"
      />
      <AppSelect
        v-model="adjustForm.direction"
        :items="directionOptions"
        item-title="label"
        item-value="value"
        label="Direction"
        class="mb-2"
      />
      <AppTextField
        v-model="adjustForm.transactionDate"
        type="date"
        label="Date"
        class="mb-2"
      />
      <AppTextField
        v-model="adjustForm.remarks"
        label="Remarks (required)"
        :error-messages="formErrors.remarks"
      />
    </MasterFormDialog>

    <!-- -------------------------------------------------------------- edit -->
    <MasterFormDialog
      v-model="editDialog"
      :title="`Edit ${editTarget ? FUEL_CARD_TRANSACTION_LABELS[editTarget.type] : ''}`"
      :loading="submitting"
      @submit="onEditSubmit"
    >
      <AppTextField
        v-model.number="editForm.amount"
        type="number"
        label="Amount"
        :error-messages="formErrors.amount"
        class="mb-2"
      />
      <AppTextField
        v-model="editForm.transactionDate"
        type="date"
        label="Date"
        class="mb-2"
      />
      <AppSelect
        v-if="editTarget?.type === 'RECHARGE'"
        v-model="editForm.fundAccountKey"
        :items="fundAccountOptions"
        item-title="label"
        item-value="key"
        label="Paid From"
        :error-messages="formErrors.fundAccountKey"
        class="mb-2"
      />
      <template v-else-if="editTarget?.type === 'REFUND'">
        <AppSelect
          v-model="editForm.fuelCardId"
          :items="cardOptions"
          item-title="cardNumber"
          item-value="id"
          label="Card (optional)"
          clearable
          class="mb-2"
        />
        <AppSelect
          v-model="editForm.vehicleId"
          :items="vehicleOptions"
          item-title="registrationNumber"
          item-value="id"
          label="Truck (optional)"
          clearable
          class="mb-2"
        />
      </template>
      <AppTextField
        v-if="editTarget?.type !== 'ADJUSTMENT'"
        v-model="editForm.referenceNumber"
        label="Reference No. (optional)"
        class="mb-2"
      />
      <AppTextField
        v-model="editForm.remarks"
        :label="
          editTarget?.type === 'ADJUSTMENT' ? 'Remarks (required)' : 'Remarks (optional)'
        "
        :error-messages="formErrors.remarks"
      />
    </MasterFormDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Diesel Card Transaction"
      message="Delete this transaction? The card balance (and, for a recharge, the Bank/Cash account it was paid from) is reversed accordingly. This cannot be undone."
      confirm-text="Delete"
      :loading="submitting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * The Diesel / Fuel screen's Card Account tab.
 *
 * The fleet's fuel cards share one prepaid account, like the FASTag wallet:
 * recharge tops the one balance up, and a fill billed to any card draws it
 * down. Those drawdowns are not entered here — they come from the fuel
 * entry that was billed to a card on the Fuel Entries tab, so the fill and
 * the money that paid for it are recorded once. That is why USAGE rows have
 * no edit or delete button: correcting the fill corrects the balance.
 *
 * Vehicles and cards come in as props because the parent screen has already
 * loaded both — this tab should not re-fetch what is on screen beside it.
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { useFuelCardAccountStore } from '@/stores/accounts/fuelCardAccount';
import { useAuthStore } from '@/stores/auth.store';
import { useBankAccountStore, useCashAccountStore } from '@/stores/banking';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency, formatDate } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import { AppBtn, AppSelect, AppTextField, AppChip, AppCard, AppAlert, AppTable } from '@/components/ui';
import {
  FUEL_CARD_TRANSACTION_LABELS,
  type FuelCardTransaction,
  type FuelCardTransactionType,
} from '@/types/fuelCard.types';

const props = withDefaults(
  defineProps<{
    vehicleOptions?: { id: string; registrationNumber: string }[];
    cardOptions?: { id: string; cardNumber: string }[];
  }>(),
  { vehicleOptions: () => [], cardOptions: () => [] }
);

const store = useFuelCardAccountStore();
const authStore = useAuthStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

const canEdit = authStore.hasPermission('fuel_card_account.edit');
const submitting = ref(false);

const vehicleOptions = computed(() => props.vehicleOptions);
const cardOptions = computed(() => props.cardOptions);

const summary = computed(() => store.summary);
// The balance is prepaid money already handed over, so a low one means the
// next fill will be declined at the pump — worth calling out, not just
// showing.
const balanceClass = computed(() => {
  const balance = store.account?.currentBalance ?? 0;
  return balance <= 0 ? 'text-error' : balance < 5000 ? 'text-warning' : '';
});

const typeOptions = (Object.keys(FUEL_CARD_TRANSACTION_LABELS) as FuelCardTransactionType[]).map((value) => ({
  value,
  label: FUEL_CARD_TRANSACTION_LABELS[value],
}));
const directionOptions = [
  { value: 'INCREASE', label: 'Increase the balance' },
  { value: 'DECREASE', label: 'Decrease the balance' },
];

function typeColor(type: FuelCardTransactionType) {
  return ({ RECHARGE: 'success', USAGE: 'warning', REFUND: 'info', ADJUSTMENT: 'primary' } as Record<string, string>)[type] || 'default';
}

/** USAGE takes money off the balance; an ADJUSTMENT is already stored signed. */
function signedAmount(txn: FuelCardTransaction) {
  const outgoing = txn.type === 'USAGE' || txn.amount < 0;
  return `${outgoing ? '−' : '+'} ${formatCurrency(Math.abs(txn.amount))}`;
}
function signedClass(txn: FuelCardTransaction) {
  return txn.type === 'USAGE' || txn.amount < 0 ? 'text-error' : 'text-success';
}

const bankOptions = computed(() =>
  bankAccountStore.items.map((b: any) => ({
    key: `BANK:${b.id}`,
    label: `Bank — ${b.accountHolderName}${b.bankName ? ` (${b.bankName})` : ''}`,
  }))
);
const cashOptions = computed(() => cashAccountStore.items.map((c: any) => ({ key: `CASH:${c.id}`, label: `Cash — ${c.cashAccountType}` })));
const fundAccountOptions = computed(() => [...bankOptions.value, ...cashOptions.value]);

const today = () => new Date().toISOString().slice(0, 10);

// -------------------------------------------------------------- validation
const formErrors = reactive({ amount: '', fundAccountKey: '', remarks: '' });
function resetErrors() {
  Object.assign(formErrors, { amount: '', fundAccountKey: '', remarks: '' });
}
function validAmount(amount: number | undefined) {
  formErrors.amount = amount && amount > 0 ? '' : 'Amount must be greater than 0';
  return !formErrors.amount;
}

// ------------------------------------------------------------ transactions
const txnPage = ref(1);
const txnCardFilter = ref<string | null>(null);
const txnVehicleFilter = ref<string | null>(null);
const txnTypeFilter = ref<string | null>(null);
const txnFromFilter = ref('');
const txnToFilter = ref('');
const txnHeaders = [
  { title: 'Date', key: 'transactionDate', sortable: false },
  { title: 'Type', key: 'type', sortable: false },
  { title: 'Card', key: 'fuelCard', sortable: false },
  { title: 'Truck', key: 'vehicle', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false, align: 'end' as const },
  { title: 'Source / Reference', key: 'source', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

async function fetchTransactions() {
  await store.fetchTransactions({
    page: txnPage.value,
    pageSize: 10,
    fuelCardId: txnCardFilter.value || undefined,
    vehicleId: txnVehicleFilter.value || undefined,
    type: txnTypeFilter.value || undefined,
    from: txnFromFilter.value || undefined,
    to: txnToFilter.value || undefined,
  });
}
function onTxnFilterChanged() {
  txnPage.value = 1;
  fetchTransactions();
}

async function reload() {
  await Promise.all([store.fetchAccount(), store.fetchSummary(), fetchTransactions()]);
}

// ---------------------------------------------------------------- recharge
const rechargeDialog = ref(false);
const rechargeForm = reactive({
  amount: undefined as number | undefined,
  fundAccountKey: '',
  transactionDate: today(),
  referenceNumber: '',
  remarks: '',
});

function openRechargeDialog() {
  Object.assign(rechargeForm, { amount: undefined, fundAccountKey: '', transactionDate: today(), referenceNumber: '', remarks: '' });
  resetErrors();
  rechargeDialog.value = true;
}

async function onRecharge() {
  const okAmount = validAmount(rechargeForm.amount);
  formErrors.fundAccountKey = rechargeForm.fundAccountKey ? '' : 'Choose the account this is paid from';
  if (!okAmount || formErrors.fundAccountKey) return;

  const [fundAccountType, fundAccountId] = rechargeForm.fundAccountKey.split(':');
  submitting.value = true;
  try {
    await store.recharge({
      amount: rechargeForm.amount,
      fundAccountType,
      fundAccountId,
      transactionDate: rechargeForm.transactionDate || undefined,
      referenceNumber: rechargeForm.referenceNumber || undefined,
      remarks: rechargeForm.remarks || undefined,
    });
    success('Diesel card account recharged — every card can spend it');
    rechargeDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to recharge the diesel card account'));
  } finally {
    submitting.value = false;
  }
}

// ------------------------------------------------------------------ refund
const refundDialog = ref(false);
const refundForm = reactive({
  amount: undefined as number | undefined,
  fuelCardId: '',
  vehicleId: '',
  transactionDate: today(),
  referenceNumber: '',
  remarks: '',
});

function openRefundDialog() {
  Object.assign(refundForm, { amount: undefined, fuelCardId: '', vehicleId: '', transactionDate: today(), referenceNumber: '', remarks: '' });
  resetErrors();
  refundDialog.value = true;
}

async function onRefund() {
  if (!validAmount(refundForm.amount)) return;
  submitting.value = true;
  try {
    await store.refund({
      amount: refundForm.amount,
      fuelCardId: refundForm.fuelCardId || undefined,
      vehicleId: refundForm.vehicleId || undefined,
      transactionDate: refundForm.transactionDate || undefined,
      referenceNumber: refundForm.referenceNumber || undefined,
      remarks: refundForm.remarks || undefined,
    });
    success('Refund credited back to the diesel card account');
    refundDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record the refund'));
  } finally {
    submitting.value = false;
  }
}

// ------------------------------------------------------------------ adjust
const adjustDialog = ref(false);
const adjustForm = reactive({
  amount: undefined as number | undefined,
  direction: 'INCREASE',
  transactionDate: today(),
  remarks: '',
});

function openAdjustDialog() {
  Object.assign(adjustForm, { amount: undefined, direction: 'INCREASE', transactionDate: today(), remarks: '' });
  resetErrors();
  adjustDialog.value = true;
}

async function onAdjust() {
  const okAmount = validAmount(adjustForm.amount);
  formErrors.remarks = adjustForm.remarks ? '' : 'Say why the balance is being adjusted';
  if (!okAmount || formErrors.remarks) return;

  submitting.value = true;
  try {
    await store.adjust({
      amount: adjustForm.amount,
      direction: adjustForm.direction,
      transactionDate: adjustForm.transactionDate || undefined,
      remarks: adjustForm.remarks,
    });
    success('Diesel card account balance adjusted');
    adjustDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to adjust the balance'));
  } finally {
    submitting.value = false;
  }
}

// -------------------------------------------------------------------- edit
const editDialog = ref(false);
const editTarget = ref<FuelCardTransaction | null>(null);
const editForm = reactive({
  amount: undefined as number | undefined,
  fuelCardId: '',
  vehicleId: '',
  fundAccountKey: '',
  transactionDate: today(),
  referenceNumber: '',
  remarks: '',
});

function openEditDialog(txn: FuelCardTransaction) {
  editTarget.value = txn;
  Object.assign(editForm, {
    // An ADJUSTMENT is stored signed; the form edits its size and the
    // server keeps the direction it was created with.
    amount: Math.abs(txn.amount),
    fuelCardId: txn.fuelCard?.id || '',
    vehicleId: txn.vehicle?.id || '',
    fundAccountKey: txn.fundAccountType && txn.fundAccountId ? `${txn.fundAccountType}:${txn.fundAccountId}` : '',
    transactionDate: String(txn.transactionDate).slice(0, 10),
    referenceNumber: txn.referenceNumber || '',
    remarks: txn.remarks || '',
  });
  resetErrors();
  editDialog.value = true;
}

async function onEditSubmit() {
  if (!editTarget.value) return;
  const okAmount = validAmount(editForm.amount);
  formErrors.fundAccountKey =
    editTarget.value.type === 'RECHARGE' && !editForm.fundAccountKey ? 'Choose the account this is paid from' : '';
  formErrors.remarks = editTarget.value.type === 'ADJUSTMENT' && !editForm.remarks ? 'Say why the balance is being adjusted' : '';
  if (!okAmount || formErrors.fundAccountKey || formErrors.remarks) return;

  const [fundAccountType, fundAccountId] = editForm.fundAccountKey ? editForm.fundAccountKey.split(':') : [undefined, undefined];
  submitting.value = true;
  try {
    await store.updateTransaction(editTarget.value.id, {
      amount: editForm.amount,
      fuelCardId: editTarget.value.type === 'REFUND' ? editForm.fuelCardId || null : undefined,
      vehicleId: editTarget.value.type === 'REFUND' ? editForm.vehicleId || null : undefined,
      transactionDate: editForm.transactionDate || undefined,
      referenceNumber: editTarget.value.type === 'ADJUSTMENT' ? undefined : editForm.referenceNumber || null,
      remarks: editForm.remarks || null,
      fundAccountType: editTarget.value.type === 'RECHARGE' ? fundAccountType : undefined,
      fundAccountId: editTarget.value.type === 'RECHARGE' ? fundAccountId : undefined,
    });
    success('Transaction updated');
    editDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update the transaction'));
  } finally {
    submitting.value = false;
  }
}

// ------------------------------------------------------------------ delete
const deleteDialog = ref(false);
const deleteTarget = ref<FuelCardTransaction | null>(null);

function openDeleteDialog(txn: FuelCardTransaction) {
  deleteTarget.value = txn;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  submitting.value = true;
  try {
    await store.removeTransaction(deleteTarget.value.id);
    success('Transaction deleted');
    deleteDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete the transaction'));
  } finally {
    submitting.value = false;
  }
}

// -------------------------------------------------------------------- load
onMounted(async () => {
  await Promise.all([
    reload(),
    // Only needed to fill the "Paid From" picker on a recharge.
    canEdit ? bankAccountStore.fetchList({ pageSize: 200 }) : Promise.resolve(),
    canEdit ? cashAccountStore.fetchList({ pageSize: 200 }) : Promise.resolve(),
  ]);
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
