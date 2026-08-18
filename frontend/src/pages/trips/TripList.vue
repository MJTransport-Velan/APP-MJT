<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Trips</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Plan, assign and track trips for approved intents — own fleet and market vehicles
        </p>
      </div>
      <div class="d-flex flex-wrap ga-2">
        <AppBtn
          v-if="!forcedSource || forcedSource === 'OWN'"
          :variant="sourceFilter === 'OWN' ? 'flat' : 'outlined'"
          :color="sourceFilter === 'OWN' ? 'primary' : undefined"
          prepend-icon="mdi-truck-outline"
          @click="toggleSource('OWN')"
        >
          Own Fleet
        </AppBtn>
        <AppBtn
          v-if="!forcedSource || forcedSource === 'MARKET'"
          :variant="sourceFilter === 'MARKET' ? 'flat' : 'outlined'"
          :color="sourceFilter === 'MARKET' ? 'primary' : undefined"
          prepend-icon="mdi-handshake-outline"
          @click="toggleSource('MARKET')"
        >
          Market Vehicle
        </AppBtn>
      </div>
    </div>

    <div class="stat-grid mb-4">
      <AppCard
        v-for="card in statCards"
        :key="card.key"
        variant="outlined"
        class="stat-card"
        :class="{ 'stat-card--active': activeStat === card.key }"
        @click="onStatClick(card.key)"
      >
        <div class="d-flex align-center ga-3 pa-3">
          <div class="stat-card__icon" :style="{ background: card.iconBg }">
            <AppIcon :icon="card.icon" size="small" />
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">{{ card.label }}</div>
            <div class="text-h6" :style="{ color: card.color }">{{ card.value }}</div>
          </div>
        </div>
      </AppCard>
    </div>

    <MasterDataTable
      :headers="headers"
      :items="store.items"
      :items-length="store.meta?.total || 0"
      :loading="store.loading"
      :search="search"
      :page="page"
      :page-size="pageSize"
      item-label="trips"
      :row-border-color="rowBorderColor"
      export-filename="trip-list"
      :export-columns="tripExportColumns"
      :export-row-mapper="exportRowMapper"
      :export-summary-row="tripExportSummaryRow"
      :on-export-all="exportAllTrips"
      @update:search="onSearchUpdate"
      @update:page="onPageUpdate"
      @update:page-size="onPageSizeUpdate"
    >
      <template #filters>
        <AppSelect v-model="statusFilter" :items="statusOptions" label="Status" placeholder="All Status" clearable @update:model-value="onFilterChange" />
        <AppDateRangePicker v-model:from="dateFrom" v-model:to="dateTo" @change="onFilterChange" />
        <AppMenu>
          <template #activator>
            <AppBtn variant="outlined" append-icon="mdi-chevron-down">Filters</AppBtn>
          </template>
          <div class="filters-panel" @click.stop>
            <AppSelect
              v-model="vehicleIdFilter"
              :items="vehicleOptions"
              item-title="registrationNumber"
              item-value="id"
              label="Vehicle"
              clearable
              @update:model-value="onFilterChange"
            />
            <AppSelect
              v-model="driverIdFilter"
              :items="driverOptions"
              item-title="name"
              item-value="id"
              label="Driver"
              clearable
              @update:model-value="onFilterChange"
            />
          </div>
        </AppMenu>
      </template>

      <template #item.tripNumber="{ item, value }">
        <div class="d-flex align-center ga-2">
          <span class="trip-badge" :style="{ background: rowBorderColor(item as any) + '22', color: rowBorderColor(item as any) }">
            <AppIcon icon="mdi-truck-outline" size="small" />
          </span>
          <span class="font-weight-medium">{{ value }}</span>
        </div>
      </template>
      <template #item.company="{ item }">
        <div class="font-weight-medium">{{ (item as any).intent.company.name }}</div>
        <RouteInfoCard :from-label="(item as any).fromLocation.name" :to-label="(item as any).toLocation.name" />
      </template>
      <template #item.vehicle="{ item }">
        <AppChip size="x-small" :color="teamOf(item as any) === 'MARKET' ? 'secondary' : 'primary'" class="mb-1">
          {{ teamOf(item as any) === 'MARKET' ? 'Market Vehicle Team' : 'Own Vehicle Team' }}
        </AppChip>
        <div class="text-body-2">{{ (item as any).vehicle?.registrationNumber || '-' }}</div>
        <div class="text-caption text-medium-emphasis">{{ (item as any).driver?.name || 'Awaiting assignment' }}</div>
      </template>
      <template #item.freightAmount="{ item }">{{ (item as any).freightAmount ? formatCurrency((item as any).freightAmount) : '-' }}</template>
      <template #item.progress="{ item }">
        <div class="text-caption font-weight-medium mb-1">{{ progressFor((item as any).status) }}%</div>
        <div class="progress-track"><div class="progress-fill" :style="{ width: progressFor((item as any).status) + '%' }"></div></div>
      </template>
      <template #item.status="{ item }">
        <TripStatusChip :status="(item as any).status" />
        <AppChip v-if="(item as any).isDelayed" size="x-small" color="error" variant="flat" class="ml-1">Delayed</AppChip>
      </template>
      <template #item.createdBy="{ item }">{{ (item as any).assignedBy?.fullName || '-' }}</template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-eye-outline" variant="text" size="small" title="View trip" @click="openTrip(item as any)" />
        <AppBtn
          icon="mdi-account-switch-outline"
          variant="text"
          size="small"
          title="Assign vehicle & driver"
          @click="openAssignDialog(item as any)"
        />
        <AppBtn icon="mdi-pencil-outline" variant="text" size="small" title="Freight & load planning" @click="openPlanDialog(item as any)" />
        <AppBtn
          v-if="!['COMPLETED', 'CANCELLED'].includes((item as any).status)"
          icon="mdi-close-circle-outline"
          variant="text"
          size="small"
          title="Cancel trip"
          @click="openCancelDialog(item as any)"
        />
      </template>
    </MasterDataTable>

    <!-- Freight / Load Planning -->
    <MasterFormDialog v-model="planDialog" title="Freight & Load Planning" :loading="planning" @submit="onSavePlan">
      <AppTextField v-model.number="planForm.freightAmount" type="number" label="Freight Amount" class="mb-2" />
      <AppTextField v-model.number="planForm.loadWeight" type="number" label="Load Weight (T)" class="mb-2" />
      <AppTextarea v-model="planForm.loadDescription" label="Load Description" rows="2" />
    </MasterFormDialog>

    <AllocateAssetDialog
      v-model="assignDialog"
      :trip="assignTarget"
      :vehicle-options="availableVehicleOptions"
      :driver-options="availableDriverOptions"
      :supplier-options="supplierOptions"
      :vehicle-driver-map="vehicleDriverMap"
      :loading="assigning"
      @submit="onAssignSubmit"
    />

    <AppDialog v-model="cancelDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Cancel Trip</AppCardTitle>
        <AppCardText>
          <AppTextarea v-model="cancelReason" label="Cancellation Reason" rows="3" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="cancelDialog = false">Close</AppBtn>
          <AppBtn color="error" variant="flat" :loading="cancelling" @click="submitCancel">Cancel Trip</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTripStore } from '@/stores/operations';
import { tripApi } from '@/services/operations';
import { useAuthStore } from '@/stores/auth.store';
import { useVehicleStore, useDriverStore } from '@/stores/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import TripStatusChip from '@/components/operations/TripStatusChip.vue';
import RouteInfoCard from '@/components/operations/RouteInfoCard.vue';
import AllocateAssetDialog, { VehicleDriverInfo } from '@/components/operations/AllocateAssetDialog.vue';
import { vehicleAssignmentApi } from '@/services/fleet';
import { supplierApi } from '@/services/masters';
import {
  AppSelect,
  AppChip,
  AppBtn,
  AppIcon,
  AppCard,
  AppDialog,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppTextField,
  AppTextarea,
  AppMenu,
  AppDateRangePicker,
} from '@/components/ui';
import type { Trip } from '@/types/operations.types';

const route = useRoute();
const router = useRouter();
const store = useTripStore();
const authStore = useAuthStore();
const vehicleStore = useVehicleStore();
const driverStore = useDriverStore();
const { success, error } = useSnackbar();

// Fleet operators are locked to their own ownership's trips server-side
// (trip.service.ts); mirror that here so the toggle doesn't offer a choice
// that the backend will silently ignore.
const forcedSource = computed<'OWN' | 'MARKET' | null>(() => {
  const roles = authStore.user?.roles || [];
  if (roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'OPERATION_MANAGER'].includes(r))) return null;
  if (roles.includes('OWN_FLEET_OPERATOR')) return 'OWN';
  if (roles.includes('MARKET_FLEET_OPERATOR')) return 'MARKET';
  return null;
});

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const statusFilter = ref<string | null>(null);
const sourceFilter = ref<'OWN' | 'MARKET' | null>(forcedSource.value);
const dateFrom = ref<string | null>(null);
const dateTo = ref<string | null>(null);
const vehicleIdFilter = ref<string | null>(null);
const driverIdFilter = ref<string | null>(null);

const statusOptions = [
  { title: 'Draft', value: 'DRAFT' },
  { title: 'Planned', value: 'PLANNED' },
  { title: 'Approved', value: 'APPROVED' },
  { title: 'Assigned', value: 'ASSIGNED' },
  { title: 'Started', value: 'STARTED' },
  { title: 'Loading', value: 'LOADING' },
  { title: 'In Transit', value: 'IN_TRANSIT' },
  { title: 'Reached Destination', value: 'REACHED_DESTINATION' },
  { title: 'Unloading', value: 'UNLOADING' },
  { title: 'Completed', value: 'COMPLETED' },
  { title: 'Cancelled', value: 'CANCELLED' },
];

const headers = [
  { title: 'Trip No.', key: 'tripNumber', sortable: false },
  { title: 'Client & Route', key: 'company', sortable: false },
  { title: 'Vehicle & Driver', key: 'vehicle', sortable: false },
  { title: 'Amount', key: 'freightAmount', sortable: false },
  { title: 'Progress', key: 'progress', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Created By', key: 'createdBy', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false },
];

// Groups the granular TripStatus enum into the 6 stat tiles.
const STAT_GROUPS: Record<string, string[]> = {
  Unassigned: ['DRAFT', 'PLANNED', 'APPROVED'],
  Assigned: ['ASSIGNED'],
  'In Transit': ['STARTED', 'LOADING', 'IN_TRANSIT', 'REACHED_DESTINATION', 'UNLOADING'],
  Completed: ['COMPLETED'],
  Cancelled: ['CANCELLED'],
};

const STAT_META: { key: string; label: string; icon: string; iconBg: string; color: string }[] = [
  { key: 'total', label: 'Total Trips', icon: 'mdi-clipboard-text-outline', iconBg: 'rgba(99,102,241,.12)', color: '#4338ca' },
  { key: 'Unassigned', label: 'Unassigned', icon: 'mdi-truck-alert-outline', iconBg: 'rgba(100,116,139,.12)', color: '#475569' },
  { key: 'Assigned', label: 'Assigned', icon: 'mdi-account-check-outline', iconBg: 'rgba(168,85,247,.14)', color: '#7e22ce' },
  { key: 'In Transit', label: 'In Transit', icon: 'mdi-truck-fast-outline', iconBg: 'rgba(245,158,11,.14)', color: '#b45309' },
  { key: 'Completed', label: 'Completed', icon: 'mdi-flag-checkered', iconBg: 'rgba(34,197,94,.14)', color: '#15803d' },
  { key: 'Cancelled', label: 'Cancelled', icon: 'mdi-cancel', iconBg: 'rgba(239,68,68,.14)', color: '#b91c1c' },
];

const activeStat = computed(() => activeStatKey.value);
const activeStatKey = ref((route.query.statusGroup as string) || 'total');

const statCards = computed(() =>
  STAT_META.map((m) => {
    if (m.key === 'total') return { ...m, value: store.stats?.total ?? 0 };
    const statuses = STAT_GROUPS[m.key] || [];
    const value = statuses.reduce((sum, s) => sum + ((store.stats as any)?.[s] ?? 0), 0);
    return { ...m, value };
  })
);

// Once a vehicle is assigned, its actual ownership is the source of truth.
// Before that, the trip is still routed to whichever team was chosen at
// intent approval (Trip.fleetType) — that's what should drive the badge on
// an unassigned trip, not a blank/default "Own" label. Legacy trips that
// predate fleetType (both null) fall back to "Own" as before.
function teamOf(item: Trip): 'OWN' | 'MARKET' {
  return item.vehicle?.ownership || item.fleetType || 'OWN';
}

function rowBorderColor(item: Record<string, unknown>) {
  const status = item.status as string;
  const groupKey = Object.keys(STAT_GROUPS).find((key) => STAT_GROUPS[key].includes(status));
  const meta = STAT_META.find((m) => m.key === groupKey);
  return meta?.color || '#94a3b8';
}

const PROGRESS_STEPS = ['ASSIGNED', 'STARTED', 'LOADING', 'IN_TRANSIT', 'REACHED_DESTINATION', 'UNLOADING', 'COMPLETED'];
function progressFor(status: string) {
  if (status === 'CANCELLED' || status === 'DRAFT' || status === 'PLANNED' || status === 'APPROVED') return 0;
  const idx = PROGRESS_STEPS.indexOf(status);
  if (idx === -1) return 0;
  return Math.round((idx / (PROGRESS_STEPS.length - 1)) * 100);
}

function onStatClick(key: string) {
  activeStatKey.value = key;
  page.value = 1;
  fetchData();
}

function toggleSource(source: 'OWN' | 'MARKET') {
  if (forcedSource.value) return;
  sourceFilter.value = sourceFilter.value === source ? null : source;
  page.value = 1;
  fetchData();
}

let debounceTimer: ReturnType<typeof setTimeout>;
function onSearchUpdate(value: string) {
  search.value = value;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    fetchData();
  }, 350);
}
function onPageUpdate(v: number) {
  page.value = v;
  fetchData();
}
function onPageSizeUpdate(v: number) {
  pageSize.value = v;
  fetchData();
}
function onFilterChange() {
  activeStatKey.value = 'total';
  page.value = 1;
  fetchData();
}

function buildFilterParams(): Record<string, unknown> {
  const params: Record<string, unknown> = {
    search: search.value || undefined,
  };
  if (statusFilter.value) {
    params.status = statusFilter.value;
  } else if (activeStatKey.value !== 'total' && STAT_GROUPS[activeStatKey.value]) {
    params.statusIn = STAT_GROUPS[activeStatKey.value].join(',');
  }
  if (sourceFilter.value) {
    params.vehicleOwnership = sourceFilter.value;
  }
  if (dateFrom.value) params.dateFrom = dateFrom.value;
  if (dateTo.value) params.dateTo = dateTo.value;
  if (vehicleIdFilter.value) params.vehicleId = vehicleIdFilter.value;
  if (driverIdFilter.value) params.driverId = driverIdFilter.value;
  return params;
}

async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, ...buildFilterParams() });
}

const tripExportColumns = [
  { header: 'Trip No.', key: 'tripNumber' },
  { header: 'Client', key: 'company' },
  { header: 'Route', key: 'route' },
  { header: 'Vehicle', key: 'vehicle' },
  { header: 'Driver', key: 'driver' },
  { header: 'Client Amount', key: 'freightAmount' },
  { header: 'Supplier Amount', key: 'supplierAmount' },
  { header: 'Profit', key: 'profit' },
  { header: 'Status', key: 'status' },
  { header: 'Created By', key: 'createdBy' },
];

function exportRowMapper(item: Record<string, unknown>) {
  const trip = item as unknown as Trip;
  const freightAmount = Number(trip.freightAmount || 0);
  const supplierAmount = Number(trip.supplierRate || 0);
  return {
    tripNumber: trip.tripNumber,
    company: trip.intent.company.name,
    route: `${trip.fromLocation.name} -> ${trip.toLocation.name}`,
    vehicle: trip.vehicle?.registrationNumber || '-',
    driver: trip.driver?.name || 'Awaiting assignment',
    freightAmount,
    supplierAmount,
    profit: freightAmount - supplierAmount,
    status: trip.status,
    createdBy: trip.assignedBy?.fullName || '-',
  };
}

function tripExportSummaryRow(rows: Record<string, unknown>[]) {
  const totalFreight = rows.reduce((sum, r) => sum + Number(r.freightAmount || 0), 0);
  const totalSupplier = rows.reduce((sum, r) => sum + Number(r.supplierAmount || 0), 0);
  return {
    tripNumber: 'TOTAL',
    company: '',
    route: '',
    vehicle: '',
    driver: '',
    freightAmount: totalFreight,
    supplierAmount: totalSupplier,
    profit: totalFreight - totalSupplier,
    status: '',
    createdBy: '',
  };
}

async function exportAllTrips() {
  const response = await tripApi.list({ pageSize: 5000, ...buildFilterParams() });
  return response.data.data as unknown as Record<string, unknown>[];
}

function openTrip(trip: Trip) {
  router.push(`/trips/${trip.id}`);
}

function refresh() {
  fetchData();
  store.fetchStats();
}

// Full catalogs — used for the "filter trips by vehicle/driver" pickers,
// which must show every vehicle/driver, not just currently free ones.
const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const driverOptions = ref<{ id: string; name: string }[]>([]);
const supplierOptions = ref<{ id: string; name: string }[]>([]);
const vehicleDriverMap = ref<Record<string, VehicleDriverInfo>>({});
// Only vehicles/drivers not currently tied up on another trip — fetched
// fresh each time the assign dialog opens, feeds the Assign dialog only.
const availableVehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const availableDriverOptions = ref<{ id: string; name: string }[]>([]);

// --- Freight/Load Planning ---
const planDialog = ref(false);
const planning = ref(false);
const planTarget = ref<Trip | null>(null);
const planForm = reactive<{ freightAmount: number | undefined; loadWeight: number | undefined; loadDescription: string }>({
  freightAmount: undefined,
  loadWeight: undefined,
  loadDescription: '',
});

function openPlanDialog(trip: Trip) {
  planTarget.value = trip;
  planForm.freightAmount = trip.freightAmount ?? undefined;
  planForm.loadWeight = trip.loadWeight ?? undefined;
  planForm.loadDescription = trip.loadDescription || '';
  planDialog.value = true;
}

async function onSavePlan() {
  if (!planTarget.value) return;
  planning.value = true;
  try {
    await store.update(planTarget.value.id, {
      freightAmount: planForm.freightAmount,
      loadWeight: planForm.loadWeight,
      loadDescription: planForm.loadDescription || undefined,
    });
    success('Trip planning details updated');
    planDialog.value = false;
    refresh();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update trip'));
  } finally {
    planning.value = false;
  }
}

// --- Assignment ---
const assignDialog = ref(false);
const assignTarget = ref<Trip | null>(null);
const assigning = ref(false);

async function openAssignDialog(trip: Trip) {
  assignTarget.value = trip;
  const resources = await store.availableResources(trip.id);
  availableVehicleOptions.value = resources.vehicles.map((v) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  availableDriverOptions.value = resources.drivers.map((d) => ({ id: d.id, name: d.name }));
  assignDialog.value = true;
}

async function onAssignSubmit(payload: Record<string, unknown>) {
  if (!assignTarget.value) return;
  assigning.value = true;
  try {
    await store.allocate(assignTarget.value.id, payload);
    success('Asset allocated successfully');
    assignDialog.value = false;
    refresh();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to allocate asset'));
  } finally {
    assigning.value = false;
  }
}

// --- Cancel ---
const cancelDialog = ref(false);
const cancelTarget = ref<Trip | null>(null);
const cancelReason = ref('');
const cancelling = ref(false);

function openCancelDialog(trip: Trip) {
  cancelTarget.value = trip;
  cancelReason.value = '';
  cancelDialog.value = true;
}

async function submitCancel() {
  if (!cancelTarget.value || !cancelReason.value.trim()) {
    error('Please provide a cancellation reason');
    return;
  }
  cancelling.value = true;
  try {
    await store.cancel(cancelTarget.value.id, cancelReason.value);
    success('Trip cancelled');
    cancelDialog.value = false;
    refresh();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to cancel trip'));
  } finally {
    cancelling.value = false;
  }
}

onMounted(async () => {
  // Settled, not all — a role missing permission for one lookup must not
  // abort the trip list/stats load itself, which is the point of this page.
  const [, , activeAssignmentsRes, suppliersRes] = await Promise.allSettled([
    vehicleStore.fetchList({ pageSize: 200 }),
    driverStore.fetchList({ pageSize: 200 }),
    vehicleAssignmentApi.list({ status: 'ACTIVE', pageSize: 500 }),
    supplierApi.list({ pageSize: 200 }),
  ]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  driverOptions.value = driverStore.items.map((d: any) => ({ id: d.id, name: d.name }));
  if (suppliersRes.status === 'fulfilled') {
    supplierOptions.value = suppliersRes.value.data.data.map((s: any) => ({ id: s.id, name: s.name }));
  }
  if (activeAssignmentsRes.status === 'fulfilled') {
    const map: Record<string, VehicleDriverInfo> = {};
    for (const a of activeAssignmentsRes.value.data.data) {
      map[a.vehicle.id] = {
        driverId: a.driver.id,
        driverName: a.driver.name,
      };
    }
    vehicleDriverMap.value = map;
  }
  refresh();
});
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.stat-card {
  cursor: pointer;
  border-width: 1.5px;
  transition: border-color 0.15s ease;
}
.stat-card--active {
  border-color: var(--color-primary);
}
.stat-card__icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.progress-track {
  height: 6px;
  border-radius: 4px;
  background: var(--color-hover);
  overflow: hidden;
  min-width: 80px;
}
.progress-fill {
  height: 100%;
  background: var(--color-primary);
}
.trip-badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.filters-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 220px;
  padding: 4px;
}
</style>
