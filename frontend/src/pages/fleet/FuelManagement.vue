<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6 mb-0">Diesel / Fuel</h2>
      <AppBtn variant="outlined" prepend-icon="mdi-file-upload-outline" @click="openImportDialog">Import</AppBtn>
    </div>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="entries">Fuel Entries</AppTab>
      <AppTab value="cards">Fuel Cards</AppTab>
      <AppTab v-if="canViewCardAccount" value="card-account">Card Account</AppTab>
      <AppTab value="consumption">Mileage & Consumption</AppTab>
    </AppTabs>

    <AppWindow v-model="activeTab">
      <!-- Fuel Entries -->
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
          <div style="width: 160px">
            <AppSelect v-model="entryFilters.fuelType" :items="fuelTypeOptions" label="Fuel Type" clearable @update:model-value="onFiltersChanged" />
          </div>
          <div style="width: 180px">
            <AppSelect
              v-model="entryFilters.billingMethod"
              :items="billingMethodOptions"
              item-title="title"
              item-value="value"
              label="Billing Method"
              clearable
              @update:model-value="onFiltersChanged"
            />
          </div>
          <AppBtn variant="text" @click="clearFilters">Clear</AppBtn>
          <div class="spacer"></div>
          <AppBtn color="primary" prepend-icon="mdi-plus" @click="openEntryDialog">New Fuel Entry</AppBtn>
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
          <template #item.fuelType="{ item }"><AppChip size="small" variant="tonal">{{ (item as any).fuelType }}</AppChip></template>
          <template #item.billingMethod="{ item }">
            <AppChip v-if="(item as any).billingMethod" size="small" variant="outlined">{{ billingMethodLabel((item as any).billingMethod) }}</AppChip>
            <span v-else class="text-medium-emphasis">-</span>
          </template>
          <template #item.quantityLiters="{ item }">
            <span v-if="(item as any).quantityLiters != null">{{ (item as any).quantityLiters }}</span>
            <span v-else class="text-medium-emphasis">-</span>
          </template>
          <template #item.totalAmount="{ item }">
            <span v-if="(item as any).totalAmount != null">{{ formatCurrency(Number((item as any).totalAmount)) }}</span>
            <span v-else class="text-medium-emphasis">-</span>
          </template>
          <template #item.trip="{ item }">{{ (item as any).trip?.tripNumber || '-' }}</template>
          <template #item.driver="{ item }">{{ (item as any).driver?.name || '-' }}</template>
          <template #item.entryDate="{ item }">{{ new Date((item as any).entryDate).toLocaleDateString() }}</template>
          <template #item.mileageKmpl="{ item }">
            <span v-if="(item as any).mileageKmpl">{{ (item as any).mileageKmpl }} km/l</span>
            <span v-else class="text-medium-emphasis">-</span>
          </template>
          <template #item.actions="{ item }">
            <AppBtn icon="mdi-paperclip" variant="text" size="small" @click="openBillDialog(item as any)" />
            <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="openDeleteEntry(item as any)" />
          </template>
        </MasterDataTable>
      </AppWindowItem>

      <!-- Fuel Cards -->
      <AppWindowItem value="cards">
        <div class="d-flex justify-end mb-3">
          <AppBtn v-if="canCreateCard" color="primary" prepend-icon="mdi-plus" @click="openCardDialog()">New Fuel Card</AppBtn>
        </div>

        <MasterDataTable
          :headers="cardHeaders"
          :items="cardStore.items"
          :items-length="cardStore.meta?.total || 0"
          :loading="cardStore.loading"
          :page="cardPage"
          @update:page="(v: number) => { cardPage = v; fetchCards(); }"
        >
          <template #item.isActive="{ item }">
            <StatusChip :is-active="(item as any).isActive" />
          </template>
          <template #item.actions="{ item }">
            <template v-if="canEditCard">
              <AppBtn
                icon="mdi-toggle-switch-outline"
                variant="text"
                size="small"
                :title="(item as any).isActive ? 'Deactivate' : 'Activate'"
                @click="onToggleCard(item as any)"
              />
              <AppBtn icon="mdi-pencil-outline" variant="text" size="small" title="Edit" @click="openCardDialog(item as any)" />
            </template>
            <AppBtn
              v-if="canDeleteCard"
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              color="error"
              title="Delete"
              @click="openDeleteCard(item as any)"
            />
          </template>
        </MasterDataTable>
      </AppWindowItem>

      <!-- Card Account — the one prepaid balance every fuel card spends from -->
      <AppWindowItem v-if="canViewCardAccount" value="card-account">
        <DieselCardAccount :vehicle-options="vehicleOptions" :card-options="cardStore.items as any" />
      </AppWindowItem>

      <!-- Consumption -->
      <AppWindowItem value="consumption">
        <AppCard variant="outlined" class="pa-4 mb-4">
          <div class="row row-dense align-end">
            <div class="col-12 col-sm-4 col-md-3">
              <AppTextField v-model="mileageFilters.from" type="date" label="From" />
            </div>
            <div class="col-12 col-sm-4 col-md-3">
              <AppTextField v-model="mileageFilters.to" type="date" label="To" />
            </div>
            <div class="col-12 col-sm-4 col-md-3 d-flex ga-2">
              <AppBtn color="primary" variant="flat" :loading="mileageLoading" @click="fetchMileage">Apply</AppBtn>
              <AppBtn variant="text" :disabled="!mileageFilters.from && !mileageFilters.to" @click="clearMileageFilters">Clear</AppBtn>
            </div>
          </div>
        </AppCard>

        <div class="row">
          <div class="col-12 col-sm-6 col-md-3">
            <FuelSummaryCard label="Total Fuel Cost" :value="formatCurrency(fuelSummary?.totalFuelCost || 0)" icon="mdi-cash" color="success" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <FuelSummaryCard label="Total Liters" :value="`${(fuelSummary?.totalLiters || 0).toFixed(1)} L`" icon="mdi-gas-station" color="info" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <FuelSummaryCard label="Average Mileage" :value="fuelSummary?.mileageKmpl ? `${fuelSummary.mileageKmpl} km/l` : '-'" icon="mdi-speedometer" color="primary" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <FuelSummaryCard label="Cost / KM" :value="fuelSummary?.costPerKm ? formatCurrency(fuelSummary.costPerKm) : '-'" icon="mdi-chart-line" color="warning" />
          </div>
        </div>
        <p class="text-caption text-medium-emphasis mt-2 mb-6">{{ mileageRangeCaption }}</p>

        <div class="text-subtitle-2 font-weight-medium mb-2">Driver-wise Mileage</div>
        <div class="mb-6">
          <MasterDataTable
            :headers="driverMileageHeaders"
            :items="filteredDriverMileage"
            :items-length="filteredDriverMileage.length"
            :loading="mileageLoading"
            :search="driverSearch"
            :page="1"
            :page-size="100"
            item-label="Driver Mileage"
            export-filename="driver-mileage"
            @update:search="(v: string) => (driverSearch = v)"
          >
            <template #item.driverName="{ item }">
              <div class="font-weight-medium">{{ (item as any).driverName }}</div>
              <div v-if="(item as any).driverCode" class="text-caption text-medium-emphasis">{{ (item as any).driverCode }}</div>
            </template>
            <template #item.totalLiters="{ item }">{{ (item as any).totalLiters.toFixed(1) }} L</template>
            <template #item.totalFuelCost="{ item }">{{ formatCurrency((item as any).totalFuelCost) }}</template>
            <template #item.totalKM="{ item }">{{ (item as any).totalKM }} km</template>
            <template #item.mileageKmpl="{ item }">
              <span v-if="(item as any).mileageKmpl">{{ (item as any).mileageKmpl }} km/l</span>
              <span v-else class="text-medium-emphasis">-</span>
            </template>
            <template #item.costPerKm="{ item }">
              <span v-if="(item as any).costPerKm">{{ formatCurrency((item as any).costPerKm) }}</span>
              <span v-else class="text-medium-emphasis">-</span>
            </template>
          </MasterDataTable>
        </div>

        <AppCard variant="outlined" class="pa-4">
          <div class="text-subtitle-2 font-weight-medium mb-3">Vehicle Fuel Tracking</div>
          <AppSelect
            v-model="summaryVehicleId"
            :items="vehicleOptions"
            item-title="registrationNumber"
            item-value="id"
            label="Select Vehicle"
            clearable
            class="mb-3"
            style="max-width: 320px"
            @update:model-value="fetchVehicleSummary"
          />
          <div v-if="vehicleSummary" class="row">
            <div class="col-12 col-sm-6 col-md-3"><FuelSummaryCard label="Total Litres" :value="`${vehicleSummary.totalLiters.toFixed(1)} L`" icon="mdi-gas-station" color="info" /></div>
            <div class="col-12 col-sm-6 col-md-3"><FuelSummaryCard label="Total Fuel Cost" :value="formatCurrency(vehicleSummary.totalFuelCost)" icon="mdi-cash" color="success" /></div>
            <div class="col-12 col-sm-6 col-md-3"><FuelSummaryCard label="Avg Rate" :value="vehicleSummary.avgRate ? formatCurrency(vehicleSummary.avgRate) : '-'" icon="mdi-currency-inr" color="primary" /></div>
            <div class="col-12 col-sm-6 col-md-3"><FuelSummaryCard label="Total KM" :value="`${vehicleSummary.totalKM} km`" icon="mdi-map-marker-distance" color="info" /></div>
            <div class="col-12 col-sm-6 col-md-3"><FuelSummaryCard label="Mileage" :value="vehicleSummary.mileageKmpl ? `${vehicleSummary.mileageKmpl} km/l` : '-'" icon="mdi-speedometer" color="primary" /></div>
            <div class="col-12 col-sm-6 col-md-3"><FuelSummaryCard label="Cost / KM" :value="vehicleSummary.costPerKm ? formatCurrency(vehicleSummary.costPerKm) : '-'" icon="mdi-chart-line" color="warning" /></div>
            <div class="col-12 col-sm-6 col-md-3"><FuelSummaryCard label="Current Odometer" :value="vehicleSummary.currentOdometer ? `${vehicleSummary.currentOdometer} km` : '-'" icon="mdi-counter" color="info" /></div>
            <div class="col-12 col-sm-6 col-md-3"><FuelSummaryCard label="Last Fuel Entry" :value="vehicleSummary.lastFuelEntry ? new Date(vehicleSummary.lastFuelEntry).toLocaleDateString() : '-'" icon="mdi-calendar" color="primary" /></div>
          </div>
          <p v-else class="text-caption text-medium-emphasis mb-0">Select a vehicle to see its full fuel-tracking summary.</p>
        </AppCard>
      </AppWindowItem>
    </AppWindow>

    <!-- Fuel Entry Dialog -->
    <MasterFormDialog v-model="entryDialog" title="New Fuel Entry" :loading="submittingEntry" @submit="onSubmitEntry">
      <AppTextField v-model="entryForm.entryDate" type="date" label="Entry Date" class="mb-2" />
      <AppSelect
        v-model="entryForm.vehicleId"
        :items="vehicleOptions"
        item-title="registrationNumber"
        item-value="id"
        label="Vehicle"
        :error-messages="entryErrors.vehicleId"
        class="mb-2"
      />
      <AppSelect v-model="entryForm.fuelType" :items="fuelTypeOptions" label="Fuel Type" class="mb-2" />
      <AppSelect
        v-model="entryForm.billingMethod"
        :items="billingMethodOptions"
        item-title="title"
        item-value="value"
        label="How was this billed?"
        clearable
        class="mb-2"
      />
      <AppSelect
        v-model="entryForm.fuelCardId"
        :items="cardStore.items"
        item-title="cardNumber"
        item-value="id"
        label="Fuel Card (optional)"
        clearable
        class="mb-2"
      />
      <AppAlert v-if="isCardBilled" type="info" variant="tonal" density="compact" class="mb-2">
        This fill is paid from the shared diesel card account — its balance
        <strong>{{ formatCurrency(cardAccountStore.account?.currentBalance ?? 0) }}</strong> drops by the amount below
        when you save. Every card spends from that one balance.
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
          <AppTextField v-model.number="entryForm.ratePerLiter" type="number" label="Rate / Liter — optional" />
        </div>
      </div>
      <div class="text-caption text-medium-emphasis mb-2">{{ fillHint }}</div>
      <AppTextField v-model.number="entryForm.odometerReading" type="number" label="Odometer Reading" :error-messages="entryErrors.odometerReading" class="mb-2" />
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
          Auto-detected trip {{ autoTrip.tripNumber }}<span v-if="autoTrip.driver"> — driver {{ autoTrip.driver.name }} will be filled in automatically.</span>
        </span>
        <span v-else-if="entryForm.vehicleId">No active trip found for this vehicle on this date — driver will stay blank unless you pick a trip above.</span>
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
      <AppTextField v-model="entryForm.remarks" label="Remarks (optional)" class="mb-2" />
      <div class="text-caption text-medium-emphasis mt-2">{{ fillSummary }}</div>
    </MasterFormDialog>

    <!-- Fuel Card Dialog -->
    <MasterFormDialog
      v-model="cardDialog"
      :title="cardEditTarget ? 'Edit Fuel Card' : 'New Fuel Card'"
      :loading="submittingCard"
      @submit="onSubmitCard"
    >
      <AppTextField v-model="cardForm.cardNumber" label="Card Number" :error-messages="cardErrors.cardNumber" class="mb-2" />
      <AppTextField v-model="cardForm.issuedTo" label="Issued To" />
    </MasterFormDialog>

    <!-- Bill Upload Dialog -->
    <AppDialog v-model="billDialog" max-width="480">
      <AppCard>
        <AppCardTitle class="text-h6">Upload Fuel Bill</AppCardTitle>
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

    <!-- Import Dialog -->
    <AppDialog v-model="importDialog" max-width="520">
      <AppCard>
        <AppCardTitle class="text-h6">Import Fuel Entries</AppCardTitle>
        <AppCardText>
          <p class="text-caption text-medium-emphasis mb-2">
            Excel (.xlsx) columns: vehicleRegistrationNumber, quantityLiters, ratePerLiter, totalAmount,
            odometerReading, entryDate, tripNumber, fuelType, billingMethod, invoiceNumber, referenceNumber, remarks.
            A row needs the amount or the quantity (or both) — not all three. Driver is auto-derived from the
            trip, never taken from the file.
          </p>
          <ExcelExportButton
            variant="text"
            size="small"
            label="Download Sample Excel"
            class="mb-3 px-0"
            @click="downloadFuelSample"
          />
          <AppFileInput v-model="importFile" label="File" accept=".xlsx" />
          <div v-if="importResult" class="mt-3 text-body-2">
            <div>Total rows: {{ importResult.totalRows }}</div>
            <div class="text-success">Imported: {{ importResult.successRows }}</div>
            <div v-if="importResult.failedRows" class="text-error">Failed: {{ importResult.failedRows }}</div>
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

    <ConfirmDialog
      v-model="deleteEntryDialog"
      title="Delete Fuel Entry"
      message="Delete this fuel entry? This cannot be undone."
      confirm-text="Delete"
      :loading="deletingEntry"
      @confirm="submitDeleteEntry"
    />

    <!--
      Deleting a card is a soft delete: fills and card-account transactions
      already recorded against it keep naming it, the card just stops being
      selectable. Deactivating instead keeps it in the list.
    -->
    <ConfirmDialog
      v-model="deleteCardDialog"
      title="Delete Fuel Card"
      :message="`Delete card ${deleteCardTarget?.cardNumber || ''}? Fuel entries and card-account transactions already recorded against it are kept and still show this card number — it just cannot be used on a new fill. Deactivate it instead if you only want it off the list.`"
      confirm-text="Delete"
      :loading="deletingCard"
      @confirm="submitDeleteCard"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useFuelEntryStore, useFuelCardStore } from '@/stores/fleet';
import { useFuelCardAccountStore } from '@/stores/accounts/fuelCardAccount';
import { useAuthStore } from '@/stores/auth.store';
import { useVehicleStore } from '@/stores/masters';
import { useTripStore } from '@/stores/operations';
import { tripApi } from '@/services/operations';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import { importApi } from '@/services/system/phase8';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import StatusChip from '@/components/masters/StatusChip.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import FuelSummaryCard from '@/components/fleet/FuelSummaryCard.vue';
import DieselCardAccount from '@/components/fleet/DieselCardAccount.vue';
import {
  AppTabs, AppTab, AppWindow, AppWindowItem, AppBtn, AppSelect, AppTextField, AppChip,
  AppCard, AppCardTitle, AppCardText, AppCardActions, AppDialog, AppFileInput, AppAlert,
  ExcelExportButton,
} from '@/components/ui';
import type { VehicleFuelSummary, FuelSummary, DriverMileageRow } from '@/types/fleet.types';

const entryStore = useFuelEntryStore();
const cardStore = useFuelCardStore();
const cardAccountStore = useFuelCardAccountStore();
const authStore = useAuthStore();
const canViewCardAccount = authStore.hasPermission('fuel_card_account.view');
const canCreateCard = authStore.hasPermission('fuel_card.create');
const canEditCard = authStore.hasPermission('fuel_card.edit');
const canDeleteCard = authStore.hasPermission('fuel_card.delete');

/**
 * Recording or deleting a card-billed fill moves the shared card balance,
 * so pull it again for the figure the fuel-entry dialog quotes. The Card
 * Account tab needs nothing here — it only exists while it is open, and
 * reloads itself every time it is.
 */
function refreshCardAccount() {
  if (!canViewCardAccount) return;
  cardAccountStore.fetchAccount().catch(() => undefined);
}
const vehicleStore = useVehicleStore();
const tripStore = useTripStore();
const { success, error } = useSnackbar();

const activeTab = ref('entries');
const fuelTypeOptions = ['DIESEL', 'PETROL', 'CNG', 'OTHER'];
const billingMethodOptions = [
  { title: 'Fuel Card', value: 'FUEL_CARD' },
  { title: 'OTP', value: 'OTP' },
  { title: 'Direct Payment', value: 'DIRECT_PAYMENT' },
];
function billingMethodLabel(value: string) {
  return billingMethodOptions.find((o) => o.value === value)?.title || value;
}


const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const tripOptions = ref<{ id: string; tripNumber: string }[]>([]);

// --- Fuel Entries ---
const entryPage = ref(1);
const entryPageSize = ref(10);
const entryHeaders = [
  { title: 'Vehicle', key: 'vehicle', sortable: false },
  { title: 'Type', key: 'fuelType', sortable: false },
  { title: 'Billing', key: 'billingMethod', sortable: false },
  { title: 'Trip', key: 'trip', sortable: false },
  { title: 'Driver', key: 'driver', sortable: false },
  { title: 'Quantity (L)', key: 'quantityLiters', sortable: false },
  { title: 'Amount', key: 'totalAmount', sortable: false },
  { title: 'Mileage', key: 'mileageKmpl', sortable: false },
  { title: 'Date', key: 'entryDate', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

const entryFilters = reactive({ vehicleId: '', from: '', to: '', fuelType: '', billingMethod: '' });

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
  Object.assign(entryFilters, { vehicleId: '', from: '', to: '', fuelType: '', billingMethod: '' });
  onFiltersChanged();
}
async function fetchEntries() {
  await entryStore.fetchList({
    page: entryPage.value,
    pageSize: entryPageSize.value,
    vehicleId: entryFilters.vehicleId || undefined,
    from: entryFilters.from || undefined,
    to: entryFilters.to || undefined,
    fuelType: entryFilters.fuelType || undefined,
    billingMethod: entryFilters.billingMethod || undefined,
  });
}

// --- Mileage & Consumption tab -------------------------------------------
// Its own date range, independent of the Fuel Entries tab's filters: the
// figures come from server-side aggregates over every matching entry, not
// from the page of rows the list happens to have loaded.
const mileageFilters = reactive({ from: '', to: '' });
const mileageLoading = ref(false);
const fuelSummary = ref<FuelSummary | null>(null);
const driverMileage = ref<DriverMileageRow[]>([]);

// The table's own search box filters the loaded rows — there is no
// server-side driver search on this aggregate.
const driverSearch = ref('');
const filteredDriverMileage = computed(() => {
  const q = driverSearch.value.trim().toLowerCase();
  if (!q) return driverMileage.value;
  return driverMileage.value.filter(
    (row) => row.driverName.toLowerCase().includes(q) || (row.driverCode || '').toLowerCase().includes(q)
  );
});

const driverMileageHeaders = [
  { title: 'Driver', key: 'driverName', sortable: false },
  { title: 'Fills', key: 'entryCount', sortable: false },
  { title: 'Total Litres', key: 'totalLiters', sortable: false },
  { title: 'Total Cost', key: 'totalFuelCost', sortable: false },
  { title: 'Total KM', key: 'totalKM', sortable: false },
  { title: 'Mileage', key: 'mileageKmpl', sortable: false },
  { title: 'Cost / KM', key: 'costPerKm', sortable: false },
];

const mileageRangeCaption = computed(() => {
  const { from, to } = mileageFilters;
  const entries = fuelSummary.value?.entryCount ?? 0;
  if (!from && !to) return `Across all ${entries} fuel entries on record.`;
  const period = from && to ? `${from} to ${to}` : from ? `on or after ${from}` : `up to ${to}`;
  return `Across ${entries} fuel entries ${period}.`;
});

function mileageParams() {
  return {
    ...(mileageFilters.from ? { from: mileageFilters.from } : {}),
    ...(mileageFilters.to ? { to: mileageFilters.to } : {}),
  };
}

async function fetchMileage() {
  mileageLoading.value = true;
  try {
    const [summary, drivers] = await Promise.all([
      entryStore.summary(mileageParams()),
      entryStore.driverMileage(mileageParams()),
    ]);
    fuelSummary.value = summary;
    driverMileage.value = drivers;
    if (summaryVehicleId.value) await fetchVehicleSummary();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load mileage figures'));
  } finally {
    mileageLoading.value = false;
  }
}

function clearMileageFilters() {
  mileageFilters.from = '';
  mileageFilters.to = '';
  fetchMileage();
}

const entryDialog = ref(false);
const submittingEntry = ref(false);
const entryForm = reactive<{
  vehicleId: string;
  fuelType: string;
  billingMethod: string;
  fuelCardId: string;
  quantityLiters: number | undefined;
  ratePerLiter: number | undefined;
  totalAmount: number | undefined;
  odometerReading: number | undefined;
  entryDate: string;
  location: string;
  tripId: string;
  invoiceNumber: string;
  referenceNumber: string;
  remarks: string;
}>({
  vehicleId: '',
  fuelType: 'DIESEL',
  billingMethod: '',
  fuelCardId: '',
  quantityLiters: undefined,
  ratePerLiter: undefined,
  totalAmount: undefined,
  odometerReading: undefined,
  entryDate: new Date().toISOString().substring(0, 10),
  location: '',
  tripId: '',
  invoiceNumber: '',
  referenceNumber: '',
  remarks: '',
});
const entryErrors = reactive({ vehicleId: '', totalAmount: '', odometerReading: '' });

// Both a physical swipe and an OTP-authorized app transaction spend the
// shared diesel card account; only Direct Payment is the driver's own money.
const isCardBilled = computed(() => entryForm.billingMethod === 'FUEL_CARD' || entryForm.billingMethod === 'OTP');

/**
 * Whichever two of amount/quantity/rate are filled in decide the third —
 * mirrors resolveFuelFigures() on the server, so what the dialog previews is
 * what gets stored.
 */
const fillFigures = computed(() => {
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

const fillHint =
  'Fill in whichever you have: the amount paid, the quantity, or the quantity and rate. The rest is worked out for you.';

const fillSummary = computed(() => {
  const { quantity, rate, amount } = fillFigures.value;
  if (amount == null && quantity == null) return 'Enter the amount paid or the quantity to record this fill.';
  const parts: string[] = [];
  if (amount != null) parts.push(`Total ${formatCurrency(amount)}`);
  if (quantity != null) parts.push(`${quantity} L`);
  if (rate != null) parts.push(`${formatCurrency(rate)} / L`);
  const tail = quantity == null ? ' — quantity not recorded, so this fill has no mileage.' : '';
  return `${parts.join(' · ')}${tail}`;
});

function openEntryDialog() {
  Object.assign(entryForm, {
    vehicleId: '',
    fuelType: 'DIESEL',
    billingMethod: '',
    fuelCardId: '',
    quantityLiters: undefined,
    ratePerLiter: undefined,
    totalAmount: undefined,
    odometerReading: undefined,
    entryDate: new Date().toISOString().substring(0, 10),
    location: '',
    tripId: '',
    invoiceNumber: '',
    referenceNumber: '',
    remarks: '',
  });
  Object.assign(entryErrors, { vehicleId: '', totalAmount: '', odometerReading: '' });
  autoTrip.value = null;
  entryDialog.value = true;
}

// --- Live trip/driver auto-detection as Vehicle/Date change ---
const autoTrip = ref<{ id: string; tripNumber: string; driver: { id: string; name: string; code: string } | null } | null>(null);
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
  // Rate alone says nothing about the size of the fill, so the amount or the
  // quantity has to be there — same rule the API enforces.
  const hasAmount = !!entryForm.totalAmount && entryForm.totalAmount > 0;
  const hasQuantity = !!entryForm.quantityLiters && entryForm.quantityLiters > 0;
  entryErrors.totalAmount = hasAmount || hasQuantity ? '' : 'Enter the amount paid, the quantity, or both';
  entryErrors.odometerReading = !entryForm.odometerReading || entryForm.odometerReading <= 0 ? 'Meter reading is required' : '';
  return !Object.values(entryErrors).some(Boolean);
}

async function onSubmitEntry() {
  if (!validateEntry()) return;
  submittingEntry.value = true;
  try {
    await entryStore.create({
      vehicleId: entryForm.vehicleId,
      fuelType: entryForm.fuelType,
      billingMethod: entryForm.billingMethod || undefined,
      fuelCardId: entryForm.fuelCardId || undefined,
      quantityLiters: entryForm.quantityLiters || undefined,
      ratePerLiter: entryForm.ratePerLiter || undefined,
      totalAmount: entryForm.totalAmount || undefined,
      odometerReading: entryForm.odometerReading,
      entryDate: entryForm.entryDate,
      location: entryForm.location || undefined,
      tripId: entryForm.tripId || undefined,
      invoiceNumber: entryForm.invoiceNumber || undefined,
      referenceNumber: entryForm.referenceNumber || undefined,
      remarks: entryForm.remarks || undefined,
    });
    success('Fuel entry recorded');
    entryDialog.value = false;
    fetchEntries();
    refreshCardAccount();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to record fuel entry'));
  } finally {
    submittingEntry.value = false;
  }
}

const deleteEntryDialog = ref(false);
const deleteEntryTarget = ref<any>(null);
const deletingEntry = ref(false);
function openDeleteEntry(entry: any) {
  deleteEntryTarget.value = entry;
  deleteEntryDialog.value = true;
}
async function submitDeleteEntry() {
  if (!deleteEntryTarget.value) return;
  deletingEntry.value = true;
  try {
    await entryStore.remove(deleteEntryTarget.value.id);
    success('Fuel entry deleted');
    deleteEntryDialog.value = false;
    fetchEntries();
    refreshCardAccount();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete fuel entry'));
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
    const response = await importApi.run('FUEL_ENTRY', importFile.value);
    importResult.value = response.data.data;
    success('Import finished');
    fetchEntries();
  } catch (err) {
    error(extractErrorMessage(err, 'Import failed'));
  } finally {
    importing.value = false;
  }
}

async function downloadFuelSample() {
  try {
    const response = await importApi.downloadSample('FUEL_ENTRY');
    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fuel-entry-import-sample.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to download sample file'));
  }
}

// --- Vehicle Fuel Tracking summary ---
const summaryVehicleId = ref('');
const vehicleSummary = ref<VehicleFuelSummary | null>(null);
async function fetchVehicleSummary() {
  vehicleSummary.value = null;
  if (!summaryVehicleId.value) return;
  try {
    vehicleSummary.value = await entryStore.vehicleSummary(summaryVehicleId.value, mileageParams());
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to fetch vehicle fuel summary'));
  }
}

// --- Fuel Cards ---
const cardPage = ref(1);
const cardHeaders = [
  { title: 'Card Number', key: 'cardNumber', sortable: false },
  { title: 'Issued To', key: 'issuedTo', sortable: false },
  { title: 'Status', key: 'isActive', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];
async function fetchCards() {
  await cardStore.fetchList({ page: cardPage.value, pageSize: 10 });
}

const cardDialog = ref(false);
const cardEditTarget = ref<any>(null);
const submittingCard = ref(false);
const cardForm = reactive({ cardNumber: '', issuedTo: '' });
const cardErrors = reactive({ cardNumber: '' });

function openCardDialog(card?: any) {
  cardEditTarget.value = card ?? null;
  Object.assign(cardForm, {
    cardNumber: card?.cardNumber || '',
    issuedTo: card?.issuedTo || '',
  });
  cardErrors.cardNumber = '';
  cardDialog.value = true;
}

async function onSubmitCard() {
  cardErrors.cardNumber = cardForm.cardNumber.trim() ? '' : 'Card number is required';
  if (cardErrors.cardNumber) return;
  submittingCard.value = true;
  try {
    const payload = { cardNumber: cardForm.cardNumber, issuedTo: cardForm.issuedTo || undefined };
    if (cardEditTarget.value) {
      await cardStore.update(cardEditTarget.value.id, payload);
      success('Fuel card updated');
    } else {
      await cardStore.create(payload);
      success('Fuel card created');
    }
    cardDialog.value = false;
    fetchCards();
  } catch (err) {
    error(extractErrorMessage(err, cardEditTarget.value ? 'Failed to update fuel card' : 'Failed to create fuel card'));
  } finally {
    submittingCard.value = false;
  }
}

async function onToggleCard(card: any) {
  try {
    await cardStore.toggleStatus(card.id);
    success('Status updated');
    fetchCards();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update status'));
  }
}

const deleteCardDialog = ref(false);
const deleteCardTarget = ref<any>(null);
const deletingCard = ref(false);

function openDeleteCard(card: any) {
  deleteCardTarget.value = card;
  deleteCardDialog.value = true;
}

async function submitDeleteCard() {
  if (!deleteCardTarget.value) return;
  deletingCard.value = true;
  try {
    await cardStore.remove(deleteCardTarget.value.id);
    success('Fuel card deleted');
    deleteCardDialog.value = false;
    fetchCards();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete fuel card'));
    deleteCardDialog.value = false;
  } finally {
    deletingCard.value = false;
  }
}

onMounted(async () => {
  const [vehiclesRes, tripsRes] = await Promise.all([
    vehicleStore.fetchList({ pageSize: 200 }),
    tripStore.fetchList({ pageSize: 100 }),
  ]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  tripOptions.value = tripStore.items.map((t: any) => ({ id: t.id, tripNumber: t.tripNumber }));
  void vehiclesRes;
  void tripsRes;
  fetchEntries();
  fetchCards();
  fetchMileage();
  // Only used to show what a card-billed fill will draw on, so a missing
  // permission should not take the page down with it.
  if (canViewCardAccount) cardAccountStore.fetchAccount().catch(() => undefined);
});
</script>
