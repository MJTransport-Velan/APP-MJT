<template>
  <div v-if="booking">
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div class="d-flex align-center ga-3">
        <AppBtn icon="mdi-arrow-left" variant="text" title="Back to bookings" @click="router.push('/bookings/list')" />
        <div>
          <div class="d-flex align-center ga-2">
            <h2 class="text-h6 mb-0">{{ booking.bookingNo }}</h2>
            <BookingStatusChip :status="booking.status" />
            <AppChip size="x-small" :color="booking.source === 'COUNTER' ? 'secondary' : 'info'" variant="flat">
              {{ booking.source === 'COUNTER' ? 'Counter' : 'Website' }}
            </AppChip>
          </div>
          <p class="text-caption text-medium-emphasis mb-0">
            {{ booking.source === 'COUNTER' ? 'Entered at the counter' : 'Received from the MJ Express website' }}
            {{ formatDateTime(booking.createdAt) }}
          </p>
        </div>
      </div>

      <div v-if="booking.status === 'PENDING'" class="d-flex flex-wrap ga-2">
        <AppBtn color="error" variant="outlined" prepend-icon="mdi-close-circle-outline" @click="rejectDialog = true">
          Reject Booking
        </AppBtn>
        <AppBtn color="primary" variant="flat" prepend-icon="mdi-check-circle-outline" :loading="confirming" @click="onConfirm">
          Confirm Booking
        </AppBtn>
      </div>
    </div>

    <!-- LR / tracking numbers, issued at confirmation -->
    <AppCard v-if="booking.lrNumber || booking.trackingNumber" variant="outlined" class="mb-4">
      <AppCardText>
        <div class="number-grid">
          <div>
            <div class="text-caption text-medium-emphasis">LR Number</div>
            <div class="text-body-1 font-weight-medium">{{ booking.lrNumber || '-' }}</div>
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">Tracking Number</div>
            <div class="text-body-1 font-weight-medium">{{ booking.trackingNumber || '-' }}</div>
          </div>
        </div>
      </AppCardText>
    </AppCard>

    <AppAlert v-if="booking.status === 'REJECTED'" type="error" variant="tonal" class="mb-4">
      Booking rejected{{ booking.rejectionReason ? `: ${booking.rejectionReason}` : '' }}
    </AppAlert>

    <!-- Route mapping — the customer typed these places freehand, so they have
         to be matched to the Location master before the booking can become a
         trip. Done at confirmation so nothing downstream is left guessing. -->
    <AppCard v-if="needsRoute" variant="outlined" class="mb-4">
      <AppCardTitle class="text-subtitle-1">
        {{ booking.status === 'PENDING' ? 'Confirm Route' : 'Map Route' }}
      </AppCardTitle>
      <AppCardText>
        <p class="text-caption text-medium-emphasis mb-3">
          The customer entered these places as free text. Map them to your locations so this booking can be
          raised as a trip for MJ Express.
        </p>
        <div class="route-grid">
          <div>
            <div class="text-caption text-medium-emphasis">Customer entered (From)</div>
            <div class="text-body-2 font-weight-medium mb-2">{{ booking.fromPlace }}</div>
            <AppSelect
              v-model="routeForm.fromLocationId"
              :items="locationOptions"
              item-title="name"
              item-value="id"
              label="Pickup Location"
              placeholder="Select a location"
              :error-messages="routeErrors.fromLocationId"
            />
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">Customer entered (To)</div>
            <div class="text-body-2 font-weight-medium mb-2">{{ booking.toPlace }}</div>
            <AppSelect
              v-model="routeForm.toLocationId"
              :items="locationOptions"
              item-title="name"
              item-value="id"
              label="Delivery Location"
              placeholder="Select a location"
              :error-messages="routeErrors.toLocationId"
            />
          </div>
        </div>
        <div class="d-flex flex-wrap align-center justify-space-between ga-2 mt-2">
          <AppBtn variant="text" size="small" prepend-icon="mdi-plus" @click="openNewLocation">
            Location not listed? Add it
          </AppBtn>
          <!-- Already-confirmed bookings save the route on its own, since there
               is no Confirm button left to carry it. -->
          <AppBtn
            v-if="booking.status !== 'PENDING'"
            color="primary"
            variant="flat"
            prepend-icon="mdi-content-save-outline"
            :loading="savingRoute"
            @click="onSaveRoute"
          >
            Save Route
          </AppBtn>
        </div>
      </AppCardText>
    </AppCard>

    <!-- Operations linkage, once the trip exists -->
    <AppAlert v-if="booking.trip" type="info" variant="tonal" class="mb-4">
      Raised in Operations as trip
      <RouterLink :to="`/trips/${booking.trip.id}`" class="trip-link">{{ booking.trip.tripNumber }}</RouterLink>
      for customer MJ Express — currently {{ booking.trip.status.replace(/_/g, ' ').toLowerCase() }}.
    </AppAlert>

    <div class="detail-grid">
      <AppCard variant="outlined">
        <AppCardTitle class="text-subtitle-1">Customer Details</AppCardTitle>
        <AppCardText>
          <FieldRow label="Customer Name" :value="booking.customerName" />
          <FieldRow label="Mobile Number" :value="booking.mobile" />
          <FieldRow label="Email" :value="booking.email" />
        </AppCardText>
      </AppCard>

      <AppCard variant="outlined">
        <AppCardTitle class="text-subtitle-1">Shipment Details</AppCardTitle>
        <AppCardText>
          <FieldRow label="Parcel Type" :value="booking.parcelType" />
          <FieldRow label="Number of Packages" :value="String(booking.packages)" />
          <FieldRow label="Approximate Weight" :value="`${booking.weight} kg`" />
          <FieldRow label="Vehicle Type Requested" :value="booking.vehicleTypeRequested" />
        </AppCardText>
      </AppCard>

      <AppCard variant="outlined">
        <AppCardTitle class="text-subtitle-1">Pickup Details</AppCardTitle>
        <AppCardText>
          <FieldRow label="From Place" :value="booking.fromPlace" />
          <FieldRow label="Pickup Address" :value="booking.pickupAddress" />
          <FieldRow label="Pickup Date" :value="formatDate(booking.pickupDate)" />
        </AppCardText>
      </AppCard>

      <AppCard variant="outlined">
        <AppCardTitle class="text-subtitle-1">Delivery Details</AppCardTitle>
        <AppCardText>
          <FieldRow label="To Place" :value="booking.toPlace" />
          <FieldRow label="Delivery Address" :value="booking.deliveryAddress" />
          <FieldRow label="Expected Delivery" :value="formatDate(booking.expectedDeliveryDate)" />
        </AppCardText>
      </AppCard>

      <AppCard variant="outlined">
        <AppCardTitle class="text-subtitle-1">Booking Details</AppCardTitle>
        <AppCardText>
          <FieldRow label="Booking Number" :value="booking.bookingNo" />
          <FieldRow label="Booked On" :value="formatDateTime(booking.createdAt)" />
          <!-- Decimal arrives as a string over JSON. -->
          <FieldRow
            label="Freight Amount"
            :value="booking.freightAmount ? formatCurrency(Number(booking.freightAmount)) : null"
          />
          <FieldRow label="Special Instructions" :value="booking.instructions" />
        </AppCardText>
      </AppCard>

      <AppCard variant="outlined">
        <AppCardTitle class="text-subtitle-1">Current Status</AppCardTitle>
        <AppCardText>
          <AppTimeline v-if="booking.statusHistory.length">
            <AppTimelineItem v-for="entry in booking.statusHistory" :key="entry.id">
              <div class="text-body-2 font-weight-medium">{{ entry.statusLabel }}</div>
              <div v-if="entry.note" class="text-caption">{{ entry.note }}</div>
              <div class="text-caption text-medium-emphasis">{{ formatDateTime(entry.createdAt) }}</div>
            </AppTimelineItem>
          </AppTimeline>
          <div v-else class="text-body-2">{{ booking.statusLabel }}</div>
        </AppCardText>
      </AppCard>
    </div>

    <!-- Vehicle allocation — editable from confirmation until the LR is issued,
         so details can still be corrected before the document is generated. -->
    <AppCard v-if="canAssignVehicle" variant="outlined" class="mt-4">
      <AppCardTitle class="text-subtitle-1">
        Vehicle Details
        <AppChip
          v-if="booking.status === 'VEHICLE_ASSIGNED'"
          size="x-small"
          :color="booking.fleetType === 'MARKET' ? 'secondary' : 'primary'"
          class="ml-2"
        >
          {{ booking.fleetType === 'MARKET' ? 'Market Vehicle' : 'Own Vehicle' }}
        </AppChip>
      </AppCardTitle>
      <AppCardText>
        <VehicleAssignForm ref="vehicleForm" :booking="booking" :loading="assigning" @submit="onAssignVehicle" />

        <!-- Generate LR lives here rather than in the read-only card below:
             VEHICLE_ASSIGNED renders this branch, so a button in the other one
             would never be reachable. -->
        <div v-if="booking.status === 'VEHICLE_ASSIGNED'" class="generate-lr-row">
          <div>
            <div class="text-body-2 font-weight-medium">Ready to issue the Lorry Receipt</div>
            <div class="text-caption text-medium-emphasis">
              Vehicle details are saved. Generating the LR locks them onto the document.
            </div>
          </div>
          <AppBtn
            color="primary"
            variant="flat"
            prepend-icon="mdi-file-document-outline"
            :loading="generatingLr"
            @click="onGenerateLr"
          >
            Generate LR
          </AppBtn>
        </div>
      </AppCardText>
    </AppCard>

    <AppCard v-else-if="booking.vehicleNumber" variant="outlined" class="mt-4">
      <AppCardTitle class="text-subtitle-1">
        Vehicle Details
        <AppChip size="x-small" :color="booking.fleetType === 'MARKET' ? 'secondary' : 'primary'" class="ml-2">
          {{ booking.fleetType === 'MARKET' ? 'Market Vehicle' : 'Own Vehicle' }}
        </AppChip>
      </AppCardTitle>
      <AppCardText>
        <div class="number-grid">
          <FieldRow label="Vehicle Type" :value="booking.vehicleTypeName" />
          <FieldRow label="Vehicle Number" :value="booking.vehicleNumber" />
          <FieldRow label="Driver Name" :value="booking.driverName" />
          <FieldRow label="Driver Mobile" :value="booking.driverMobile" />
        </div>
      </AppCardText>
    </AppCard>

    <!-- LR document -->
    <AppCard v-if="hasLr" variant="outlined" class="mt-4">
      <AppCardTitle class="text-subtitle-1">Lorry Receipt</AppCardTitle>
      <AppCardText>
        <div class="d-flex flex-wrap ga-2">
          <AppBtn variant="outlined" prepend-icon="mdi-eye-outline" @click="showPreview = !showPreview">
            {{ showPreview ? 'Hide Preview' : 'Preview LR' }}
          </AppBtn>
          <AppBtn variant="outlined" prepend-icon="mdi-download-outline" :loading="downloading" @click="onDownloadPdf">
            Download LR PDF
          </AppBtn>
          <AppBtn variant="outlined" prepend-icon="mdi-printer-outline" @click="onPrint">Print LR</AppBtn>
        </div>

        <div v-if="showPreview" class="lr-preview mt-4">
          <LrDocument ref="lrDoc" :booking="booking" />
        </div>
      </AppCardText>
    </AppCard>

    <!-- Delivery progress -->
    <AppCard v-if="canAdvanceDelivery" variant="outlined" class="mt-4">
      <AppCardTitle class="text-subtitle-1">Delivery Progress</AppCardTitle>
      <AppCardText>
        <p class="text-caption text-medium-emphasis">
          Advancing the stage here is what the customer sees on the public tracking page.
        </p>
        <div class="d-flex flex-wrap ga-2 mt-2">
          <AppBtn
            v-for="stage in nextDeliveryStages"
            :key="stage.value"
            variant="outlined"
            :prepend-icon="stage.icon"
            :loading="advancingTo === stage.value"
            @click="onAdvanceStatus(stage.value)"
          >
            Mark {{ stage.title }}
          </AppBtn>
        </div>
      </AppCardText>
    </AppCard>

    <!-- Add a location the master doesn't have yet -->
    <AppDialog v-model="locationDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Add Location</AppCardTitle>
        <AppCardText>
          <AppTextField v-model="locationForm.name" label="Location Name" placeholder="e.g. Salem" class="mb-2" />
          <AppTextField
            v-model="locationForm.code"
            label="Code"
            placeholder="e.g. LOC-SLM"
            :hint="'Must be unique across locations'"
            persistent-hint
          />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="locationDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="creatingLocation" @click="onCreateLocation">
            Add Location
          </AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Reject -->
    <AppDialog v-model="rejectDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Reject Booking</AppCardTitle>
        <AppCardText>
          <AppTextarea v-model="rejectionReason" label="Reason (optional)" rows="3" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="rejectDialog = false">Close</AppBtn>
          <AppBtn color="error" variant="flat" :loading="rejecting" @click="onReject">Reject Booking</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>
  </div>

  <AppSkeletonLoader v-else-if="loading" type="card" />
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useBookingStore } from '@/stores/bookings';
import { bookingApi } from '@/services/bookings';
import { locationApi } from '@/services/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import BookingStatusChip from '@/components/bookings/BookingStatusChip.vue';
import VehicleAssignForm from '@/components/bookings/VehicleAssignForm.vue';
import LrDocument from '@/components/bookings/LrDocument.vue';
import { LR_STYLES } from '@/components/bookings/lrStyles';
import {
  AppBtn,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppChip,
  AppDialog,
  AppTextarea,
  AppAlert,
  AppTimeline,
  AppTimelineItem,
  AppSkeletonLoader,
} from '@/components/ui';
import type { Booking, AssignVehiclePayload, DeliveryStatus } from '@/types/bookings.types';

const route = useRoute();
const router = useRouter();
const store = useBookingStore();
const { success, error } = useSnackbar();

const booking = ref<Booking | null>(null);
const loading = ref(true);
const confirming = ref(false);
const rejecting = ref(false);
const assigning = ref(false);
const generatingLr = ref(false);
const downloading = ref(false);
const advancingTo = ref<string | null>(null);
const rejectDialog = ref(false);
const rejectionReason = ref('');
const locationDialog = ref(false);
const creatingLocation = ref(false);
const savingRoute = ref(false);
const locationOptions = ref<{ id: string; name: string }[]>([]);
const routeForm = reactive({ fromLocationId: '', toLocationId: '' });
const routeErrors = reactive<Record<string, string>>({ fromLocationId: '', toLocationId: '' });
const locationForm = reactive({ name: '', code: '' });
/** Which dropdown to drop a newly created location into. */
const locationTarget = ref<'from' | 'to' | null>(null);
const showPreview = ref(false);
const vehicleForm = ref<InstanceType<typeof VehicleAssignForm> | null>(null);
const lrDoc = ref<InstanceType<typeof LrDocument> | null>(null);

/**
 * A small presentational helper for the read-only label/value rows that make up
 * most of this screen — kept inline rather than as its own file since it exists
 * only to stop six cards repeating the same two divs.
 */
const FieldRow = (props: { label: string; value?: string | null }) =>
  h('div', { class: 'field-row' }, [
    h('div', { class: 'text-caption text-medium-emphasis' }, props.label),
    h('div', { class: 'text-body-2' }, props.value || '-'),
  ]);

const canAssignVehicle = computed(
  () => booking.value?.status === 'CONFIRMED' || booking.value?.status === 'VEHICLE_ASSIGNED'
);

/**
 * Any live booking without a mapped route needs one — at confirmation for new
 * bookings, and retrospectively for those confirmed before route mapping
 * existed (whose trip cannot be raised until it is set).
 */
const needsRoute = computed(
  () => booking.value !== null && !booking.value.fromLocation && booking.value.status !== 'REJECTED'
);

const hasLr = computed(() => Boolean(booking.value?.lrGeneratedAt));

const DELIVERY_STAGES: { value: DeliveryStatus; title: string; icon: string }[] = [
  { value: 'PICKED_UP', title: 'Picked Up', icon: 'mdi-package-up' },
  { value: 'IN_TRANSIT', title: 'In Transit', icon: 'mdi-truck-fast-outline' },
  { value: 'OUT_FOR_DELIVERY', title: 'Out for Delivery', icon: 'mdi-truck-delivery-outline' },
  { value: 'DELIVERED', title: 'Delivered', icon: 'mdi-flag-checkered' },
];

const DELIVERY_ORDER = ['LR_GENERATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const canAdvanceDelivery = computed(
  () => booking.value !== null && DELIVERY_ORDER.includes(booking.value.status) && booking.value.status !== 'DELIVERED'
);

// Only stages ahead of the current one — the backend rejects going backwards.
const nextDeliveryStages = computed(() => {
  if (!booking.value) return [];
  const currentIndex = DELIVERY_ORDER.indexOf(booking.value.status);
  return DELIVERY_STAGES.filter((stage) => DELIVERY_ORDER.indexOf(stage.value) > currentIndex);
});

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function load() {
  loading.value = true;
  try {
    booking.value = await store.getById(route.params.id as string);
    if (needsRoute.value) {
      await loadLocations();
      // Pre-select wherever the customer's wording matched a location outright.
      routeForm.fromLocationId = booking.value.suggestedFromLocationId ?? '';
      routeForm.toLocationId = booking.value.suggestedToLocationId ?? '';
    }
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load booking'));
  } finally {
    loading.value = false;
  }
}

async function loadLocations() {
  try {
    const response = await locationApi.list({ pageSize: 500 });
    locationOptions.value = (response.data.data as any[]).map((l) => ({ id: l.id, name: l.name }));
  } catch {
    // A missing lookup shouldn't blank the whole page; the dropdowns simply
    // stay empty and the admin can add a location instead.
    locationOptions.value = [];
  }
}

function openNewLocation() {
  // Prefill from whichever side is still unmapped, so the common case is one
  // click and a code.
  const unmapped = !routeForm.fromLocationId ? 'from' : 'to';
  locationTarget.value = unmapped;
  locationForm.name = unmapped === 'from' ? booking.value?.fromPlace ?? '' : booking.value?.toPlace ?? '';
  locationForm.code = '';
  locationDialog.value = true;
}

async function onCreateLocation() {
  if (!locationForm.name.trim() || !locationForm.code.trim()) {
    error('Location name and code are both required');
    return;
  }
  creatingLocation.value = true;
  try {
    const response = await locationApi.create({
      name: locationForm.name.trim(),
      code: locationForm.code.trim(),
    });
    const created = response.data.data as any;
    await loadLocations();
    if (locationTarget.value === 'from') routeForm.fromLocationId = created.id;
    else routeForm.toLocationId = created.id;
    locationDialog.value = false;
    success(`Location ${created.name} added`);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to add location'));
  } finally {
    creatingLocation.value = false;
  }
}

function validateRoute(): boolean {
  routeErrors.fromLocationId = routeForm.fromLocationId ? '' : 'Select the pickup location';
  routeErrors.toLocationId = routeForm.toLocationId ? '' : 'Select the delivery location';
  return !routeErrors.fromLocationId && !routeErrors.toLocationId;
}

async function onSaveRoute() {
  if (!booking.value || !validateRoute()) {
    error('Map both places to a location');
    return;
  }
  savingRoute.value = true;
  try {
    const response = await bookingApi.updateRoute(
      booking.value.id,
      routeForm.fromLocationId,
      routeForm.toLocationId
    );
    booking.value = response.data.data;
    success(
      booking.value.trip
        ? `Route saved — trip ${booking.value.trip.tripNumber} created for MJ Express`
        : 'Route saved'
    );
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save route'));
  } finally {
    savingRoute.value = false;
  }
}

async function onConfirm() {
  if (!booking.value) return;
  if (!validateRoute()) {
    error('Map both places to a location before confirming');
    return;
  }

  confirming.value = true;
  try {
    booking.value = await store.confirm(booking.value.id, routeForm.fromLocationId, routeForm.toLocationId);
    success(`Booking confirmed — LR ${booking.value.lrNumber} issued`);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to confirm booking'));
  } finally {
    confirming.value = false;
  }
}

async function onReject() {
  if (!booking.value) return;
  rejecting.value = true;
  try {
    booking.value = await store.reject(booking.value.id, rejectionReason.value || undefined);
    rejectDialog.value = false;
    success('Booking rejected');
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reject booking'));
  } finally {
    rejecting.value = false;
  }
}

async function onAssignVehicle(payload: AssignVehiclePayload) {
  if (!booking.value) return;
  assigning.value = true;
  try {
    booking.value = await store.assignVehicle(booking.value.id, payload);
    success(
      booking.value.trip
        ? `Vehicle saved — trip ${booking.value.trip.tripNumber} created for MJ Express`
        : 'Vehicle details saved'
    );
  } catch (err) {
    const fieldErrors = (err as any)?.response?.data?.errors;
    if (fieldErrors && typeof fieldErrors === 'object') {
      vehicleForm.value?.setErrors(fieldErrors);
    }
    error(extractErrorMessage(err, 'Failed to save vehicle details'));
  } finally {
    assigning.value = false;
  }
}

async function onGenerateLr() {
  if (!booking.value) return;
  generatingLr.value = true;
  try {
    booking.value = await store.generateLr(booking.value.id);
    showPreview.value = true;
    success(`LR ${booking.value.lrNumber} generated`);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to generate LR'));
  } finally {
    generatingLr.value = false;
  }
}

async function onAdvanceStatus(status: DeliveryStatus) {
  if (!booking.value) return;
  advancingTo.value = status;
  try {
    booking.value = await store.updateStatus(booking.value.id, status);
    success(`Booking marked ${booking.value.statusLabel}`);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update delivery status'));
  } finally {
    advancingTo.value = null;
  }
}

async function onDownloadPdf() {
  if (!booking.value) return;
  downloading.value = true;
  try {
    await bookingApi.downloadLrPdf(booking.value.id, `${booking.value.lrNumber}.pdf`);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to download the LR PDF'));
  } finally {
    downloading.value = false;
  }
}

/**
 * Prints the LR on its own rather than the whole admin page: the document is
 * cloned into a detached window carrying only the LR stylesheet, which avoids
 * fighting the app shell with print-only overrides.
 */
async function onPrint() {
  showPreview.value = true;
  await new Promise((resolve) => setTimeout(resolve, 50));
  const node = lrDoc.value?.root;
  if (!node) {
    error('Open the preview before printing');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    error('Allow pop-ups for this site to print the LR');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(
    `<!doctype html><html><head><title>${booking.value?.lrNumber ?? 'Lorry Receipt'}</title>` +
      `<style>${LR_STYLES}</style></head><body>${node.outerHTML}</body></html>`
  );
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

onMounted(load);
</script>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.number-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
.route-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.trip-link {
  font-weight: 600;
  color: inherit;
}
.generate-lr-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border, #d8dee6);
}
.lr-preview {
  border: 1px solid var(--color-border, #d8dee6);
  border-radius: 8px;
  overflow-x: auto;
  background: #fff;
}
:deep(.field-row) {
  margin-bottom: 10px;
}
:deep(.field-row:last-child) {
  margin-bottom: 0;
}
</style>
