<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Booking &amp; LR</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Parcel bookings from the MJ Express website and the counter — confirm, allocate a vehicle and issue the
          Lorry Receipt
        </p>
      </div>
      <AppBtn
        v-if="canCreate"
        color="primary"
        variant="flat"
        prepend-icon="mdi-plus"
        @click="router.push('/bookings/create')"
      >
        New Booking
      </AppBtn>
    </div>

    <div class="stat-grid mb-4">
      <AppCard
        v-for="card in statCards"
        :key="card.key"
        variant="outlined"
        class="stat-card"
        :class="{ 'stat-card--active': activeStatKey === card.key }"
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
      item-label="bookings"
      :row-border-color="rowBorderColor"
      export-filename="booking-list"
      :export-columns="exportColumns"
      :export-row-mapper="exportRowMapper"
      :on-export-all="exportAllBookings"
      @update:search="onSearchUpdate"
      @update:page="onPageUpdate"
      @update:page-size="onPageSizeUpdate"
    >
      <template #filters>
        <AppSelect
          v-model="statusFilter"
          :items="statusOptions"
          label="Status"
          placeholder="All Status"
          clearable
          @update:model-value="onFilterChange"
        />
        <AppTextField v-model="fromPlaceFilter" label="From" placeholder="Origin" clearable @update:model-value="onDebouncedFilterChange" />
        <AppTextField v-model="toPlaceFilter" label="To" placeholder="Destination" clearable @update:model-value="onDebouncedFilterChange" />
        <AppTextField v-model="pickupDateFilter" type="date" label="Pickup Date" clearable @update:model-value="onFilterChange" />
      </template>

      <template #item.bookingNo="{ item, value }">
        <div class="d-flex align-center ga-2">
          <span
            class="booking-badge"
            :style="{ background: rowBorderColor(item as any) + '22', color: rowBorderColor(item as any) }"
          >
            <AppIcon icon="mdi-package-variant-closed" size="small" />
          </span>
          <div>
            <div class="font-weight-medium">{{ value }}</div>
            <div v-if="(item as any).lrNumber" class="text-caption text-medium-emphasis">
              {{ (item as any).lrNumber }}
            </div>
          </div>
        </div>
      </template>
      <!-- Every booking detail is optional, so each cell falls back to a dash
           rather than rendering an empty row. -->
      <template #item.customer="{ item }">
        <div class="font-weight-medium">{{ (item as any).customerName || '—' }}</div>
        <div class="text-caption text-medium-emphasis">{{ (item as any).mobile || '—' }}</div>
      </template>
      <template #item.source="{ value }">
        <AppChip size="x-small" :color="value === 'COUNTER' ? 'secondary' : 'info'" variant="flat">
          {{ value === 'COUNTER' ? 'Counter' : 'Website' }}
        </AppChip>
      </template>
      <template #item.route="{ item }">
        <div class="text-body-2">{{ (item as any).fromPlace || '—' }}</div>
        <div class="text-caption text-medium-emphasis">to {{ (item as any).toPlace || '—' }}</div>
      </template>
      <template #item.pickupDate="{ value }">{{ formatDate(value as string) }}</template>
      <template #item.status="{ item }">
        <BookingStatusChip :status="(item as any).status" />
      </template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-eye-outline" variant="text" size="small" title="View booking" @click="openBooking(item as any)" />
      </template>
    </MasterDataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBookingStore } from '@/stores/bookings';
import { bookingApi } from '@/services/bookings';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import BookingStatusChip from '@/components/bookings/BookingStatusChip.vue';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { AppCard, AppCardText, AppIcon, AppBtn, AppSelect, AppTextField, AppChip } from '@/components/ui';
import type { Booking } from '@/types/bookings.types';

const router = useRouter();
const store = useBookingStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canCreate = computed(() => authStore.hasPermission('booking.create'));

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const statusFilter = ref<string | null>(null);
const fromPlaceFilter = ref('');
const toPlaceFilter = ref('');
const pickupDateFilter = ref('');

const statusOptions = [
  { title: 'Pending', value: 'PENDING' },
  { title: 'Confirmed', value: 'CONFIRMED' },
  { title: 'Rejected', value: 'REJECTED' },
  { title: 'Vehicle Assigned', value: 'VEHICLE_ASSIGNED' },
  { title: 'LR Generated', value: 'LR_GENERATED' },
  { title: 'Picked Up', value: 'PICKED_UP' },
  { title: 'In Transit', value: 'IN_TRANSIT' },
  { title: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
  { title: 'Delivered', value: 'DELIVERED' },
];

const headers = [
  { title: 'Booking No.', key: 'bookingNo', sortable: false },
  { title: 'Source', key: 'source', sortable: false },
  { title: 'Customer', key: 'customer', sortable: false },
  { title: 'Route', key: 'route', sortable: false },
  { title: 'Pickup Date', key: 'pickupDate', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false },
];

// Groups the 9 statuses into the stat tiles an operator actually triages by.
const STAT_GROUPS: Record<string, string[]> = {
  Pending: ['PENDING'],
  Confirmed: ['CONFIRMED'],
  'Awaiting LR': ['VEHICLE_ASSIGNED'],
  'In Delivery': ['LR_GENERATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'],
  Delivered: ['DELIVERED'],
  Rejected: ['REJECTED'],
};

const STAT_META: { key: string; label: string; icon: string; iconBg: string; color: string }[] = [
  { key: 'total', label: 'Total Bookings', icon: 'mdi-package-variant-closed', iconBg: 'rgba(99,102,241,.12)', color: '#4338ca' },
  { key: 'Pending', label: 'Pending', icon: 'mdi-clock-outline', iconBg: 'rgba(245,158,11,.14)', color: '#b45309' },
  { key: 'Confirmed', label: 'Confirmed', icon: 'mdi-check-circle-outline', iconBg: 'rgba(34,197,94,.14)', color: '#15803d' },
  { key: 'Awaiting LR', label: 'Awaiting LR', icon: 'mdi-file-document-alert-outline', iconBg: 'rgba(168,85,247,.14)', color: '#7e22ce' },
  { key: 'In Delivery', label: 'In Delivery', icon: 'mdi-truck-fast-outline', iconBg: 'rgba(59,130,246,.14)', color: '#1d4ed8' },
  { key: 'Delivered', label: 'Delivered', icon: 'mdi-flag-checkered', iconBg: 'rgba(34,197,94,.14)', color: '#15803d' },
  { key: 'Rejected', label: 'Rejected', icon: 'mdi-close-circle-outline', iconBg: 'rgba(239,68,68,.14)', color: '#b91c1c' },
];

const activeStatKey = ref('total');

const statCards = computed(() =>
  STAT_META.map((meta) => {
    if (meta.key === 'total') return { ...meta, value: store.stats?.total ?? 0 };
    const statuses = STAT_GROUPS[meta.key] || [];
    const value = statuses.reduce((sum, status) => sum + ((store.stats as any)?.[status] ?? 0), 0);
    return { ...meta, value };
  })
);

function rowBorderColor(item: Record<string, unknown>) {
  const status = item.status as string;
  const groupKey = Object.keys(STAT_GROUPS).find((key) => STAT_GROUPS[key].includes(status));
  return STAT_META.find((meta) => meta.key === groupKey)?.color || '#94a3b8';
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
function onDebouncedFilterChange() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(onFilterChange, 350);
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
  activeStatKey.value = 'total';
  page.value = 1;
  fetchData();
}
function onStatClick(key: string) {
  activeStatKey.value = key;
  statusFilter.value = null;
  page.value = 1;
  fetchData();
}

function buildFilterParams(): Record<string, unknown> {
  const params: Record<string, unknown> = { search: search.value || undefined };
  if (statusFilter.value) {
    params.status = statusFilter.value;
  } else if (activeStatKey.value !== 'total') {
    const statuses = STAT_GROUPS[activeStatKey.value] || [];
    // The list endpoint filters on a single status; a one-status tile maps
    // cleanly, and the multi-status tiles fall back to showing everything
    // rather than silently returning a partial set.
    if (statuses.length === 1) params.status = statuses[0];
  }
  if (fromPlaceFilter.value) params.fromPlace = fromPlaceFilter.value;
  if (toPlaceFilter.value) params.toPlace = toPlaceFilter.value;
  if (pickupDateFilter.value) params.pickupDate = pickupDateFilter.value;
  return params;
}

async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, ...buildFilterParams() });
}

const exportColumns = [
  { header: 'Booking No.', key: 'bookingNo' },
  { header: 'Source', key: 'source' },
  { header: 'LR No.', key: 'lrNumber' },
  { header: 'Tracking No.', key: 'trackingNumber' },
  { header: 'Customer', key: 'customerName' },
  { header: 'Mobile', key: 'mobile' },
  { header: 'From', key: 'fromPlace' },
  { header: 'To', key: 'toPlace' },
  { header: 'Pickup Date', key: 'pickupDate' },
  { header: 'Vehicle', key: 'vehicleNumber' },
  { header: 'Driver', key: 'driverName' },
  { header: 'Status', key: 'status' },
];

function exportRowMapper(item: Record<string, unknown>) {
  const booking = item as unknown as Booking;
  return {
    bookingNo: booking.bookingNo,
    source: booking.source === 'COUNTER' ? 'Counter' : 'Website',
    lrNumber: booking.lrNumber || '-',
    trackingNumber: booking.trackingNumber || '-',
    customerName: booking.customerName || '-',
    mobile: booking.mobile || '-',
    fromPlace: booking.fromPlace || '-',
    toPlace: booking.toPlace || '-',
    pickupDate: formatDate(booking.pickupDate),
    vehicleNumber: booking.vehicleNumber || '-',
    driverName: booking.driverName || '-',
    status: booking.statusLabel,
  };
}

async function exportAllBookings() {
  const response = await bookingApi.list({ pageSize: 5000, ...buildFilterParams() });
  return response.data.data as unknown as Record<string, unknown>[];
}

function openBooking(booking: Booking) {
  router.push(`/bookings/${booking.id}`);
}

onMounted(async () => {
  await Promise.allSettled([fetchData(), store.fetchStats()]);
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
.booking-badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
