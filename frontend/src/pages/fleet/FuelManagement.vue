<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6 mb-0">Diesel / Fuel</h2>
      <AppBtn variant="outlined" prepend-icon="mdi-file-upload-outline" @click="openImportDialog">Import</AppBtn>
    </div>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="entries">Fuel Entries</AppTab>
      <AppTab value="cards">Fuel Cards</AppTab>
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
          <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCardDialog">New Fuel Card</AppBtn>
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
            <AppBtn icon="mdi-toggle-switch-outline" variant="text" size="small" @click="onToggleCard(item as any)" />
          </template>
        </MasterDataTable>
      </AppWindowItem>

      <!-- Consumption -->
      <AppWindowItem value="consumption">
        <div class="row">
          <div class="col-12 col-sm-6 col-md-3">
            <FuelSummaryCard label="Total Fuel Cost (page)" :value="formatCurrency(totalFuelCost)" icon="mdi-cash" color="success" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <FuelSummaryCard label="Total Liters (page)" :value="`${totalLiters.toFixed(1)} L`" icon="mdi-gas-station" color="info" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <FuelSummaryCard label="Average Mileage (page)" :value="`${averageMileage.toFixed(2)} km/l`" icon="mdi-speedometer" color="primary" />
          </div>
        </div>
        <p class="text-caption text-medium-emphasis mt-2 mb-6">
          Figures above are calculated from the fuel entries currently loaded on the Fuel Entries tab.
        </p>

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
      <div class="row row-dense">
        <div class="col-6">
          <AppTextField v-model.number="entryForm.quantityLiters" type="number" label="Quantity (L)" :error-messages="entryErrors.quantityLiters" />
        </div>
        <div class="col-6">
          <AppTextField v-model.number="entryForm.ratePerLiter" type="number" label="Rate / Liter" :error-messages="entryErrors.ratePerLiter" />
        </div>
      </div>
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
      <div class="text-caption text-medium-emphasis mt-2">
        Total: {{ formatCurrency((entryForm.quantityLiters || 0) * (entryForm.ratePerLiter || 0)) }} (calculated automatically)
      </div>
    </MasterFormDialog>

    <!-- Fuel Card Dialog -->
    <MasterFormDialog v-model="cardDialog" title="New Fuel Card" :loading="submittingCard" @submit="onSubmitCard">
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
            Excel (.xlsx) columns: vehicleRegistrationNumber, quantityLiters, ratePerLiter,
            odometerReading, entryDate, tripNumber, fuelType, billingMethod, invoiceNumber, referenceNumber, remarks.
            Driver is auto-derived from the trip, never taken from the file.
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useFuelEntryStore, useFuelCardStore } from '@/stores/fleet';
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
import {
  AppTabs, AppTab, AppWindow, AppWindowItem, AppBtn, AppSelect, AppTextField, AppChip,
  AppCard, AppCardTitle, AppCardText, AppCardActions, AppDialog, AppFileInput,
  ExcelExportButton,
} from '@/components/ui';
import type { VehicleFuelSummary } from '@/types/fleet.types';

const entryStore = useFuelEntryStore();
const cardStore = useFuelCardStore();
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

const totalFuelCost = computed(() => entryStore.items.reduce((sum, e: any) => sum + Number(e.totalAmount || 0), 0));
const totalLiters = computed(() => entryStore.items.reduce((sum, e: any) => sum + Number(e.quantityLiters || 0), 0));
const averageMileage = computed(() => {
  const withMileage = entryStore.items.filter((e: any) => e.mileageKmpl);
  if (withMileage.length === 0) return 0;
  const sum = withMileage.reduce((acc, e: any) => acc + Number(e.mileageKmpl), 0);
  return sum / withMileage.length;
});

const entryDialog = ref(false);
const submittingEntry = ref(false);
const entryForm = reactive<{
  vehicleId: string;
  fuelType: string;
  billingMethod: string;
  fuelCardId: string;
  quantityLiters: number | undefined;
  ratePerLiter: number | undefined;
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
  odometerReading: undefined,
  entryDate: new Date().toISOString().substring(0, 10),
  location: '',
  tripId: '',
  invoiceNumber: '',
  referenceNumber: '',
  remarks: '',
});
const entryErrors = reactive({ vehicleId: '', quantityLiters: '', ratePerLiter: '', odometerReading: '' });

function openEntryDialog() {
  Object.assign(entryForm, {
    vehicleId: '',
    fuelType: 'DIESEL',
    billingMethod: '',
    fuelCardId: '',
    quantityLiters: undefined,
    ratePerLiter: undefined,
    odometerReading: undefined,
    entryDate: new Date().toISOString().substring(0, 10),
    location: '',
    tripId: '',
    invoiceNumber: '',
    referenceNumber: '',
    remarks: '',
  });
  Object.assign(entryErrors, { vehicleId: '', quantityLiters: '', ratePerLiter: '', odometerReading: '' });
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
  entryErrors.quantityLiters = !entryForm.quantityLiters || entryForm.quantityLiters <= 0 ? 'Quantity must be greater than 0' : '';
  entryErrors.ratePerLiter = !entryForm.ratePerLiter || entryForm.ratePerLiter <= 0 ? 'Rate must be greater than 0' : '';
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
      quantityLiters: entryForm.quantityLiters,
      ratePerLiter: entryForm.ratePerLiter,
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
    vehicleSummary.value = await entryStore.vehicleSummary(summaryVehicleId.value);
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
const submittingCard = ref(false);
const cardForm = reactive({ cardNumber: '', issuedTo: '' });
const cardErrors = reactive({ cardNumber: '' });

function openCardDialog() {
  Object.assign(cardForm, { cardNumber: '', issuedTo: '' });
  cardErrors.cardNumber = '';
  cardDialog.value = true;
}

async function onSubmitCard() {
  cardErrors.cardNumber = cardForm.cardNumber.trim() ? '' : 'Card number is required';
  if (cardErrors.cardNumber) return;
  submittingCard.value = true;
  try {
    await cardStore.create({ cardNumber: cardForm.cardNumber, issuedTo: cardForm.issuedTo || undefined });
    success('Fuel card created');
    cardDialog.value = false;
    fetchCards();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create fuel card'));
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
});
</script>
