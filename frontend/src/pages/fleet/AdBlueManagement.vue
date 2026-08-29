<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6 mb-0">AdBlue</h2>
    </div>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="entries">AdBlue Entries</AppTab>
      <AppTab v-if="canViewStock" value="stock">Stock</AppTab>
      <AppTab value="consumption">Consumption</AppTab>
    </AppTabs>

    <AppWindow v-model="activeTab">
      <!-- Entries -->
      <AppWindowItem value="entries">
        <div class="d-flex flex-wrap ga-2 align-end mb-3">
          <div style="width: 200px">
            <AppSelect
              v-model="entryFilters.vehicleId"
              :items="vehicleOptions"
              item-title="registrationNumber"
              item-value="id"
              label="Vehicle"
              clearable
              @update:model-value="onFiltersChanged"
            />
          </div>
          <div style="width: 170px">
            <AppTextField v-model="entryFilters.from" type="date" label="From" @update:model-value="onFiltersChanged" />
          </div>
          <div style="width: 170px">
            <AppTextField v-model="entryFilters.to" type="date" label="To" @update:model-value="onFiltersChanged" />
          </div>
          <div style="width: 190px">
            <AppSelect
              v-model="entryFilters.source"
              :items="sourceOptions"
              item-title="title"
              item-value="value"
              label="Source"
              clearable
              @update:model-value="onFiltersChanged"
            />
          </div>
          <AppBtn variant="text" @click="clearFilters">Clear</AppBtn>
          <div class="spacer"></div>
          <AppBtn v-if="canCreateEntry" color="primary" prepend-icon="mdi-plus" @click="openEntryDialog()">New AdBlue Entry</AppBtn>
        </div>

        <MasterDataTable
          :headers="entryHeaders"
          :items="entryStore.items"
          :items-length="entryStore.meta?.total || 0"
          :loading="entryStore.loading"
          :page="entryPage"
          :page-size="entryPageSize"
          @update:page="onEntryPageUpdate"
          @update:page-size="onEntryPageSizeUpdate"
        >
          <template #item.vehicle="{ item }">{{ (item as any).vehicle.registrationNumber }}</template>
          <template #item.source="{ item }">
            <AppChip size="small" variant="tonal" :color="(item as any).source === 'FROM_STOCK' ? 'primary' : 'warning'">
              {{ ADBLUE_SOURCE_LABELS[(item as any).source as AdBlueSource] }}
            </AppChip>
          </template>
          <template #item.quantityLiters="{ item }">
            <span v-if="(item as any).quantityLiters != null">{{ Number((item as any).quantityLiters).toFixed(2) }} L</span>
            <span v-else class="text-medium-emphasis">-</span>
          </template>
          <template #item.ratePerLiter="{ item }">
            <span v-if="(item as any).ratePerLiter != null">{{ formatCurrency(Number((item as any).ratePerLiter)) }}</span>
            <span v-else class="text-medium-emphasis">-</span>
          </template>
          <template #item.totalAmount="{ item }">
            <span v-if="(item as any).totalAmount != null">{{ formatCurrency(Number((item as any).totalAmount)) }}</span>
            <span v-else class="text-medium-emphasis">-</span>
          </template>
          <template #item.trip="{ item }">{{ (item as any).trip?.tripNumber || '-' }}</template>
          <template #item.driver="{ item }">{{ (item as any).driver?.name || '-' }}</template>
          <template #item.entryDate="{ item }">{{ new Date((item as any).entryDate).toLocaleDateString() }}</template>
          <template #item.actions="{ item }">
            <template v-if="canEditEntry">
              <AppBtn icon="mdi-pencil-outline" variant="text" size="small" title="Edit" @click="openEntryDialog(item as any)" />
              <AppBtn icon="mdi-paperclip" variant="text" size="small" title="Upload bill" @click="openBillDialog(item as any)" />
            </template>
            <AppBtn
              v-if="canDeleteEntry"
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              color="error"
              title="Delete"
              @click="openDeleteEntry(item as any)"
            />
          </template>
        </MasterDataTable>
      </AppWindowItem>

      <!-- Stock — the one yard store every from-stock top-up draws from -->
      <AppWindowItem v-if="canViewStock" value="stock">
        <AdBlueStock
          ref="stockTab"
          :vehicle-options="vehicleOptions"
          :supplier-options="supplierOptions"
          @changed="refreshStock"
        />
      </AppWindowItem>

      <!-- Consumption -->
      <AppWindowItem value="consumption">
        <AppCard variant="outlined" class="pa-4 mb-4">
          <div class="row row-dense align-end">
            <div class="col-12 col-sm-4 col-md-3">
              <AppTextField v-model="consumptionFilters.from" type="date" label="From" />
            </div>
            <div class="col-12 col-sm-4 col-md-3">
              <AppTextField v-model="consumptionFilters.to" type="date" label="To" />
            </div>
            <div class="col-12 col-sm-4 col-md-3 d-flex ga-2">
              <AppBtn color="primary" variant="flat" :loading="consumptionLoading" @click="fetchConsumption">Apply</AppBtn>
              <AppBtn
                variant="text"
                :disabled="!consumptionFilters.from && !consumptionFilters.to"
                @click="clearConsumptionFilters"
                >Clear</AppBtn
              >
            </div>
          </div>
        </AppCard>

        <div class="row">
          <div class="col-12 col-sm-6 col-md-3">
            <FuelSummaryCard label="Total AdBlue Cost" :value="formatCurrency(summary?.totalCost || 0)" icon="mdi-cash" color="success" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <FuelSummaryCard label="Total Litres" :value="`${(summary?.totalLiters || 0).toFixed(2)} L`" icon="mdi-water-outline" color="info" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <FuelSummaryCard label="From Stock" :value="`${(summary?.fromStock.totalLiters || 0).toFixed(2)} L`" icon="mdi-warehouse" color="primary" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <FuelSummaryCard
              label="Bought on the Road"
              :value="`${(summary?.directPurchase.totalLiters || 0).toFixed(2)} L`"
              icon="mdi-highway"
              color="warning"
            />
          </div>
        </div>
        <p class="text-caption text-medium-emphasis mt-2 mb-6">{{ consumptionCaption }}</p>

        <div class="text-subtitle-2 font-weight-medium mb-2">Vehicle-wise AdBlue</div>
        <MasterDataTable
          :headers="vehicleConsumptionHeaders"
          :items="filteredVehicleConsumption"
          :items-length="filteredVehicleConsumption.length"
          :loading="consumptionLoading"
          :search="vehicleSearch"
          :page="1"
          :page-size="100"
          item-label="AdBlue Consumption"
          export-filename="adblue-consumption"
          @update:search="(v: string) => (vehicleSearch = v)"
        >
          <template #item.totalLiters="{ item }">{{ (item as any).totalLiters.toFixed(2) }} L</template>
          <template #item.totalCost="{ item }">{{ formatCurrency((item as any).totalCost) }}</template>
        </MasterDataTable>
      </AppWindowItem>
    </AppWindow>

    <!-- AdBlue Entry Dialog -->
    <MasterFormDialog
      v-model="entryDialog"
      :title="entryEditTarget ? 'Edit AdBlue Entry' : 'New AdBlue Entry'"
      :loading="submittingEntry"
      @submit="onSubmitEntry"
    >
      <AppTextField v-model="entryForm.entryDate" type="date" label="Entry Date" class="mb-2" />
      <AppSelect
        v-model="entryForm.vehicleId"
        :items="vehicleOptions"
        item-title="registrationNumber"
        item-value="id"
        label="Vehicle"
        :error-messages="entryErrors.vehicleId"
        :disabled="!!entryEditTarget"
        class="mb-2"
      />
      <AppSelect
        v-model="entryForm.source"
        :items="sourceOptions"
        item-title="title"
        item-value="value"
        label="Where did this AdBlue come from?"
        class="mb-2"
      />

      <!-- From stock: the store prices it, so only the litres are asked for -->
      <template v-if="isFromStock">
        <AppAlert type="info" variant="tonal" density="compact" class="mb-2">
          These litres come off the yard store, which currently holds
          <strong>{{ (stockStore.stock?.currentQuantityLiters ?? 0).toFixed(2) }} L</strong
          ><span v-if="stockAverageRate"> at {{ formatCurrency(stockAverageRate) }} / L</span>. The cost is worked out
          from that average rate — the fleet has already paid for this AdBlue, so there is no price to type in.
        </AppAlert>
        <AppTextField
          v-model.number="entryForm.quantityLiters"
          type="number"
          label="Quantity (L)"
          :error-messages="entryErrors.quantityLiters"
          class="mb-2"
        />
        <div class="text-caption text-medium-emphasis mb-2">{{ stockIssueSummary }}</div>
      </template>

      <!-- Direct purchase: a roadside bill, entered the way a fuel fill is -->
      <template v-else>
        <AppAlert type="info" variant="tonal" density="compact" class="mb-2">
          Bought at a pump and poured straight in. Nothing comes off the yard store — this is the truck's own cost for
          the day.
        </AppAlert>
        <AppTextField
          v-model.number="entryForm.totalAmount"
          type="number"
          label="Amount Paid"
          :error-messages="entryErrors.totalAmount"
        />
        <div class="row row-dense">
          <div class="col-6">
            <AppTextField v-model.number="entryForm.quantityLiters" type="number" label="Quantity (L) — optional" />
          </div>
          <div class="col-6">
            <AppTextField v-model.number="entryForm.ratePerLiter" type="number" label="Rate / Litre — optional" />
          </div>
        </div>
        <div class="text-caption text-medium-emphasis mb-2">{{ directFillHint }}</div>
        <AppSelect
          v-model="entryForm.supplierId"
          :items="supplierOptions"
          item-title="name"
          item-value="id"
          label="Supplier (optional)"
          clearable
          class="mb-2"
        />
        <AppSelect
          v-model="entryForm.paymentModeId"
          :items="paymentModeOptions"
          item-title="name"
          item-value="id"
          label="Payment Mode (optional)"
          clearable
          class="mb-2"
        />
        <div class="text-caption text-medium-emphasis mb-2">{{ directFillSummary }}</div>
      </template>

      <AppTextField
        v-model.number="entryForm.odometerReading"
        type="number"
        label="Odometer Reading (optional)"
        class="mb-2"
      />
      <AppTextField v-model="entryForm.location" label="Location (optional)" class="mb-2" />
      <AppSelect
        v-model="entryForm.tripId"
        :items="tripOptions"
        item-title="tripNumber"
        item-value="id"
        label="Trip (auto-detected from vehicle & date if left blank)"
        clearable
        class="mb-2"
      />
      <div class="text-caption text-medium-emphasis mb-2">
        <span v-if="resolvingTrip">Checking for a trip on this vehicle/date…</span>
        <span v-else-if="autoTrip">
          Auto-detected trip {{ autoTrip.tripNumber
          }}<span v-if="autoTrip.driver"> — driver {{ autoTrip.driver.name }} will be filled in automatically.</span>
        </span>
        <span v-else-if="entryForm.vehicleId"
          >No active trip found for this vehicle on this date — driver will stay blank unless you pick a trip above.</span
        >
        <span v-else>Select a vehicle and date to auto-detect the trip and driver.</span>
      </div>
      <div class="row row-dense">
        <div class="col-6">
          <AppTextField v-model="entryForm.invoiceNumber" label="Invoice No. (optional)" />
        </div>
        <div class="col-6">
          <AppTextField v-model="entryForm.referenceNumber" label="Reference No. (optional)" />
        </div>
      </div>
      <AppTextField v-model="entryForm.remarks" label="Remarks (optional)" />
    </MasterFormDialog>

    <!-- Bill Upload Dialog -->
    <AppDialog v-model="billDialog" max-width="480">
      <AppCard>
        <AppCardTitle class="text-h6">Upload AdBlue Bill</AppCardTitle>
        <AppCardText>
          <AppFileInput v-model="billFile" label="Bill Document" accept="image/*,application/pdf" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="billDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" :loading="uploadingBill" @click="submitBill">Upload</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteEntryDialog"
      title="Delete AdBlue Entry"
      :message="deleteEntryMessage"
      confirm-text="Delete"
      :loading="deletingEntry"
      @confirm="submitDeleteEntry"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * AdBlue / DEF, as its own module beside Diesel and FASTag.
 *
 * Two ways AdBlue reaches a truck, and the fleet runs both:
 *
 *   From Stock      — drums bought in bulk and kept at the yard, then
 *                     poured into whichever truck needs topping up. The
 *                     litres come off the shared store on the Stock tab and
 *                     are costed at its weighted-average rate, so this form
 *                     asks only how many litres went in.
 *   Direct Purchase — bought at a pump on the road, straight into the tank.
 *                     Nothing is stored, so this form asks for the roadside
 *                     bill exactly the way a Direct Payment fuel entry does.
 *
 * Either way the cost mirrors into Vehicle Expenses under ADBLUE, so it
 * lands on the truck once and shows up in P&L beside diesel and FASTag.
 */
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useAdBlueEntryStore, useAdBlueStockStore } from '@/stores/fleet';
import { useAuthStore } from '@/stores/auth.store';
import { useVehicleStore, useSupplierStore, usePaymentModeStore } from '@/stores/masters';
import { useTripStore } from '@/stores/operations';
import { tripApi } from '@/services/operations';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import FuelSummaryCard from '@/components/fleet/FuelSummaryCard.vue';
import AdBlueStock from '@/components/fleet/AdBlueStock.vue';
import {
  AppTabs, AppTab, AppWindow, AppWindowItem, AppBtn, AppSelect, AppTextField, AppChip,
  AppCard, AppCardTitle, AppCardText, AppCardActions, AppDialog, AppFileInput, AppAlert,
} from '@/components/ui';
import {
  ADBLUE_SOURCE_LABELS,
  type AdBlueSource,
  type AdBlueSummary,
  type AdBlueVehicleConsumptionRow,
} from '@/types/adBlue.types';

const entryStore = useAdBlueEntryStore();
const stockStore = useAdBlueStockStore();
const authStore = useAuthStore();
const vehicleStore = useVehicleStore();
const supplierStore = useSupplierStore();
const paymentModeStore = usePaymentModeStore();
const tripStore = useTripStore();
const { success, error } = useSnackbar();

const canViewStock = authStore.hasPermission('adblue_stock.view');
const canCreateEntry = authStore.hasPermission('adblue_entry.create');
const canEditEntry = authStore.hasPermission('adblue_entry.edit');
const canDeleteEntry = authStore.hasPermission('adblue_entry.delete');

const activeTab = ref('entries');
const sourceOptions = [
  { title: 'From Stock', value: 'FROM_STOCK' },
  { title: 'Direct Purchase', value: 'DIRECT_PURCHASE' },
];

const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const supplierOptions = ref<{ id: string; name: string }[]>([]);
const paymentModeOptions = ref<{ id: string; name: string }[]>([]);
const tripOptions = ref<{ id: string; tripNumber: string }[]>([]);

const stockTab = ref<InstanceType<typeof AdBlueStock> | null>(null);
const stockAverageRate = computed(() => stockStore.stock?.averageRatePerLiter ?? null);

/**
 * Recording, editing or deleting a from-stock entry moves the store, so
 * pull it again for the figures this page's dialog quotes — and refresh
 * the Stock tab itself if it is mounted, since its own numbers just moved
 * without it being touched.
 */
function refreshStockFromEntry() {
  if (!canViewStock) return;
  stockStore.fetchStock().catch(() => undefined);
  stockTab.value?.reload?.().catch?.(() => undefined);
}
/** The Stock tab telling us it changed something — it has already reloaded itself. */
function refreshStock() {
  if (!canViewStock) return;
  stockStore.fetchStock().catch(() => undefined);
}

// --- Entries -------------------------------------------------------------
const entryPage = ref(1);
const entryPageSize = ref(10);
const entryHeaders = [
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Source', key: 'source', sortable: false },
  { title: 'Trip', key: 'trip', sortable: false },
  { title: 'Driver', key: 'driver', sortable: false },
  { title: 'Quantity', key: 'quantityLiters', sortable: false },
  { title: 'Rate / L', key: 'ratePerLiter', sortable: false },
  { title: 'Amount', key: 'totalAmount', sortable: false },
  { title: 'Date', key: 'entryDate', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

const entryFilters = reactive({ vehicleId: '', from: '', to: '', source: '' });

function onEntryPageUpdate(v: number) {
  entryPage.value = v;
  fetchEntries();
}
function onEntryPageSizeUpdate(v: number) {
  entryPageSize.value = v;
  fetchEntries();
}
function onFiltersChanged() {
  entryPage.value = 1;
  fetchEntries();
}
function clearFilters() {
  Object.assign(entryFilters, { vehicleId: '', from: '', to: '', source: '' });
  onFiltersChanged();
}
async function fetchEntries() {
  await entryStore.fetchList({
    page: entryPage.value,
    pageSize: entryPageSize.value,
    vehicleId: entryFilters.vehicleId || undefined,
    from: entryFilters.from || undefined,
    to: entryFilters.to || undefined,
    source: entryFilters.source || undefined,
  });
}

// --- Consumption tab -----------------------------------------------------
// Its own date range, independent of the Entries tab's filters: the figures
// come from server-side aggregates over every matching entry, not from the
// page of rows the list happens to have loaded.
const consumptionFilters = reactive({ from: '', to: '' });
const consumptionLoading = ref(false);
const summary = ref<AdBlueSummary | null>(null);
const vehicleConsumption = ref<AdBlueVehicleConsumptionRow[]>([]);

const vehicleSearch = ref('');
const filteredVehicleConsumption = computed(() => {
  const q = vehicleSearch.value.trim().toLowerCase();
  if (!q) return vehicleConsumption.value;
  return vehicleConsumption.value.filter((row) => row.registrationNumber.toLowerCase().includes(q));
});

const vehicleConsumptionHeaders = [
  { title: 'Vehicle', key: 'registrationNumber', sortable: false },
  { title: 'Top-ups', key: 'entryCount', sortable: false },
  { title: 'Litres', key: 'totalLiters', sortable: false },
  { title: 'Cost', key: 'totalCost', sortable: false },
];

const consumptionCaption = computed(() => {
  const { from, to } = consumptionFilters;
  const entries = summary.value?.entryCount ?? 0;
  const period = !from && !to ? 'on record' : from && to ? `${from} to ${to}` : from ? `on or after ${from}` : `up to ${to}`;
  const stockCost = formatCurrency(summary.value?.fromStock.totalCost || 0);
  const roadCost = formatCurrency(summary.value?.directPurchase.totalCost || 0);
  return `Across ${entries} AdBlue entries ${period} — ${stockCost} drawn from stock, ${roadCost} bought on the road.`;
});

function consumptionParams() {
  return {
    ...(consumptionFilters.from ? { from: consumptionFilters.from } : {}),
    ...(consumptionFilters.to ? { to: consumptionFilters.to } : {}),
  };
}

async function fetchConsumption() {
  consumptionLoading.value = true;
  try {
    const [totals, vehicles] = await Promise.all([
      entryStore.summary(consumptionParams()),
      entryStore.vehicleConsumption(consumptionParams()),
    ]);
    summary.value = totals;
    vehicleConsumption.value = vehicles;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load AdBlue figures'));
  } finally {
    consumptionLoading.value = false;
  }
}

function clearConsumptionFilters() {
  consumptionFilters.from = '';
  consumptionFilters.to = '';
  fetchConsumption();
}

// --- Entry dialog --------------------------------------------------------
const entryDialog = ref(false);
const entryEditTarget = ref<any>(null);
const submittingEntry = ref(false);
const emptyEntryForm = () => ({
  vehicleId: '',
  source: 'FROM_STOCK',
  quantityLiters: undefined as number | undefined,
  ratePerLiter: undefined as number | undefined,
  totalAmount: undefined as number | undefined,
  odometerReading: undefined as number | undefined,
  entryDate: new Date().toISOString().substring(0, 10),
  location: '',
  tripId: '',
  supplierId: '',
  paymentModeId: '',
  invoiceNumber: '',
  referenceNumber: '',
  remarks: '',
});
const entryForm = reactive(emptyEntryForm());
const entryErrors = reactive({ vehicleId: '', quantityLiters: '', totalAmount: '' });

const isFromStock = computed(() => entryForm.source === 'FROM_STOCK');

/** What this withdrawal will cost, at the store's rate — the same sum the server does. */
const stockIssueSummary = computed(() => {
  const quantity = entryForm.quantityLiters;
  if (!quantity) return 'Enter how many litres went into the truck.';
  if (stockAverageRate.value == null) {
    return 'The yard store is empty — buy stock on the Stock tab first, or record this as a direct purchase.';
  }
  const cost = Number((quantity * stockAverageRate.value).toFixed(2));
  const remaining = Number(((stockStore.stock?.currentQuantityLiters ?? 0) - quantity).toFixed(2));
  return `${formatCurrency(cost)} at ${formatCurrency(stockAverageRate.value)} / L — leaving ${remaining.toFixed(2)} L in stock.`;
});

const directFillHint =
  'Fill in whichever you have: the amount paid, the quantity, or the quantity and rate. The rest is worked out for you.';

/**
 * Whichever two of amount/quantity/rate are filled in decide the third —
 * mirrors resolveDirectFigures() on the server, so what the dialog previews
 * is what gets stored.
 */
const directFigures = computed(() => {
  const quantity = entryForm.quantityLiters || null;
  const rate = entryForm.ratePerLiter || null;
  const amount = entryForm.totalAmount || null;
  const round2 = (n: number) => Number(n.toFixed(2));
  if (amount != null) {
    if (quantity != null && rate == null) return { quantity, rate: round2(amount / quantity), amount };
    if (rate != null && quantity == null) return { quantity: round2(amount / rate), rate, amount };
    return { quantity, rate, amount };
  }
  if (quantity != null && rate != null) return { quantity, rate, amount: round2(quantity * rate) };
  return { quantity, rate, amount };
});

const directFillSummary = computed(() => {
  const { quantity, rate, amount } = directFigures.value;
  if (amount == null && quantity == null) return 'Enter the amount paid or the quantity to record this top-up.';
  const parts: string[] = [];
  if (amount != null) parts.push(`Total ${formatCurrency(amount)}`);
  if (quantity != null) parts.push(`${quantity} L`);
  if (rate != null) parts.push(`${formatCurrency(rate)} / L`);
  return parts.join(' · ');
});

function openEntryDialog(entry?: any) {
  entryEditTarget.value = entry ?? null;
  Object.assign(entryForm, emptyEntryForm());
  if (entry) {
    Object.assign(entryForm, {
      vehicleId: entry.vehicle.id,
      source: entry.source,
      quantityLiters: entry.quantityLiters != null ? Number(entry.quantityLiters) : undefined,
      // A from-stock entry's rate and amount belong to the store, not to
      // the form — the server re-derives them, so they are not seeded here.
      ratePerLiter: entry.source === 'FROM_STOCK' || entry.ratePerLiter == null ? undefined : Number(entry.ratePerLiter),
      totalAmount: entry.source === 'FROM_STOCK' || entry.totalAmount == null ? undefined : Number(entry.totalAmount),
      odometerReading: entry.odometerReading ?? undefined,
      entryDate: String(entry.entryDate).slice(0, 10),
      location: entry.location || '',
      tripId: entry.trip?.id || '',
      supplierId: entry.supplier?.id || '',
      paymentModeId: entry.paymentMode?.id || '',
      invoiceNumber: entry.invoiceNumber || '',
      referenceNumber: entry.referenceNumber || '',
      remarks: entry.remarks || '',
    });
  }
  Object.assign(entryErrors, { vehicleId: '', quantityLiters: '', totalAmount: '' });
  autoTrip.value = null;
  entryDialog.value = true;
}

// --- Live trip/driver auto-detection as Vehicle/Date change ---
const autoTrip = ref<{ id: string; tripNumber: string; driver: { id: string; name: string; code: string } | null } | null>(
  null
);
const resolvingTrip = ref(false);
async function refreshAutoTrip() {
  if (!entryForm.vehicleId || !entryForm.entryDate) {
    autoTrip.value = null;
    return;
  }
  resolvingTrip.value = true;
  try {
    const response = await tripApi.activeForVehicle(entryForm.vehicleId, entryForm.entryDate);
    autoTrip.value = response.data.data;
    entryForm.tripId = autoTrip.value?.id || '';
    if (autoTrip.value && !tripOptions.value.some((t) => t.id === autoTrip.value!.id)) {
      tripOptions.value = [...tripOptions.value, { id: autoTrip.value.id, tripNumber: autoTrip.value.tripNumber }];
    }
  } catch {
    autoTrip.value = null;
  } finally {
    resolvingTrip.value = false;
  }
}
watch(
  () => [entryForm.vehicleId, entryForm.entryDate],
  () => {
    if (entryDialog.value) refreshAutoTrip();
  }
);

function validateEntry(): boolean {
  entryErrors.vehicleId = entryForm.vehicleId ? '' : 'Vehicle is required';
  const hasQuantity = !!entryForm.quantityLiters && entryForm.quantityLiters > 0;
  if (isFromStock.value) {
    // The store prices the litres, so the litres are the only figure that
    // can be missing — the same rule the API enforces.
    entryErrors.quantityLiters = hasQuantity ? '' : 'Enter how many litres were taken from stock';
    entryErrors.totalAmount = '';
  } else {
    const hasAmount = !!entryForm.totalAmount && entryForm.totalAmount > 0;
    entryErrors.quantityLiters = '';
    entryErrors.totalAmount = hasAmount || hasQuantity ? '' : 'Enter the amount paid, the quantity, or both';
  }
  return !Object.values(entryErrors).some(Boolean);
}

async function onSubmitEntry() {
  if (!validateEntry()) return;
  const fromStock = isFromStock.value;
  submittingEntry.value = true;
  try {
    const payload = {
      source: entryForm.source,
      quantityLiters: entryForm.quantityLiters || undefined,
      // Rate and amount are the store's to decide for a from-stock entry,
      // and the API rejects nothing here only because they are not sent.
      ratePerLiter: fromStock ? undefined : entryForm.ratePerLiter || undefined,
      totalAmount: fromStock ? undefined : entryForm.totalAmount || undefined,
      odometerReading: entryForm.odometerReading || undefined,
      entryDate: entryForm.entryDate,
      location: entryForm.location || undefined,
      tripId: entryForm.tripId || undefined,
      supplierId: fromStock ? undefined : entryForm.supplierId || undefined,
      paymentModeId: fromStock ? undefined : entryForm.paymentModeId || undefined,
      invoiceNumber: entryForm.invoiceNumber || undefined,
      referenceNumber: entryForm.referenceNumber || undefined,
      remarks: entryForm.remarks || undefined,
    };
    if (entryEditTarget.value) {
      await entryStore.update(entryEditTarget.value.id, payload);
      success('AdBlue entry updated');
    } else {
      await entryStore.create({ ...payload, vehicleId: entryForm.vehicleId });
      success('AdBlue entry recorded');
    }
    entryDialog.value = false;
    fetchEntries();
    fetchConsumption();
    refreshStockFromEntry();
  } catch (err) {
    error(extractErrorMessage(err, entryEditTarget.value ? 'Failed to update AdBlue entry' : 'Failed to record AdBlue entry'));
  } finally {
    submittingEntry.value = false;
  }
}

const deleteEntryDialog = ref(false);
const deleteEntryTarget = ref<any>(null);
const deletingEntry = ref(false);
const deleteEntryMessage = computed(() =>
  deleteEntryTarget.value?.source === 'FROM_STOCK'
    ? 'Delete this AdBlue entry? Its litres go back into the yard store and the vehicle expense is removed. This cannot be undone.'
    : 'Delete this AdBlue entry? The vehicle expense it created is removed with it. This cannot be undone.'
);
function openDeleteEntry(entry: any) {
  deleteEntryTarget.value = entry;
  deleteEntryDialog.value = true;
}
async function submitDeleteEntry() {
  if (!deleteEntryTarget.value) return;
  deletingEntry.value = true;
  try {
    await entryStore.remove(deleteEntryTarget.value.id);
    success('AdBlue entry deleted');
    deleteEntryDialog.value = false;
    fetchEntries();
    fetchConsumption();
    refreshStockFromEntry();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete AdBlue entry'));
    deleteEntryDialog.value = false;
  } finally {
    deletingEntry.value = false;
  }
}

// --- Bill Upload ---
const billDialog = ref(false);
const billTarget = ref<any>(null);
const billFile = ref<File | null>(null);
const uploadingBill = ref(false);
function openBillDialog(entry: any) {
  billTarget.value = entry;
  billFile.value = null;
  billDialog.value = true;
}
async function submitBill() {
  if (!billTarget.value || !billFile.value) {
    error('Please select a file to upload');
    return;
  }
  uploadingBill.value = true;
  try {
    await entryStore.uploadBill(billTarget.value.id, billFile.value);
    success('Bill uploaded');
    billDialog.value = false;
    fetchEntries();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload bill'));
  } finally {
    uploadingBill.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    vehicleStore.fetchList({ pageSize: 200 }),
    supplierStore.fetchList({ pageSize: 200 }),
    paymentModeStore.fetchList({ pageSize: 100 }),
    tripStore.fetchList({ pageSize: 100 }),
  ]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  supplierOptions.value = supplierStore.items.map((s: any) => ({ id: s.id, name: s.name }));
  paymentModeOptions.value = paymentModeStore.items.map((p: any) => ({ id: p.id, name: p.name }));
  tripOptions.value = tripStore.items.map((t: any) => ({ id: t.id, tripNumber: t.tripNumber }));
  fetchEntries();
  fetchConsumption();
  // Only used to show what a from-stock top-up will draw on, so a missing
  // permission should not take the page down with it.
  if (canViewStock) stockStore.fetchStock().catch(() => undefined);
});
</script>
