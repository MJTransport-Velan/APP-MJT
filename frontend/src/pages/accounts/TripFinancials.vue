<template>
  <div>
    <h2 class="text-h6 mb-4">Trip Financials</h2>

    <DateRangeFilterBar
      v-if="activeTab !== 'trip'"
      :date-from="dateFrom"
      :date-to="dateTo"
      @update:date-from="setFrom"
      @update:date-to="setTo"
      @preset="apply"
      @clear="clear"
    />

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="trip">Trip Lookup</AppTab>
      <AppTab value="vehicle">Vehicle Profit</AppTab>
      <AppTab value="supplier">Supplier Profit</AppTab>
      <AppTab value="customer">Customer Profit</AppTab>
    </AppTabs>

    <AppWindow v-model="activeTab">
      <!-- Trip Lookup -->
      <AppWindowItem value="trip">
        <AppCard class="pa-4 mb-4">
          <AppSelect
            v-model="selectedTripId"
            :items="tripOptions"
            item-title="tripNumber"
            item-value="id"
            label="Select Completed Trip"
            density="compact"
            hide-details
            style="max-width: 360px"
            @update:model-value="onTripSelected"
          />
        </AppCard>

        <FinancialSummary v-if="store.tripLine" :cards="tripCards" />
        <AppAlert v-else type="info" variant="tonal">Select a trip to view its revenue, expenses, and profit.</AppAlert>
      </AppWindowItem>

      <!-- Vehicle Profit -->
      <AppWindowItem value="vehicle">
        <AppCard>
          <div class="table-scroll">
          <AppTable>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th class="text-right">Trips</th>
                <th class="text-right">Income</th>
                <th class="text-right">Supplier</th>
                <th class="text-right">Driver</th>
                <th class="text-right">Diesel</th>
                <th class="text-right">FASTag</th>
                <th class="text-right">Repairs</th>
                <th class="text-right">Other</th>
                <th class="text-right">Total Cost</th>
                <th class="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in store.vehicleWise" :key="row.vehicleId">
                <td>{{ row.registrationNumber }}</td>
                <td class="text-right">{{ row.tripCount }}</td>
                <td class="text-right">{{ formatCurrency(row.income) }}</td>
                <td class="text-right">{{ formatCurrency(row.supplierCharges) }}</td>
                <td class="text-right">{{ formatCurrency(row.driverCost) }}</td>
                <td class="text-right">{{ formatCurrency(row.dieselCost) }}</td>
                <td class="text-right">{{ formatCurrency(row.fastTagCost) }}</td>
                <td class="text-right">{{ formatCurrency(row.repairCost) }}</td>
                <td class="text-right">{{ formatCurrency(row.otherExpenses) }}</td>
                <td class="text-right">{{ formatCurrency(row.totalCost) }}</td>
                <td class="text-right" :class="row.profit >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(row.profit) }}</td>
              </tr>
            </tbody>
          </AppTable>
          </div>
          <p v-if="store.vehicleWise.length === 0" class="text-caption text-medium-emphasis pa-4">No completed trips found.</p>
        </AppCard>
      </AppWindowItem>

      <!-- Supplier Profit -->
      <AppWindowItem value="supplier">
        <AppCard>
          <div class="table-scroll">
          <AppTable>
            <thead>
              <tr>
                <th>Supplier</th>
                <th class="text-right">Trips</th>
                <th class="text-right">Income</th>
                <th class="text-right">Supplier</th>
                <th class="text-right">Driver</th>
                <th class="text-right">Diesel</th>
                <th class="text-right">FASTag</th>
                <th class="text-right">Repairs</th>
                <th class="text-right">Other</th>
                <th class="text-right">Total Cost</th>
                <th class="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in store.supplierWise" :key="row.supplierId">
                <td>{{ row.supplierName }}</td>
                <td class="text-right">{{ row.tripCount }}</td>
                <td class="text-right">{{ formatCurrency(row.income) }}</td>
                <td class="text-right">{{ formatCurrency(row.supplierCharges) }}</td>
                <td class="text-right">{{ formatCurrency(row.driverCost) }}</td>
                <td class="text-right">{{ formatCurrency(row.dieselCost) }}</td>
                <td class="text-right">{{ formatCurrency(row.fastTagCost) }}</td>
                <td class="text-right">{{ formatCurrency(row.repairCost) }}</td>
                <td class="text-right">{{ formatCurrency(row.otherExpenses) }}</td>
                <td class="text-right">{{ formatCurrency(row.totalCost) }}</td>
                <td class="text-right" :class="row.profit >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(row.profit) }}</td>
              </tr>
            </tbody>
          </AppTable>
          </div>
          <p v-if="store.supplierWise.length === 0" class="text-caption text-medium-emphasis pa-4">No supplier trips found.</p>
        </AppCard>
      </AppWindowItem>

      <!-- Customer Profit -->
      <AppWindowItem value="customer">
        <AppCard>
          <div class="table-scroll">
          <AppTable>
            <thead>
              <tr>
                <th>Customer</th>
                <th class="text-right">Trips</th>
                <th class="text-right">Income</th>
                <th class="text-right">Supplier</th>
                <th class="text-right">Driver</th>
                <th class="text-right">Diesel</th>
                <th class="text-right">FASTag</th>
                <th class="text-right">Repairs</th>
                <th class="text-right">Other</th>
                <th class="text-right">Total Cost</th>
                <th class="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in store.customerWise" :key="row.companyId">
                <td>{{ row.companyName }}</td>
                <td class="text-right">{{ row.tripCount }}</td>
                <td class="text-right">{{ formatCurrency(row.income) }}</td>
                <td class="text-right">{{ formatCurrency(row.supplierCharges) }}</td>
                <td class="text-right">{{ formatCurrency(row.driverCost) }}</td>
                <td class="text-right">{{ formatCurrency(row.dieselCost) }}</td>
                <td class="text-right">{{ formatCurrency(row.fastTagCost) }}</td>
                <td class="text-right">{{ formatCurrency(row.repairCost) }}</td>
                <td class="text-right">{{ formatCurrency(row.otherExpenses) }}</td>
                <td class="text-right">{{ formatCurrency(row.totalCost) }}</td>
                <td class="text-right" :class="row.profit >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(row.profit) }}</td>
              </tr>
            </tbody>
          </AppTable>
          </div>
          <p v-if="store.customerWise.length === 0" class="text-caption text-medium-emphasis pa-4">No customer trips found.</p>
        </AppCard>
      </AppWindowItem>
    </AppWindow>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useTripFinancialStore } from '@/stores/accounts';
import { tripApi } from '@/services/operations';
import { formatCurrency } from '@/utils/format';
import FinancialSummary from '@/components/accounts/FinancialSummary.vue';
import {
  AppTabs,
  AppTab,
  AppWindow,
  AppWindowItem,
  AppCard,
  AppSelect,
  AppAlert,
  AppTable,
} from '@/components/ui';
import type { Trip } from '@/types/operations.types';
import { useDateRangeFilter } from '@/composables/useDateRangeFilter';
import { DateRangeFilterBar } from '@/components/filters';

const store = useTripFinancialStore();

const activeTab = ref('trip');
const tripOptions = ref<Trip[]>([]);
const selectedTripId = ref<string | null>(null);

const tripCards = computed(() => {
  if (!store.tripLine) return [];
  return [
    { label: 'Revenue', value: store.tripLine.income },
    { label: 'Supplier Charges', value: store.tripLine.supplierCharges },
    { label: 'Driver Cost', value: store.tripLine.driverCost },
    { label: 'Diesel', value: store.tripLine.dieselCost },
    { label: 'FASTag', value: store.tripLine.fastTagCost },
    { label: 'Repairs', value: store.tripLine.repairCost },
    { label: 'Other Expenses', value: store.tripLine.otherExpenses },
    { label: 'Total Cost', value: store.tripLine.totalCost },
    { label: 'Profit', value: store.tripLine.profit },
  ];
});

async function onTripSelected(tripId: string) {
  if (!tripId) return;
  await store.fetchForTrip(tripId);
}

// These endpoints take `from`/`to` rather than the `dateFrom`/`dateTo` pair
// the dashboards use; both spellings are accepted server-side, but the
// store's own signature is `from`/`to`, so map to it here.
const { dateFrom, dateTo, setFrom, setTo, apply, clear } = useDateRangeFilter({ onChange: reloadActive });

const rangeParams = computed(() => ({
  ...(dateFrom.value ? { from: dateFrom.value } : {}),
  ...(dateTo.value ? { to: dateTo.value } : {}),
}));

function reloadActive() {
  if (activeTab.value === 'vehicle') store.fetchVehicleWise(rangeParams.value);
  if (activeTab.value === 'supplier') store.fetchSupplierWise(rangeParams.value);
  if (activeTab.value === 'customer') store.fetchCustomerWise(rangeParams.value);
}

watch(activeTab, (tab) => {
  if (tab === 'vehicle' && store.vehicleWise.length === 0) store.fetchVehicleWise(rangeParams.value);
  if (tab === 'supplier' && store.supplierWise.length === 0) store.fetchSupplierWise(rangeParams.value);
  if (tab === 'customer' && store.customerWise.length === 0) store.fetchCustomerWise(rangeParams.value);
});

onMounted(async () => {
  const response = await tripApi.list({ status: 'COMPLETED', pageSize: 200 });
  tripOptions.value = response.data.data;
});
</script>

<style scoped>
.table-scroll {
  overflow-x: auto;
}
</style>
