<template>
  <div>
    <AppCard variant="outlined" class="pa-4 mb-4">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3">
        <div>
          <div class="text-caption text-medium-emphasis">AdBlue In Stock</div>
          <div class="text-h4 font-weight-bold" :class="stockClass">
            {{ (store.stock?.currentQuantityLiters ?? 0).toFixed(2) }} L
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            Worth {{ formatCurrency(store.stock?.currentValue ?? 0) }}<span v-if="averageRate">
              · {{ formatCurrency(averageRate) }} / L average</span
            >
          </div>
          <div class="text-caption text-medium-emphasis">
            One store for the whole fleet — buy the drums once, and any truck draws from these same litres.
          </div>
        </div>
        <div v-if="canEdit" class="d-flex flex-wrap ga-2">
          <AppBtn color="success" variant="tonal" prepend-icon="mdi-package-down" @click="openPurchaseDialog">Purchase Stock</AppBtn>
          <AppBtn variant="tonal" prepend-icon="mdi-package-up" @click="openReturnDialog">Return to Supplier</AppBtn>
          <AppBtn variant="tonal" prepend-icon="mdi-tune" @click="openAdjustDialog">Adjust Stock</AppBtn>
        </div>
      </div>
    </AppCard>

    <AppAlert type="info" variant="tonal" density="compact" class="mb-4">
      Litres leave this store by recording an AdBlue entry with the source set to <strong>From Stock</strong> — the
      quantity comes off the shelf automatically and is costed at the average rate above. A top-up bought at a pump on
      the road (<strong>Direct Purchase</strong>) never touches this store.
    </AppAlert>

    <div v-if="summary" class="row mb-2">
      <div class="col-12 col-sm-6 col-md-3">
        <ProfitCard label="Purchased" :value="summary.purchased.amount" icon="mdi-package-down" color="success" />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <ProfitCard label="Issued to Trucks" :value="summary.issued.amount" icon="mdi-truck-outline" color="warning" />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <ProfitCard label="Returned" :value="summary.returned.amount" icon="mdi-package-up" color="info" />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <ProfitCard label="Adjustments" :value="summary.adjusted.amount" icon="mdi-tune" color="primary" />
      </div>
    </div>
    <p v-if="summary" class="text-caption text-medium-emphasis mb-4">
      {{ summary.purchased.quantityLiters.toFixed(2) }} L bought ·
      {{ summary.issued.quantityLiters.toFixed(2) }} L issued ·
      {{ summary.returned.quantityLiters.toFixed(2) }} L returned ·
      {{ summary.adjusted.quantityLiters.toFixed(2) }} L adjusted
    </p>

    <!-- ------------------------------------------------------ transactions -->
    <AppCard class="pa-4 mb-4">
      <div class="text-subtitle-2 mb-3">Stock Movements</div>
      <div class="d-flex flex-wrap ga-2 mb-3">
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
        <div style="width: 200px">
          <AppSelect
            v-model="txnSupplierFilter"
            :items="supplierOptions"
            item-title="name"
            item-value="id"
            label="Supplier"
            clearable
            @update:model-value="onTxnFilterChanged"
          />
        </div>
        <div style="width: 190px">
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
          <AppTextField v-model="txnFromFilter" type="date" label="From" @update:model-value="onTxnFilterChanged" />
        </div>
        <div style="width: 160px">
          <AppTextField v-model="txnToFilter" type="date" label="To" @update:model-value="onTxnFilterChanged" />
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
            {{ ADBLUE_STOCK_TRANSACTION_LABELS[(item as any).type as AdBlueStockTransactionType] }}
          </AppChip>
        </template>
        <template #item.quantityLiters="{ item }">
          <span :class="signedClass(item as any)">{{ signedQuantity(item as any) }}</span>
        </template>
        <template #item.amount="{ item }">
          <span :class="signedClass(item as any)">{{ signedAmount(item as any) }}</span>
        </template>
        <template #item.ratePerLiter="{ item }">
          <span v-if="(item as any).ratePerLiter != null">{{ formatCurrency((item as any).ratePerLiter) }}</span>
          <span v-else class="text-medium-emphasis">—</span>
        </template>
        <template #item.vehicle="{ item }">{{ (item as any).vehicle?.registrationNumber || '—' }}</template>
        <template #item.source="{ item }">
          <span v-if="(item as any).type === 'ISSUE'" class="text-caption">
            AdBlue entry{{ (item as any).adBlueEntry?.location ? ` — ${(item as any).adBlueEntry.location}` : '' }}
          </span>
          <span v-else class="text-caption">
            {{ (item as any).supplier?.name || (item as any).invoiceNumber || (item as any).referenceNumber || (item as any).remarks || '—' }}
          </span>
        </template>
        <template #item.transactionDate="{ item }">{{ formatDate((item as any).transactionDate) }}</template>
        <template #item.actions="{ item }">
          <!--
            An ISSUE row belongs to the AdBlue entry that was filled from
            stock, so it is corrected there, on the Entries tab — editing
            the withdrawal on its own would desync it from the top-up.
          -->
          <span v-if="(item as any).type === 'ISSUE'" class="text-caption text-medium-emphasis">from an entry</span>
          <template v-else-if="canEdit">
            <AppBtn icon="mdi-pencil-outline" variant="text" size="small" title="Edit" @click="openEditDialog(item as any)" />
            <AppBtn icon="mdi-delete-outline" variant="text" size="small" color="error" title="Delete" @click="openDeleteDialog(item as any)" />
          </template>
        </template>
      </MasterDataTable>
    </AppCard>

    <!-- ------------------------------------------------------- vehicle-wise -->
    <AppCard class="pa-4">
      <div class="text-subtitle-2 mb-1">What each truck has drawn from stock</div>
      <p class="text-caption text-medium-emphasis mb-3">
        The store is shared, so this is consumption per truck — not a stock per truck. Roadside top-ups are not counted
        here; they never came out of this store.
      </p>
      <p v-if="!summary?.vehicleUsage.length" class="text-caption text-medium-emphasis mb-0">
        Nothing has been issued from stock yet.
      </p>
      <div v-else class="tblwrap">
        <AppTable density="compact">
          <thead>
            <tr>
              <th>Truck</th>
              <th class="text-right">Issues</th>
              <th class="text-right">Litres</th>
              <th class="text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.vehicleUsage" :key="row.vehicleId || 'unassigned'">
              <td>{{ row.registrationNumber }}</td>
              <td class="text-right">{{ row.transactionCount }}</td>
              <td class="text-right">{{ row.totalLiters.toFixed(2) }} L</td>
              <td class="text-right">{{ formatCurrency(row.totalValue) }}</td>
            </tr>
          </tbody>
        </AppTable>
      </div>
    </AppCard>

    <!-- ---------------------------------------------------------- purchase -->
    <MasterFormDialog v-model="purchaseDialog" title="Purchase AdBlue Stock" :loading="submitting" @submit="onPurchase">
      <AppAlert type="info" variant="tonal" density="compact" class="mb-3">
        The money leaves the Bank/Cash account you choose and comes back as litres on the shelf. No truck is picked here
        — whichever truck needs them draws them later through an AdBlue entry.
      </AppAlert>
      <AppTextField
        v-model.number="purchaseForm.quantityLiters"
        type="number"
        label="Quantity (L)"
        :error-messages="formErrors.quantityLiters"
        class="mb-2"
      />
      <div class="row row-dense">
        <div class="col-6">
          <AppTextField v-model.number="purchaseForm.amount" type="number" label="Amount Paid" :error-messages="formErrors.amount" />
        </div>
        <div class="col-6">
          <AppTextField v-model.number="purchaseForm.ratePerLiter" type="number" label="Rate / Litre" />
        </div>
      </div>
      <div class="text-caption text-medium-emphasis mb-2">{{ purchaseHint }}</div>
      <AppSelect
        v-model="purchaseForm.fundAccountKey"
        :items="fundAccountOptions"
        item-title="label"
        item-value="key"
        label="Paid From"
        :error-messages="formErrors.fundAccountKey"
        class="mb-2"
      />
      <AppSelect
        v-model="purchaseForm.supplierId"
        :items="supplierOptions"
        item-title="name"
        item-value="id"
        label="Supplier (optional)"
        clearable
        class="mb-2"
      />
      <AppTextField v-model="purchaseForm.transactionDate" type="date" label="Date" class="mb-2" />
      <div class="row row-dense">
        <div class="col-6">
          <AppTextField v-model="purchaseForm.invoiceNumber" label="Invoice No. (optional)" />
        </div>
        <div class="col-6">
          <AppTextField v-model="purchaseForm.referenceNumber" label="Reference No. (optional)" />
        </div>
      </div>
      <AppTextField v-model="purchaseForm.remarks" label="Remarks (optional)" />
    </MasterFormDialog>

    <!-- ------------------------------------------------------------ return -->
    <MasterFormDialog v-model="returnDialog" title="Return AdBlue to Supplier" :loading="submitting" @submit="onReturn">
      <AppAlert type="info" variant="tonal" density="compact" class="mb-3">
        Litres going back to the supplier — a leaking drum, a short delivery credited. They come off the shelf at the
        store's own average rate ({{ averageRate ? formatCurrency(averageRate) : '—' }} / L) and the money returns to the
        Bank/Cash account you choose.
      </AppAlert>
      <AppTextField
        v-model.number="returnForm.quantityLiters"
        type="number"
        label="Quantity (L)"
        :error-messages="formErrors.quantityLiters"
        class="mb-2"
      />
      <div v-if="returnValue != null" class="text-caption text-medium-emphasis mb-2">
        That comes to {{ formatCurrency(returnValue) }}.
      </div>
      <AppSelect
        v-model="returnForm.fundAccountKey"
        :items="fundAccountOptions"
        item-title="label"
        item-value="key"
        label="Refunded To"
        :error-messages="formErrors.fundAccountKey"
        class="mb-2"
      />
      <AppSelect
        v-model="returnForm.supplierId"
        :items="supplierOptions"
        item-title="name"
        item-value="id"
        label="Supplier (optional)"
        clearable
        class="mb-2"
      />
      <AppTextField v-model="returnForm.transactionDate" type="date" label="Date" class="mb-2" />
      <AppTextField v-model="returnForm.referenceNumber" label="Reference No. (optional)" class="mb-2" />
      <AppTextField v-model="returnForm.remarks" label="Remarks (optional)" />
    </MasterFormDialog>

    <!-- ------------------------------------------------------------ adjust -->
    <MasterFormDialog v-model="adjustDialog" title="Adjust AdBlue Stock" :loading="submitting" @submit="onAdjust">
      <AppAlert type="warning" variant="tonal" density="compact" class="mb-3">
        Use this only to line the book stock up with a physical count — spillage, evaporation, a mis-measured drum. It
        moves the stock with no purchase or top-up behind it, so say why in the remarks.
      </AppAlert>
      <AppTextField
        v-model.number="adjustForm.quantityLiters"
        type="number"
        label="Quantity (L)"
        :error-messages="formErrors.quantityLiters"
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
        v-model.number="adjustForm.ratePerLiter"
        type="number"
        :label="averageRate ? `Rate / Litre (optional — defaults to ${averageRate})` : 'Rate / Litre (required — the store is empty)'"
        :error-messages="formErrors.ratePerLiter"
        class="mb-2"
      />
      <AppTextField v-model="adjustForm.transactionDate" type="date" label="Date" class="mb-2" />
      <AppTextField v-model="adjustForm.remarks" label="Remarks (required)" :error-messages="formErrors.remarks" />
    </MasterFormDialog>

    <!-- -------------------------------------------------------------- edit -->
    <MasterFormDialog
      v-model="editDialog"
      :title="`Edit ${editTarget ? ADBLUE_STOCK_TRANSACTION_LABELS[editTarget.type] : ''}`"
      :loading="submitting"
      @submit="onEditSubmit"
    >
      <AppTextField
        v-model.number="editForm.quantityLiters"
        type="number"
        label="Quantity (L)"
        :error-messages="formErrors.quantityLiters"
        class="mb-2"
      />
      <div class="row row-dense">
        <div class="col-6">
          <AppTextField v-model.number="editForm.amount" type="number" label="Amount" :error-messages="formErrors.amount" />
        </div>
        <div class="col-6">
          <AppTextField v-model.number="editForm.ratePerLiter" type="number" label="Rate / Litre" />
        </div>
      </div>
      <AppTextField v-model="editForm.transactionDate" type="date" label="Date" class="mb-2" />
      <AppSelect
        v-if="editTarget?.type !== 'ADJUSTMENT'"
        v-model="editForm.fundAccountKey"
        :items="fundAccountOptions"
        item-title="label"
        item-value="key"
        :label="editTarget?.type === 'RETURN' ? 'Refunded To' : 'Paid From'"
        :error-messages="formErrors.fundAccountKey"
        class="mb-2"
      />
      <AppSelect
        v-if="editTarget?.type !== 'ADJUSTMENT'"
        v-model="editForm.supplierId"
        :items="supplierOptions"
        item-title="name"
        item-value="id"
        label="Supplier (optional)"
        clearable
        class="mb-2"
      />
      <AppTextField v-if="editTarget?.type === 'PURCHASE'" v-model="editForm.invoiceNumber" label="Invoice No. (optional)" class="mb-2" />
      <AppTextField v-if="editTarget?.type !== 'ADJUSTMENT'" v-model="editForm.referenceNumber" label="Reference No. (optional)" class="mb-2" />
      <AppTextField
        v-model="editForm.remarks"
        :label="editTarget?.type === 'ADJUSTMENT' ? 'Remarks (required)' : 'Remarks (optional)'"
        :error-messages="formErrors.remarks"
      />
    </MasterFormDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete AdBlue Stock Movement"
      message="Delete this movement? The stock on hand (and, for a purchase or return, the Bank/Cash account the money moved through) is reversed accordingly. This cannot be undone."
      confirm-text="Delete"
      :loading="submitting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * The AdBlue screen's Stock tab.
 *
 * The fleet buys AdBlue in drums and keeps them at the yard; every truck
 * that is topped up from stock draws from this one store, like the FASTag
 * wallet and the diesel card account. Those withdrawals are not entered
 * here — they come from the AdBlue entry that was filled from stock on the
 * Entries tab, so the top-up and the litres it consumed are recorded once.
 * That is why ISSUE rows have no edit or delete button: correcting the
 * entry corrects the stock.
 *
 * The store values what it holds, so litres and rupees always move
 * together: a withdrawal is priced at the running weighted average
 * (value ÷ litres), never at whatever the newest drum happened to cost.
 *
 * Vehicles and suppliers come in as props because the parent screen has
 * already loaded both — this tab should not re-fetch what is on screen
 * beside it.
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { useAdBlueStockStore } from '@/stores/fleet';
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
  ADBLUE_STOCK_TRANSACTION_LABELS,
  type AdBlueStockTransaction,
  type AdBlueStockTransactionType,
} from '@/types/adBlue.types';

const props = withDefaults(
  defineProps<{
    vehicleOptions?: { id: string; registrationNumber: string }[];
    supplierOptions?: { id: string; name: string }[];
  }>(),
  { vehicleOptions: () => [], supplierOptions: () => [] }
);

const emit = defineEmits<{ (e: 'changed'): void }>();

const store = useAdBlueStockStore();
const authStore = useAuthStore();
const bankAccountStore = useBankAccountStore();
const cashAccountStore = useCashAccountStore();
const { success, error } = useSnackbar();

const canEdit = authStore.hasPermission('adblue_stock.edit');
const submitting = ref(false);

const vehicleOptions = computed(() => props.vehicleOptions);
const supplierOptions = computed(() => props.supplierOptions);

const summary = computed(() => store.summary);
const averageRate = computed(() => store.stock?.averageRatePerLiter ?? null);

// Running out is an operational problem, not just a number: a truck that
// cannot be topped up derates and crawls home, so a low store is worth
// calling out rather than only showing.
const stockClass = computed(() => {
  const litres = store.stock?.currentQuantityLiters ?? 0;
  return litres <= 0 ? 'text-error' : litres < 50 ? 'text-warning' : '';
});

const typeOptions = (Object.keys(ADBLUE_STOCK_TRANSACTION_LABELS) as AdBlueStockTransactionType[]).map((value) => ({
  value,
  label: ADBLUE_STOCK_TRANSACTION_LABELS[value],
}));
const directionOptions = [
  { value: 'INCREASE', label: 'Increase the stock' },
  { value: 'DECREASE', label: 'Decrease the stock' },
];

function typeColor(type: AdBlueStockTransactionType) {
  return (
    ({ PURCHASE: 'success', ISSUE: 'warning', RETURN: 'info', ADJUSTMENT: 'primary' } as Record<string, string>)[type] ||
    'default'
  );
}

/** ISSUE and RETURN take litres off the shelf; an ADJUSTMENT is already stored signed. */
function isOutgoing(txn: AdBlueStockTransaction) {
  return txn.type === 'ISSUE' || txn.type === 'RETURN' || txn.quantityLiters < 0;
}
function signedQuantity(txn: AdBlueStockTransaction) {
  return `${isOutgoing(txn) ? '−' : '+'} ${Math.abs(txn.quantityLiters).toFixed(2)} L`;
}
function signedAmount(txn: AdBlueStockTransaction) {
  return `${isOutgoing(txn) ? '−' : '+'} ${formatCurrency(Math.abs(txn.amount))}`;
}
function signedClass(txn: AdBlueStockTransaction) {
  return isOutgoing(txn) ? 'text-error' : 'text-success';
}

const bankOptions = computed(() =>
  bankAccountStore.items.map((b: any) => ({
    key: `BANK:${b.id}`,
    label: `Bank — ${b.accountHolderName}${b.bankName ? ` (${b.bankName})` : ''}`,
  }))
);
const cashOptions = computed(() =>
  cashAccountStore.items.map((c: any) => ({ key: `CASH:${c.id}`, label: `Cash — ${c.cashAccountType}` }))
);
const fundAccountOptions = computed(() => [...bankOptions.value, ...cashOptions.value]);

const today = () => new Date().toISOString().slice(0, 10);

// -------------------------------------------------------------- validation
const formErrors = reactive({ quantityLiters: '', amount: '', ratePerLiter: '', fundAccountKey: '', remarks: '' });
function resetErrors() {
  Object.assign(formErrors, { quantityLiters: '', amount: '', ratePerLiter: '', fundAccountKey: '', remarks: '' });
}
function validQuantity(quantity: number | undefined) {
  formErrors.quantityLiters = quantity && quantity > 0 ? '' : 'Quantity must be greater than 0';
  return !formErrors.quantityLiters;
}

// ------------------------------------------------------------ transactions
const txnPage = ref(1);
const txnVehicleFilter = ref<string | null>(null);
const txnSupplierFilter = ref<string | null>(null);
const txnTypeFilter = ref<string | null>(null);
const txnFromFilter = ref('');
const txnToFilter = ref('');
const txnHeaders = [
  { title: 'Date', key: 'transactionDate', sortable: false },
  { title: 'Type', key: 'type', sortable: false },
  { title: 'Truck', key: 'vehicle', sortable: false },
  { title: 'Quantity', key: 'quantityLiters', sortable: false, align: 'end' as const },
  { title: 'Rate / L', key: 'ratePerLiter', sortable: false, align: 'end' as const },
  { title: 'Value', key: 'amount', sortable: false, align: 'end' as const },
  { title: 'Source / Reference', key: 'source', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

async function fetchTransactions() {
  await store.fetchTransactions({
    page: txnPage.value,
    pageSize: 10,
    vehicleId: txnVehicleFilter.value || undefined,
    supplierId: txnSupplierFilter.value || undefined,
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
  await Promise.all([store.fetchStock(), store.fetchSummary(), fetchTransactions()]);
  // Buying or adjusting stock moves the average rate, which is what the
  // Entries tab quotes for a from-stock top-up.
  emit('changed');
}

// Exposed so the parent can pull the store in again after an entry that
// drew from it — the numbers on this tab move without it being touched.
defineExpose({ reload });

// ---------------------------------------------------------------- purchase
const purchaseDialog = ref(false);
const purchaseForm = reactive({
  quantityLiters: undefined as number | undefined,
  amount: undefined as number | undefined,
  ratePerLiter: undefined as number | undefined,
  fundAccountKey: '',
  supplierId: '',
  transactionDate: today(),
  invoiceNumber: '',
  referenceNumber: '',
  remarks: '',
});

/** Mirrors the server: the money paid wins, and whichever figure is missing is worked out from the other. */
const purchaseHint = computed(() => {
  const { quantityLiters, amount, ratePerLiter } = purchaseForm;
  if (!quantityLiters) return 'Enter the litres bought, then the amount paid or the rate per litre.';
  if (amount) return `Works out to ${formatCurrency(Number((amount / quantityLiters).toFixed(2)))} / L.`;
  if (ratePerLiter) return `Works out to ${formatCurrency(Number((quantityLiters * ratePerLiter).toFixed(2)))} in total.`;
  return 'Enter the amount paid or the rate per litre.';
});

function openPurchaseDialog() {
  Object.assign(purchaseForm, {
    quantityLiters: undefined,
    amount: undefined,
    ratePerLiter: undefined,
    fundAccountKey: '',
    supplierId: '',
    transactionDate: today(),
    invoiceNumber: '',
    referenceNumber: '',
    remarks: '',
  });
  resetErrors();
  purchaseDialog.value = true;
}

async function onPurchase() {
  const okQuantity = validQuantity(purchaseForm.quantityLiters);
  formErrors.amount =
    purchaseForm.amount || purchaseForm.ratePerLiter ? '' : 'Enter the amount paid or the rate per litre';
  formErrors.fundAccountKey = purchaseForm.fundAccountKey ? '' : 'Choose the account this is paid from';
  if (!okQuantity || formErrors.amount || formErrors.fundAccountKey) return;

  const [fundAccountType, fundAccountId] = purchaseForm.fundAccountKey.split(':');
  submitting.value = true;
  try {
    await store.purchase({
      quantityLiters: purchaseForm.quantityLiters,
      amount: purchaseForm.amount || undefined,
      ratePerLiter: purchaseForm.ratePerLiter || undefined,
      supplierId: purchaseForm.supplierId || undefined,
      fundAccountType,
      fundAccountId,
      transactionDate: purchaseForm.transactionDate || undefined,
      invoiceNumber: purchaseForm.invoiceNumber || undefined,
      referenceNumber: purchaseForm.referenceNumber || undefined,
      remarks: purchaseForm.remarks || undefined,
    });
    success('AdBlue stock purchased — any truck can draw from it');
    purchaseDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record the AdBlue purchase'));
  } finally {
    submitting.value = false;
  }
}

// ------------------------------------------------------------------ return
const returnDialog = ref(false);
const returnForm = reactive({
  quantityLiters: undefined as number | undefined,
  fundAccountKey: '',
  supplierId: '',
  transactionDate: today(),
  referenceNumber: '',
  remarks: '',
});

const returnValue = computed(() => {
  if (!returnForm.quantityLiters || averageRate.value == null) return null;
  return Number((returnForm.quantityLiters * averageRate.value).toFixed(2));
});

function openReturnDialog() {
  Object.assign(returnForm, {
    quantityLiters: undefined,
    fundAccountKey: '',
    supplierId: '',
    transactionDate: today(),
    referenceNumber: '',
    remarks: '',
  });
  resetErrors();
  returnDialog.value = true;
}

async function onReturn() {
  const okQuantity = validQuantity(returnForm.quantityLiters);
  formErrors.fundAccountKey = returnForm.fundAccountKey ? '' : 'Choose the account the refund goes to';
  if (!okQuantity || formErrors.fundAccountKey) return;

  const [fundAccountType, fundAccountId] = returnForm.fundAccountKey.split(':');
  submitting.value = true;
  try {
    await store.returnToSupplier({
      quantityLiters: returnForm.quantityLiters,
      supplierId: returnForm.supplierId || undefined,
      fundAccountType,
      fundAccountId,
      transactionDate: returnForm.transactionDate || undefined,
      referenceNumber: returnForm.referenceNumber || undefined,
      remarks: returnForm.remarks || undefined,
    });
    success('AdBlue returned to the supplier');
    returnDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record the return'));
  } finally {
    submitting.value = false;
  }
}

// ------------------------------------------------------------------ adjust
const adjustDialog = ref(false);
const adjustForm = reactive({
  quantityLiters: undefined as number | undefined,
  direction: 'INCREASE',
  ratePerLiter: undefined as number | undefined,
  transactionDate: today(),
  remarks: '',
});

function openAdjustDialog() {
  Object.assign(adjustForm, {
    quantityLiters: undefined,
    direction: 'INCREASE',
    ratePerLiter: undefined,
    transactionDate: today(),
    remarks: '',
  });
  resetErrors();
  adjustDialog.value = true;
}

async function onAdjust() {
  const okQuantity = validQuantity(adjustForm.quantityLiters);
  formErrors.remarks = adjustForm.remarks ? '' : 'Say why the stock is being adjusted';
  // An empty store has no average to value the adjustment at, so the rate
  // has to be given — the same rule the server enforces.
  formErrors.ratePerLiter =
    averageRate.value == null && !adjustForm.ratePerLiter ? 'The store is empty, so enter a rate per litre' : '';
  if (!okQuantity || formErrors.remarks || formErrors.ratePerLiter) return;

  submitting.value = true;
  try {
    await store.adjust({
      quantityLiters: adjustForm.quantityLiters,
      direction: adjustForm.direction,
      ratePerLiter: adjustForm.ratePerLiter || undefined,
      transactionDate: adjustForm.transactionDate || undefined,
      remarks: adjustForm.remarks,
    });
    success('AdBlue stock adjusted');
    adjustDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to adjust the stock'));
  } finally {
    submitting.value = false;
  }
}

// -------------------------------------------------------------------- edit
const editDialog = ref(false);
const editTarget = ref<AdBlueStockTransaction | null>(null);
const editForm = reactive({
  quantityLiters: undefined as number | undefined,
  amount: undefined as number | undefined,
  ratePerLiter: undefined as number | undefined,
  supplierId: '',
  fundAccountKey: '',
  transactionDate: today(),
  invoiceNumber: '',
  referenceNumber: '',
  remarks: '',
});

function openEditDialog(txn: AdBlueStockTransaction) {
  editTarget.value = txn;
  Object.assign(editForm, {
    // An ADJUSTMENT is stored signed; the form edits its size and the
    // server keeps the direction it was created with.
    quantityLiters: Math.abs(txn.quantityLiters),
    amount: Math.abs(txn.amount),
    ratePerLiter: txn.ratePerLiter ?? undefined,
    supplierId: txn.supplier?.id || '',
    fundAccountKey: txn.fundAccountType && txn.fundAccountId ? `${txn.fundAccountType}:${txn.fundAccountId}` : '',
    transactionDate: String(txn.transactionDate).slice(0, 10),
    invoiceNumber: txn.invoiceNumber || '',
    referenceNumber: txn.referenceNumber || '',
    remarks: txn.remarks || '',
  });
  resetErrors();
  editDialog.value = true;
}

async function onEditSubmit() {
  if (!editTarget.value) return;
  const okQuantity = validQuantity(editForm.quantityLiters);
  formErrors.fundAccountKey =
    editTarget.value.type !== 'ADJUSTMENT' && !editForm.fundAccountKey ? 'Choose the Bank/Cash account' : '';
  formErrors.remarks =
    editTarget.value.type === 'ADJUSTMENT' && !editForm.remarks ? 'Say why the stock is being adjusted' : '';
  if (!okQuantity || formErrors.fundAccountKey || formErrors.remarks) return;

  const [fundAccountType, fundAccountId] = editForm.fundAccountKey
    ? editForm.fundAccountKey.split(':')
    : [undefined, undefined];
  const isAdjustment = editTarget.value.type === 'ADJUSTMENT';
  submitting.value = true;
  try {
    await store.updateTransaction(editTarget.value.id, {
      quantityLiters: editForm.quantityLiters,
      amount: editForm.amount || undefined,
      ratePerLiter: editForm.ratePerLiter || undefined,
      supplierId: isAdjustment ? undefined : editForm.supplierId || null,
      transactionDate: editForm.transactionDate || undefined,
      invoiceNumber: editTarget.value.type === 'PURCHASE' ? editForm.invoiceNumber || null : undefined,
      referenceNumber: isAdjustment ? undefined : editForm.referenceNumber || null,
      remarks: editForm.remarks || null,
      fundAccountType: isAdjustment ? undefined : fundAccountType,
      fundAccountId: isAdjustment ? undefined : fundAccountId,
    });
    success('Movement updated');
    editDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update the movement'));
  } finally {
    submitting.value = false;
  }
}

// ------------------------------------------------------------------ delete
const deleteDialog = ref(false);
const deleteTarget = ref<AdBlueStockTransaction | null>(null);

function openDeleteDialog(txn: AdBlueStockTransaction) {
  deleteTarget.value = txn;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  submitting.value = true;
  try {
    await store.removeTransaction(deleteTarget.value.id);
    success('Movement deleted');
    deleteDialog.value = false;
    await reload();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete the movement'));
  } finally {
    submitting.value = false;
  }
}

// -------------------------------------------------------------------- load
onMounted(async () => {
  await Promise.all([
    reload(),
    // Only needed to fill the Bank/Cash picker on a purchase or return.
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
