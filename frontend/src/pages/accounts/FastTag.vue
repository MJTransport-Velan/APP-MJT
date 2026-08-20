<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6 mb-0">FASTag</h2>
      <AppBtn variant="outlined" prepend-icon="mdi-file-upload-outline" @click="openImportDialog">Import Provider Statement</AppBtn>
    </div>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="wallet">Wallet</AppTab>
      <AppTab value="transactions">Transactions</AppTab>
    </AppTabs>

    <AppWindow v-model="activeTab">
      <!-- Wallet -->
      <AppWindowItem value="wallet">
        <AppCard variant="outlined" class="pa-4">
          <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-1">
            <div>
              <div class="text-caption text-medium-emphasis">Shared FASTag Wallet Balance</div>
              <div class="text-h4 font-weight-bold" :class="(store.wallet?.currentBalance ?? 0) < 500 ? 'text-error' : ''">
                {{ formatCurrency(store.wallet?.currentBalance ?? 0) }}
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                One wallet for the whole fleet — every vehicle's FASTag card draws from this same balance.
                <span v-if="store.wallet?.fastagNumber">Reference: {{ store.wallet.fastagNumber }}</span>
              </div>
            </div>
            <div class="d-flex flex-wrap ga-2">
              <AppBtn color="success" variant="tonal" prepend-icon="mdi-cash-plus" @click="openRechargeDialog">Recharge</AppBtn>
              <AppBtn variant="tonal" prepend-icon="mdi-minus-circle-outline" @click="openUsageDialog">Log Toll Usage</AppBtn>
              <AppBtn variant="tonal" prepend-icon="mdi-cash-refund" @click="openRefundDialog">Refund</AppBtn>
              <AppBtn variant="tonal" prepend-icon="mdi-tune" @click="openAdjustDialog">Adjust Balance</AppBtn>
              <AppBtn variant="text" prepend-icon="mdi-wallet-outline" @click="openWalletSummary">Summary</AppBtn>
            </div>
          </div>
        </AppCard>
      </AppWindowItem>

      <!-- Transactions -->
      <AppWindowItem value="transactions">
        <div class="d-flex justify-end mb-3">
          <AppMenu>
            <template #activator>
              <AppBtn color="primary" prepend-icon="mdi-plus" append-icon="mdi-chevron-down">New Transaction</AppBtn>
            </template>
            <div class="pa-1" style="min-width: 210px">
              <AppBtn variant="text" block class="justify-start mb-1" prepend-icon="mdi-cash-plus" @click="openRechargeDialog">Recharge</AppBtn>
              <AppBtn variant="text" block class="justify-start mb-1" prepend-icon="mdi-minus-circle-outline" @click="openUsageDialog">Log Toll Usage</AppBtn>
              <AppBtn variant="text" block class="justify-start mb-1" prepend-icon="mdi-cash-refund" @click="openRefundDialog">Refund</AppBtn>
              <AppBtn variant="text" block class="justify-start" prepend-icon="mdi-tune" @click="openAdjustDialog">Adjust Balance</AppBtn>
            </div>
          </AppMenu>
        </div>
        <div class="d-flex flex-wrap ga-2 mb-3">
          <div style="width: 220px">
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
            <AppTextField v-model="txnFromFilter" type="date" label="From" @update:model-value="onTxnFilterChanged" />
          </div>
          <div style="width: 170px">
            <AppTextField v-model="txnToFilter" type="date" label="To" @update:model-value="onTxnFilterChanged" />
          </div>
          <div style="width: 180px">
            <AppSelect v-model="txnTypeFilter" :items="['RECHARGE', 'USAGE', 'REFUND', 'ADJUSTMENT']" label="Type" clearable @update:model-value="onTxnFilterChanged" />
          </div>
          <div style="width: 200px">
            <AppSelect v-model="txnStatusFilter" :items="statusOptions" label="Status" clearable @update:model-value="onTxnFilterChanged" />
          </div>
        </div>
        <MasterDataTable :headers="txnHeaders" :items="store.transactions" :items-length="store.transactionsMeta?.total || 0" :loading="store.loading" :page="txnPage" @update:page="(v: number) => { txnPage = v; fetchTransactions(); }">
          <template #item.vehicle="{ item }">{{ (item as any).vehicle?.registrationNumber || '-' }}</template>
          <template #item.tollPlaza="{ item }">{{ (item as any).tollPlaza || '-' }}</template>
          <template #item.trip="{ item }">{{ (item as any).trip?.tripNumber || '-' }}</template>
          <template #item.status="{ item }">
            <AppChip size="small" variant="tonal" :color="statusColor((item as any).status)">{{ (item as any).status }}</AppChip>
          </template>
          <template #item.transactionDate="{ item }">{{ new Date((item as any).transactionDate).toLocaleString() }}</template>
          <template #item.actions="{ item }">
            <AppBtn icon="mdi-paperclip" variant="text" size="small" title="Attachment" @click="openAttachmentDialog(item as any)" />
            <AppBtn icon="mdi-pencil-outline" variant="text" size="small" title="Edit" @click="openEditDialog(item as any)" />
            <AppBtn icon="mdi-delete-outline" variant="text" size="small" title="Delete" @click="openDeleteDialog(item as any)" />
          </template>
        </MasterDataTable>
      </AppWindowItem>
    </AppWindow>

    <!-- Recharge -->
    <MasterFormDialog v-model="rechargeDialog" title="Recharge FastTag Wallet" :loading="recharging" @submit="onRecharge">
      <AppTextField v-model.number="rechargeForm.amount" type="number" label="Amount" :error-messages="rechargeErrors.amount" class="mb-2" />
      <AppSelect v-model="rechargeForm.fundAccountType" :items="['BANK', 'CASH']" label="Fund Account Type" clearable class="mb-2" />
      <AppTextField v-model="rechargeForm.referenceNumber" label="Reference No. (optional)" class="mb-2" />
      <AppTextField v-model="rechargeForm.remarks" label="Remarks (optional)" />
    </MasterFormDialog>

    <!-- Log Usage (Toll Deduction) -->
    <MasterFormDialog v-model="usageDialog" title="Log Toll Deduction" :loading="loggingUsage" @submit="onLogUsage">
      <AppTextField v-model="usageForm.transactionDate" type="date" label="Transaction Date" class="mb-2" />
      <AppSelect
        v-model="usageForm.vehicleId"
        :items="vehicleOptions"
        item-title="registrationNumber"
        item-value="id"
        label="Vehicle"
        :error-messages="usageErrors.vehicleId"
        class="mb-2"
      />
      <AppTextField v-model.number="usageForm.amount" type="number" label="Toll Amount" :error-messages="usageErrors.amount" class="mb-2" />
      <AppTextField v-model="usageForm.tollPlaza" label="Toll Plaza" class="mb-2" />
      <AppTextField v-model="usageForm.location" label="Location (optional)" class="mb-2" />
      <AppSelect
        v-model="usageForm.tripId"
        :items="tripOptions"
        item-title="tripNumber"
        item-value="id"
        label="Trip (required — the vehicle's current trip, else its last one)"
        :error-messages="usageErrors.tripId"
        class="mb-2"
      />
      <div class="text-caption text-medium-emphasis mb-2">
        <span v-if="resolvingUsageTrip">Checking this vehicle's current/last trip…</span>
        <span v-else-if="autoUsageTrip">
          Auto-attached to trip {{ autoUsageTrip.tripNumber }}<span v-if="autoUsageTrip.driver"> (driver {{ autoUsageTrip.driver.name }})</span>.
        </span>
        <span v-else-if="usageForm.vehicleId">This vehicle has no trips yet — a trip is required before you can log toll usage for it.</span>
        <span v-else>Select a vehicle to auto-attach its current or last trip.</span>
      </div>
      <AppTextField v-model="usageForm.transactionReference" label="Transaction Reference (optional)" class="mb-2" />
      <AppSelect v-model="usageForm.paymentSource" :items="['FASTAG_WALLET', 'BANK', 'OTHER']" label="Payment Source" class="mb-2" />
      <AppTextField v-model="usageForm.remarks" label="Remarks (optional)" />
    </MasterFormDialog>

    <!-- Refund -->
    <MasterFormDialog v-model="refundDialog" title="Record Refund" :loading="refunding" @submit="onRefund">
      <AppSelect
        v-model="refundForm.vehicleId"
        :items="vehicleOptions"
        item-title="registrationNumber"
        item-value="id"
        label="Vehicle (optional)"
        clearable
        class="mb-2"
      />
      <AppTextField v-model.number="refundForm.amount" type="number" label="Refund Amount" :error-messages="refundErrors.amount" class="mb-2" />
      <AppTextField v-model="refundForm.transactionDate" type="date" label="Date" class="mb-2" />
      <AppTextField v-model="refundForm.transactionReference" label="Reference No. (optional)" class="mb-2" />
      <AppTextField v-model="refundForm.remarks" label="Remarks (optional)" />
    </MasterFormDialog>

    <!-- Adjust -->
    <MasterFormDialog v-model="adjustDialog" title="Adjust Wallet Balance" :loading="adjusting" @submit="onAdjust">
      <AppTextField v-model.number="adjustForm.amount" type="number" label="Amount" :error-messages="adjustErrors.amount" class="mb-2" />
      <AppSelect v-model="adjustForm.direction" :items="['INCREASE', 'DECREASE']" label="Direction" class="mb-2" />
      <AppTextField v-model="adjustForm.remarks" label="Remarks (required)" :error-messages="adjustErrors.remarks" />
    </MasterFormDialog>

    <!-- Edit Transaction -->
    <MasterFormDialog v-model="editDialog" :title="`Edit ${editTarget?.type || ''} Transaction`" :loading="editing" @submit="onEditSubmit">
      <AppSelect
        v-if="editTarget && editTarget.type !== 'ADJUSTMENT'"
        v-model="editForm.vehicleId"
        :items="vehicleOptions"
        item-title="registrationNumber"
        item-value="id"
        :label="editTarget?.type === 'USAGE' ? 'Vehicle' : 'Vehicle (optional)'"
        :clearable="editTarget?.type !== 'USAGE'"
        :error-messages="editErrors.vehicleId"
        class="mb-2"
      />
      <AppTextField v-model.number="editForm.amount" type="number" label="Amount" :error-messages="editErrors.amount" class="mb-2" />
      <AppTextField v-model="editForm.transactionDate" type="date" label="Date" class="mb-2" />
      <template v-if="editTarget?.type === 'USAGE'">
        <AppTextField v-model="editForm.tollPlaza" label="Toll Plaza" class="mb-2" />
        <AppTextField v-model="editForm.location" label="Location (optional)" class="mb-2" />
        <AppSelect
          v-model="editForm.tripId"
          :items="tripOptions"
          item-title="tripNumber"
          item-value="id"
          label="Trip (required)"
          :error-messages="editErrors.tripId"
          class="mb-2"
        />
      </template>
      <AppTextField v-if="editTarget?.type !== 'ADJUSTMENT'" v-model="editForm.transactionReference" label="Transaction Reference (optional)" class="mb-2" />
      <AppSelect v-if="editTarget?.type === 'RECHARGE'" v-model="editForm.fundAccountType" :items="['BANK', 'CASH']" label="Fund Account Type" clearable class="mb-2" />
      <AppTextField v-model="editForm.remarks" label="Remarks (optional)" />
    </MasterFormDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete FastTag Transaction"
      message="Delete this transaction? The wallet balance (and, for a recharge, the Bank/Cash account it debited) will be reversed accordingly. This cannot be undone."
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />

    <!-- Wallet Summary -->
    <AppDialog v-model="walletDialog" max-width="480">
      <AppCard>
        <AppCardTitle class="text-h6">Wallet Summary</AppCardTitle>
        <AppCardText v-if="walletSummary">
          <div class="d-flex justify-space-between mb-1"><span>Current Balance</span><b>{{ formatCurrency(walletSummary.currentBalance) }}</b></div>
          <div class="d-flex justify-space-between mb-1"><span>Total Recharge</span><span>{{ formatCurrency(walletSummary.totalRecharge) }}</span></div>
          <div class="d-flex justify-space-between mb-1"><span>Total Toll Usage</span><span>{{ formatCurrency(walletSummary.totalUsage) }}</span></div>
          <div class="d-flex justify-space-between mb-1"><span>Total Refund</span><span>{{ formatCurrency(walletSummary.totalRefund) }}</span></div>
          <div class="d-flex justify-space-between"><span>Total Adjustment</span><span>{{ formatCurrency(walletSummary.totalAdjustment) }}</span></div>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="walletDialog = false">Close</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Attachment -->
    <AppDialog v-model="attachmentDialog" max-width="480">
      <AppCard>
        <AppCardTitle class="text-h6">Upload Attachment</AppCardTitle>
        <AppCardText>
          <AppFileInput v-model="attachmentFile" label="Toll Receipt / Statement" accept="image/*,application/pdf" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="attachmentDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" :loading="uploadingAttachment" @click="submitAttachment">Upload</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Import -->
    <AppDialog v-model="importDialog" max-width="520">
      <AppCard>
        <AppCardTitle class="text-h6">Import FASTag Provider Statement</AppCardTitle>
        <AppCardText>
          <p class="text-caption text-medium-emphasis mb-3">
            Upload the provider statement (.xlsx) as exported — e.g. a LIVQ/BlackBuck FASTag statement with columns
            Transaction Time, Nature (C/D), Amount, Description, Truck Number, Transaction ID. Each row posts
            straight to the shared wallet: Debit reduces the balance (and records a toll cost against the truck /
            trip that was running at the time), Credit adds to the balance. A row already imported before — same
            truck, date/time and amount, or a reference number seen before — is rejected as a duplicate, so a
            statement is safe to re-upload.
          </p>
          <ExcelExportButton
            variant="text"
            size="small"
            label="Download Sample Excel"
            class="mb-3 px-0"
            @click="downloadFastTagSample"
          />
          <AppFileInput v-model="importFile" label="File" accept=".xlsx" />
          <div v-if="importResult" class="mt-3 text-body-2">
            <div>Total rows: {{ importResult.totalRows }}</div>
            <div class="text-success">Imported: {{ importResult.successRows }}</div>
            <div v-if="importResult.failedRows" class="text-error">Rejected (duplicate/invalid): {{ importResult.failedRows }}</div>
            <ul v-if="importResult.errors?.length" class="text-caption text-error mt-1">
              <li v-for="e in importResult.errors.slice(0, 10)" :key="e.row">Row {{ e.row }}: {{ e.error }}</li>
            </ul>
          </div>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="importDialog = false">Close</AppBtn>
          <AppBtn color="primary" :loading="importing" @click="submitImport">Run Import</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import { useFastTagStore } from '@/stores/accounts/vehicleAssets';
import { useVehicleStore } from '@/stores/masters';
import { useTripStore } from '@/stores/operations';
import { tripApi } from '@/services/operations';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import { importApi } from '@/services/system/phase8';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import {
  AppTabs, AppTab, AppWindow, AppWindowItem, AppBtn, AppSelect, AppTextField, AppChip,
  AppCard, AppCardTitle, AppCardText, AppCardActions, AppDialog, AppFileInput, AppMenu,
  ExcelExportButton,
} from '@/components/ui';
import type { FastTagWalletSummary, FastTagTransaction } from '@/types/phase6.types';

const store = useFastTagStore();
const vehicleStore = useVehicleStore();
const tripStore = useTripStore();
const { success, error } = useSnackbar();

const activeTab = ref('wallet');
const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const tripOptions = ref<{ id: string; tripNumber: string }[]>([]);
const statusOptions = ['IMPORTED', 'PENDING', 'VERIFIED', 'ALLOCATED', 'RECONCILED', 'CANCELLED', 'ADJUSTED'];

function statusColor(status: string) {
  if (status === 'RECONCILED' || status === 'VERIFIED') return 'success';
  if (status === 'CANCELLED') return 'error';
  if (status === 'IMPORTED' || status === 'PENDING') return 'warning';
  return 'info';
}

async function fetchWallet() {
  await store.fetchWallet();
}

// --- Transactions tab ---
const txnPage = ref(1);
const txnVehicleFilter = ref<string | null>(null);
const txnFromFilter = ref('');
const txnToFilter = ref('');
const txnTypeFilter = ref<string | null>(null);
const txnStatusFilter = ref<string | null>(null);
const txnHeaders = [
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Type', key: 'type', sortable: false },
  { title: 'Toll Plaza', key: 'tollPlaza', sortable: false },
  { title: 'Trip', key: 'trip', sortable: false },
  { title: 'Amount', key: 'amount', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Date', key: 'transactionDate', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];
async function fetchTransactions() {
  await store.fetchTransactions({
    page: txnPage.value,
    pageSize: 10,
    vehicleId: txnVehicleFilter.value || undefined,
    from: txnFromFilter.value || undefined,
    to: txnToFilter.value || undefined,
    type: txnTypeFilter.value || undefined,
    status: txnStatusFilter.value || undefined,
  });
}
function onTxnFilterChanged() {
  txnPage.value = 1;
  fetchTransactions();
}

// --- Import ---
const importDialog = ref(false);
const importFile = ref<File | null>(null);
const importing = ref(false);
const importResult = ref<any>(null);
function openImportDialog() {
  importFile.value = null;
  importResult.value = null;
  importDialog.value = true;
}
async function submitImport() {
  if (!importFile.value) {
    error('Please select a file to import');
    return;
  }
  importing.value = true;
  try {
    const response = await importApi.run('FASTTAG_TRANSACTION', importFile.value);
    importResult.value = response.data.data;
    success('Import finished');
    fetchTransactions();
    fetchWallet();
  } catch (err) {
    error(extractErrorMessage(err, 'Import failed'));
  } finally {
    importing.value = false;
  }
}

async function downloadFastTagSample() {
  try {
    const response = await importApi.downloadSample('FASTTAG_TRANSACTION');
    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fasttag-import-sample.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to download sample file'));
  }
}

// --- Recharge ---
const rechargeDialog = ref(false);
const recharging = ref(false);
const rechargeForm = reactive({ amount: undefined as number | undefined, fundAccountType: undefined as string | undefined, referenceNumber: '', remarks: '' });
const rechargeErrors = reactive({ amount: '' });
function openRechargeDialog() {
  Object.assign(rechargeForm, { amount: undefined, fundAccountType: undefined, referenceNumber: '', remarks: '' });
  rechargeErrors.amount = '';
  rechargeDialog.value = true;
}
async function onRecharge() {
  rechargeErrors.amount = rechargeForm.amount && rechargeForm.amount > 0 ? '' : 'Amount must be greater than 0';
  if (rechargeErrors.amount) return;
  recharging.value = true;
  try {
    await store.recharge({
      amount: rechargeForm.amount,
      fundAccountType: rechargeForm.fundAccountType,
      referenceNumber: rechargeForm.referenceNumber || undefined,
      remarks: rechargeForm.remarks || undefined,
    });
    success('FastTag wallet recharged');
    rechargeDialog.value = false;
    fetchWallet();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to recharge'));
  } finally {
    recharging.value = false;
  }
}

// --- Log Usage ---
const usageDialog = ref(false);
const loggingUsage = ref(false);
const usageForm = reactive({
  vehicleId: '',
  amount: undefined as number | undefined,
  transactionDate: new Date().toISOString().slice(0, 10),
  tollPlaza: '',
  location: '',
  tripId: '',
  transactionReference: '',
  paymentSource: 'FASTAG_WALLET',
  remarks: '',
});
const usageErrors = reactive({ vehicleId: '', amount: '', tripId: '' });
function openUsageDialog() {
  Object.assign(usageForm, {
    vehicleId: '',
    amount: undefined,
    transactionDate: new Date().toISOString().slice(0, 10),
    tollPlaza: '',
    location: '',
    tripId: '',
    transactionReference: '',
    paymentSource: 'FASTAG_WALLET',
    remarks: '',
  });
  Object.assign(usageErrors, { vehicleId: '', amount: '', tripId: '' });
  autoUsageTrip.value = null;
  usageDialog.value = true;
}

// --- Live current-or-last-trip preview as Vehicle changes ---
const autoUsageTrip = ref<{ id: string; tripNumber: string; driver: { id: string; name: string; code: string } | null } | null>(null);
const resolvingUsageTrip = ref(false);
async function refreshUsageTrip() {
  if (!usageForm.vehicleId) {
    autoUsageTrip.value = null;
    usageForm.tripId = '';
    return;
  }
  resolvingUsageTrip.value = true;
  try {
    const response = await tripApi.currentOrLastForVehicle(usageForm.vehicleId);
    autoUsageTrip.value = response.data.data;
    usageForm.tripId = autoUsageTrip.value?.id || '';
    if (autoUsageTrip.value && !tripOptions.value.some((t) => t.id === autoUsageTrip.value!.id)) {
      tripOptions.value = [...tripOptions.value, { id: autoUsageTrip.value.id, tripNumber: autoUsageTrip.value.tripNumber }];
    }
  } catch {
    autoUsageTrip.value = null;
  } finally {
    resolvingUsageTrip.value = false;
  }
}
watch(
  () => usageForm.vehicleId,
  () => {
    if (usageDialog.value) refreshUsageTrip();
  }
);

async function onLogUsage() {
  usageErrors.vehicleId = usageForm.vehicleId ? '' : 'Vehicle is required';
  usageErrors.amount = usageForm.amount && usageForm.amount > 0 ? '' : 'Amount must be greater than 0';
  usageErrors.tripId = usageForm.tripId ? '' : 'This vehicle has no trip to attach — add a trip for it first';
  if (usageErrors.vehicleId || usageErrors.amount || usageErrors.tripId) return;
  loggingUsage.value = true;
  try {
    await store.logUsage({
      vehicleId: usageForm.vehicleId,
      amount: usageForm.amount,
      transactionDate: usageForm.transactionDate,
      tollPlaza: usageForm.tollPlaza || undefined,
      location: usageForm.location || undefined,
      tripId: usageForm.tripId || undefined,
      transactionReference: usageForm.transactionReference || undefined,
      paymentSource: usageForm.paymentSource,
      remarks: usageForm.remarks || undefined,
    });
    success('FastTag usage logged');
    usageDialog.value = false;
    fetchWallet();
    fetchTransactions();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to log usage'));
  } finally {
    loggingUsage.value = false;
  }
}

// --- Refund ---
const refundDialog = ref(false);
const refunding = ref(false);
const refundForm = reactive({ vehicleId: '', amount: undefined as number | undefined, transactionDate: new Date().toISOString().slice(0, 10), transactionReference: '', remarks: '' });
const refundErrors = reactive({ amount: '' });
function openRefundDialog() {
  Object.assign(refundForm, { vehicleId: '', amount: undefined, transactionDate: new Date().toISOString().slice(0, 10), transactionReference: '', remarks: '' });
  refundErrors.amount = '';
  refundDialog.value = true;
}
async function onRefund() {
  refundErrors.amount = refundForm.amount && refundForm.amount > 0 ? '' : 'Amount must be greater than 0';
  if (refundErrors.amount) return;
  refunding.value = true;
  try {
    await store.refund({
      vehicleId: refundForm.vehicleId || undefined,
      amount: refundForm.amount,
      transactionDate: refundForm.transactionDate,
      transactionReference: refundForm.transactionReference || undefined,
      remarks: refundForm.remarks || undefined,
    });
    success('Refund recorded');
    refundDialog.value = false;
    fetchWallet();
    fetchTransactions();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record refund'));
  } finally {
    refunding.value = false;
  }
}

// --- Adjust ---
const adjustDialog = ref(false);
const adjusting = ref(false);
const adjustForm = reactive({ amount: undefined as number | undefined, direction: 'INCREASE', remarks: '' });
const adjustErrors = reactive({ amount: '', remarks: '' });
function openAdjustDialog() {
  Object.assign(adjustForm, { amount: undefined, direction: 'INCREASE', remarks: '' });
  Object.assign(adjustErrors, { amount: '', remarks: '' });
  adjustDialog.value = true;
}
async function onAdjust() {
  adjustErrors.amount = adjustForm.amount && adjustForm.amount > 0 ? '' : 'Amount must be greater than 0';
  adjustErrors.remarks = adjustForm.remarks.trim() ? '' : 'Remarks are required';
  if (adjustErrors.amount || adjustErrors.remarks) return;
  adjusting.value = true;
  try {
    await store.adjust(adjustForm);
    success('Wallet balance adjusted');
    adjustDialog.value = false;
    fetchWallet();
    fetchTransactions();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to adjust balance'));
  } finally {
    adjusting.value = false;
  }
}

// --- Edit Transaction ---
const editDialog = ref(false);
const editing = ref(false);
const editTarget = ref<FastTagTransaction | null>(null);
const editForm = reactive({
  vehicleId: '' as string | null,
  amount: undefined as number | undefined,
  transactionDate: '',
  tollPlaza: '',
  location: '',
  tripId: '' as string | null,
  transactionReference: '',
  fundAccountType: undefined as string | undefined,
  remarks: '',
});
const editErrors = reactive({ vehicleId: '', amount: '', tripId: '' });
function openEditDialog(txn: FastTagTransaction) {
  editTarget.value = txn;
  Object.assign(editForm, {
    vehicleId: txn.vehicle?.id || '',
    amount: Math.abs(Number(txn.amount)),
    transactionDate: new Date(txn.transactionDate).toISOString().slice(0, 10),
    tollPlaza: txn.tollPlaza || '',
    location: txn.location || '',
    tripId: txn.trip?.id || '',
    transactionReference: txn.transactionReference || '',
    fundAccountType: txn.fundAccountType || undefined,
    remarks: txn.remarks || '',
  });
  Object.assign(editErrors, { vehicleId: '', amount: '', tripId: '' });
  editDialog.value = true;
}
async function onEditSubmit() {
  if (!editTarget.value) return;
  editErrors.vehicleId = editTarget.value.type === 'USAGE' && !editForm.vehicleId ? 'Vehicle is required' : '';
  editErrors.amount = editForm.amount && editForm.amount > 0 ? '' : 'Amount must be greater than 0';
  editErrors.tripId = editTarget.value.type === 'USAGE' && !editForm.tripId ? 'A trip is required' : '';
  if (editErrors.vehicleId || editErrors.amount || editErrors.tripId) return;
  editing.value = true;
  try {
    await store.updateTransaction(editTarget.value.id, {
      vehicleId: editTarget.value.type === 'ADJUSTMENT' ? undefined : editForm.vehicleId || null,
      amount: editForm.amount,
      transactionDate: editForm.transactionDate,
      tollPlaza: editTarget.value.type === 'USAGE' ? editForm.tollPlaza || undefined : undefined,
      location: editTarget.value.type === 'USAGE' ? editForm.location || undefined : undefined,
      tripId: editTarget.value.type === 'USAGE' ? editForm.tripId || null : undefined,
      transactionReference: editTarget.value.type !== 'ADJUSTMENT' ? editForm.transactionReference || undefined : undefined,
      fundAccountType: editTarget.value.type === 'RECHARGE' ? editForm.fundAccountType : undefined,
      remarks: editForm.remarks || undefined,
    });
    success('Transaction updated');
    editDialog.value = false;
    fetchWallet();
    fetchTransactions();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update transaction'));
  } finally {
    editing.value = false;
  }
}

// --- Delete Transaction ---
const deleteDialog = ref(false);
const deleteTarget = ref<FastTagTransaction | null>(null);
const deleting = ref(false);
function openDeleteDialog(txn: FastTagTransaction) {
  deleteTarget.value = txn;
  deleteDialog.value = true;
}
async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.removeTransaction(deleteTarget.value.id);
    success('Transaction deleted');
    deleteDialog.value = false;
    fetchWallet();
    fetchTransactions();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete transaction'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

// --- Wallet Summary ---
const walletDialog = ref(false);
const walletSummary = ref<FastTagWalletSummary | null>(null);
async function openWalletSummary() {
  walletSummary.value = null;
  walletDialog.value = true;
  try {
    walletSummary.value = await store.walletSummary();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to fetch wallet summary'));
  }
}

// --- Attachment ---
const attachmentDialog = ref(false);
const attachmentTarget = ref<any>(null);
const attachmentFile = ref<File | null>(null);
const uploadingAttachment = ref(false);
function openAttachmentDialog(txn: any) {
  attachmentTarget.value = txn;
  attachmentFile.value = null;
  attachmentDialog.value = true;
}
async function submitAttachment() {
  if (!attachmentTarget.value || !attachmentFile.value) {
    error('Please select a file to upload');
    return;
  }
  uploadingAttachment.value = true;
  try {
    await store.uploadTransactionAttachment(attachmentTarget.value.id, attachmentFile.value);
    success('Attachment uploaded');
    attachmentDialog.value = false;
    fetchTransactions();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload attachment'));
  } finally {
    uploadingAttachment.value = false;
  }
}

onMounted(async () => {
  await Promise.all([vehicleStore.fetchList({ pageSize: 200 }), tripStore.fetchList({ pageSize: 100 })]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  tripOptions.value = tripStore.items.map((t: any) => ({ id: t.id, tripNumber: t.tripNumber }));
  fetchWallet();
  fetchTransactions();
});
</script>
