<template>
  <div v-if="trip" class="d-flex flex-column ga-4">
    <div class="d-flex flex-wrap align-center justify-space-between ga-2">
      <div>
        <div class="d-flex align-center ga-2">
          <AppBtn icon="mdi-arrow-left" variant="text" size="small" @click="router.push('/trips/list')" />
          <h2 class="text-h6">Trip {{ trip.tripNumber }}</h2>
          <TripStatusChip :status="trip.status" />
        </div>
        <div class="text-caption text-medium-emphasis ml-8">
          {{ trip.fromLocation.name }} &rarr; {{ trip.toLocation.name }}
        </div>
      </div>
      <div class="d-flex ga-2">
        <AppBtn variant="outlined" prepend-icon="mdi-share-variant-outline" @click="onShare">Share Trip</AppBtn>
        <AppMenu>
          <template #activator>
            <AppBtn variant="outlined">More Actions <AppIcon icon="mdi-chevron-down" size="small" /></AppBtn>
          </template>
          <AppList>
            <AppListItem
              v-if="!['COMPLETED', 'CANCELLED'].includes(trip.status)"
              prepend-icon="mdi-close-circle-outline"
              title="Cancel Trip"
              @click="cancelDialog = true"
            />
          </AppList>
        </AppMenu>
        <AppBtn
          v-if="nextStatus"
          color="primary"
          :loading="updatingStatus"
          @click="onMarkAsClick"
        >
          Mark as {{ statusLabel(nextStatus) }}
        </AppBtn>
      </div>
    </div>

    <!-- Journey progress -->
    <AppCard v-if="!['DRAFT', 'PLANNED', 'CANCELLED'].includes(trip.status)" variant="outlined" class="pa-4">
      <div class="text-subtitle-2 font-weight-medium mb-3">Journey Progress</div>
      <TripProgress :status="trip.status" />
    </AppCard>

    <div class="detail-grid">
      <div class="d-flex flex-column ga-4">
        <AppCard variant="outlined" class="pa-4 d-flex flex-column ga-3">
          <div class="info-stack">
            <div class="info-stack__item">
              <div class="text-caption text-medium-emphasis">CLIENT</div>
              <div class="text-body-2 font-weight-medium">{{ trip.intent.company.name }}</div>
            </div>
            <div class="info-stack__item">
              <div class="text-caption text-medium-emphasis">TRUCK</div>
              <div class="text-body-2 font-weight-medium">{{ trip.vehicle?.registrationNumber || '-' }}</div>
            </div>
            <div class="info-stack__item">
              <div class="text-caption text-medium-emphasis">SCHEDULED START</div>
              <div class="text-body-2 font-weight-medium">{{ formatDate(trip.scheduledStartDate) }}</div>
            </div>
            <div class="info-stack__item">
              <div class="text-caption text-medium-emphasis">EXPECTED DELIVERY</div>
              <div class="text-body-2 font-weight-medium">{{ formatDate(trip.expectedDeliveryDate) }}</div>
            </div>
          </div>
        </AppCard>

        <AppCard variant="outlined" class="pa-4 d-flex flex-column ga-3">
          <div class="text-subtitle-2 font-weight-medium">Vehicle &amp; Driver</div>
          <div class="d-flex align-center ga-2">
            <div class="icon-badge"><AppIcon icon="mdi-truck-outline" size="small" /></div>
            <div>
              <div class="text-body-2 font-weight-medium">
                {{ trip.vehicle?.registrationNumber || trip.marketVehicleNumber || 'Not assigned' }}
              </div>
              <AppChip v-if="trip.vehicle" size="x-small" :color="trip.vehicle.ownership === 'MARKET' ? 'secondary' : 'primary'">
                {{ trip.vehicle.ownership === 'MARKET' ? 'Market Vehicle' : 'Own Fleet' }}
              </AppChip>
              <AppChip v-else-if="trip.supplier" size="x-small" color="secondary">
                Market Truck &bull; {{ trip.supplier.name }}
              </AppChip>
            </div>
          </div>
          <AppDivider />
          <div class="d-flex align-center ga-2">
            <div class="icon-badge"><AppIcon icon="mdi-account-outline" size="small" /></div>
            <div>
              <div class="text-body-2 font-weight-medium">
                {{ trip.driver?.name || trip.marketDriverName || 'Awaiting assignment' }}
              </div>
              <div v-if="trip.driver?.phone || trip.marketDriverContact" class="text-caption text-medium-emphasis">
                {{ trip.driver?.phone || trip.marketDriverContact }}
              </div>
            </div>
          </div>
        </AppCard>
      </div>

      <AppCard variant="outlined" class="pa-4 d-flex flex-column ga-3">
        <div class="d-flex justify-space-between align-center">
          <div class="text-subtitle-2 font-weight-medium">Live Tracking</div>
          <span class="text-caption text-medium-emphasis">GPS not integrated</span>
        </div>
        <div class="live-tracking-placeholder">
          <AppIcon icon="mdi-map-marker-radius-outline" />
          <span class="text-caption text-medium-emphasis">Live location will appear here once vehicle GPS is integrated.</span>
        </div>
      </AppCard>

      <AppCard variant="outlined" class="pa-4">
        <div class="text-subtitle-2 font-weight-medium mb-3">Trip Timeline</div>
        <TripTimeline :entries="tripStore.timeline" />
      </AppCard>
    </div>

    <div class="bottom-grid">
      <AppCard variant="outlined" class="pa-4">
        <div class="text-subtitle-2 font-weight-medium mb-2">Trip Information</div>
        <div class="d-flex flex-column ga-2 text-caption">
          <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Load Type</span><span class="font-weight-medium">{{ trip.intent.loadMode === 'PART' ? 'Part Load' : 'Full Load' }}</span></div>
          <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Material</span><span class="font-weight-medium">{{ trip.intent.material?.name || '-' }}</span></div>
          <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Weight</span><span class="font-weight-medium">{{ trip.loadWeight ?? trip.intent.quantityTon ?? '-' }} MT</span></div>
          <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Truck Type</span><span class="font-weight-medium">{{ trip.intent.vehicleType?.name || '-' }}</span></div>
        </div>
      </AppCard>

      <AppCard variant="outlined" class="pa-4">
        <div class="text-subtitle-2 font-weight-medium mb-2">Financial Summary</div>
        <div class="d-flex flex-column ga-2 text-caption">
          <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Client Amount</span><span class="font-weight-medium">{{ trip.freightAmount ? formatCurrency(trip.freightAmount) : '-' }}</span></div>
          <template v-if="trip.supplierRate">
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Supplier Payout</span><span class="font-weight-medium">{{ formatCurrency(trip.supplierRate) }}</span></div>
            <AppDivider />
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Profit</span><span class="font-weight-bold text-primary">{{ formatCurrency(profit) }}</span></div>
          </template>
        </div>
      </AppCard>

      <AppCard variant="outlined" class="pa-4">
        <div class="d-flex justify-space-between align-center mb-2">
          <div class="text-subtitle-2 font-weight-medium">Notes &amp; Updates</div>
        </div>
        <AppTextarea v-model="noteDraft" placeholder="Add a note..." rows="2" class="mb-2" />
        <AppBtn size="small" color="primary" :loading="addingNote" @click="onAddNote">+ Add</AppBtn>
        <AppDivider class="my-3" />
        <div class="notes-list">
          <div v-for="note in noteStore.items" :key="note.id" class="d-flex ga-2 mb-3">
            <div class="note-avatar">{{ initials(note.author?.fullName) }}</div>
            <div class="flex-grow-1">
              <div class="d-flex justify-space-between">
                <span class="text-caption font-weight-medium">{{ note.author?.fullName || 'Unknown' }}</span>
                <span class="text-caption text-medium-emphasis">{{ new Date(note.createdAt).toLocaleString() }}</span>
              </div>
              <div class="text-body-2">{{ note.note }}</div>
            </div>
          </div>
          <p v-if="!noteStore.items.length" class="text-caption text-medium-emphasis">No notes yet.</p>
        </div>
      </AppCard>
    </div>

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

    <AppDialog v-model="updateStatusDialog" max-width="480" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Mark as {{ nextStatus ? statusLabel(nextStatus) : '' }}</AppCardTitle>
        <AppCardText>
          <template v-if="showPodStep">
            <AppAlert type="warning" variant="tonal" class="mb-3">
              This trip requires a POD (Proof of Delivery) before it can be marked as completed.
              Please upload it below.
            </AppAlert>
            <PODUploader :documents="podStore.documents" :can-verify="false" @upload="onPodUpload" />
            <AppDivider class="my-3" />
          </template>
          <template v-if="showChargeStep">
            <AppTextField
              v-model.number="chargeAmount"
              type="number"
              :label="`${statusLabel(nextStatus || '')} Charges (optional — added to freight, billed to customer)`"
              class="mb-2"
            />
          </template>
          <AppTextarea v-model="statusNotes" label="Notes (optional)" rows="3" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="updateStatusDialog = false">Close</AppBtn>
          <AppBtn
            color="primary"
            variant="flat"
            :loading="updatingStatus"
            :disabled="showPodStep && !hasPodDocument"
            @click="submitUpdateStatus"
          >
            Confirm
          </AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <AllocateAssetDialog
      v-model="assignDialog"
      :trip="trip"
      :vehicle-options="availableVehicleOptions"
      :driver-options="availableDriverOptions"
      :supplier-options="supplierOptions"
      :vehicle-driver-map="vehicleDriverMap"
      :loading="updatingStatus"
      @submit="onAssignSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTripStore, useTripNoteStore, usePodStore } from '@/stores/operations';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import TripStatusChip from '@/components/operations/TripStatusChip.vue';
import TripTimeline from '@/components/operations/TripTimeline.vue';
import TripProgress from '@/components/operations/TripProgress.vue';
import AllocateAssetDialog, { VehicleDriverInfo } from '@/components/operations/AllocateAssetDialog.vue';
import PODUploader from '@/components/operations/PODUploader.vue';
import { vehicleAssignmentApi } from '@/services/fleet';
import { supplierApi } from '@/services/masters';
import {
  AppBtn,
  AppIcon,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppDialog,
  AppTextField,
  AppTextarea,
  AppChip,
  AppDivider,
  AppMenu,
  AppList,
  AppListItem,
  AppAlert,
} from '@/components/ui';
import type { Trip } from '@/types/operations.types';

const route = useRoute();
const router = useRouter();
const tripStore = useTripStore();
const noteStore = useTripNoteStore();
const podStore = usePodStore();
const { success, error } = useSnackbar();

const tripId = route.params.id as string;
const trip = ref<Trip | null>(null);

// Mirrors the backend's forward-only ALLOWED_TRANSITIONS (trip.service.ts) —
// only the non-cancel next step is offered here; cancellation lives under More Actions.
const ALLOWED_TRANSITIONS: Record<string, string> = {
  DRAFT: 'PLANNED',
  PLANNED: 'APPROVED',
  APPROVED: 'ASSIGNED',
  ASSIGNED: 'STARTED',
  STARTED: 'LOADING',
  LOADING: 'IN_TRANSIT',
  IN_TRANSIT: 'REACHED_DESTINATION',
  REACHED_DESTINATION: 'UNLOADING',
  UNLOADING: 'COMPLETED',
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  APPROVED: 'Approved',
  ASSIGNED: 'Assigned',
  STARTED: 'Started',
  LOADING: 'Loading',
  IN_TRANSIT: 'In Transit',
  REACHED_DESTINATION: 'Reached Destination',
  UNLOADING: 'Unloading',
  COMPLETED: 'Completed',
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] || status;
}

const nextStatus = computed(() => (trip.value ? ALLOWED_TRANSITIONS[trip.value.status] : undefined));

// Backend rejects COMPLETED with a 400 when podRequired and no POD doc exists
// (trip.service.ts updateStatus) — surface the upload step inline instead of
// letting the user hit that generic error.
const hasPodDocument = computed(() => podStore.documents.some((d) => d.type === 'POD'));
const showPodStep = computed(() => nextStatus.value === 'COMPLETED' && !!trip.value?.podRequired);

// Loading/unloading charges are billed straight to the customer (added onto
// freightAmount server-side), so ask for them right at the moment the trip
// is marked LOADING/UNLOADING rather than as a separate follow-up step.
const showChargeStep = computed(() => nextStatus.value === 'LOADING' || nextStatus.value === 'UNLOADING');

// Matches trip-financial.service.ts: client amount minus what we pay the supplier.
const profit = computed(() => Number(trip.value?.freightAmount || 0) - Number(trip.value?.supplierRate || 0));

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function initials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

async function loadTrip() {
  trip.value = await tripStore.getById(tripId);
  await tripStore.fetchTimeline(tripId);
  await noteStore.fetchList(tripId);
}

async function loadAssignmentOptions() {
  const [activeAssignmentsRes, suppliersRes] = await Promise.allSettled([
    vehicleAssignmentApi.list({ status: 'ACTIVE', pageSize: 500 }),
    supplierApi.list({ pageSize: 200 }),
  ]);
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
}

function onShare() {
  navigator.clipboard.writeText(window.location.href);
  success('Trip link copied to clipboard');
}

// --- Notes ---
const noteDraft = ref('');
const addingNote = ref(false);
async function onAddNote() {
  if (!noteDraft.value.trim()) return;
  addingNote.value = true;
  try {
    await noteStore.create(tripId, noteDraft.value);
    noteDraft.value = '';
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to add note'));
  } finally {
    addingNote.value = false;
  }
}

// --- Update status ---
const updateStatusDialog = ref(false);
const statusNotes = ref('');
const chargeAmount = ref<number | undefined>(undefined);
const updatingStatus = ref(false);

// Moving to ASSIGNED requires an actual vehicle/driver (enforced server-side
// too) — route that specific transition through the real assignment dialog
// instead of the generic notes-only "mark as" dialog, which would otherwise
// just fail with "vehicle and driver required" and dead-end the user.
async function onMarkAsClick() {
  if (nextStatus.value === 'ASSIGNED' && !trip.value?.vehicle) {
    const resources = await tripStore.availableResources(tripId);
    availableVehicleOptions.value = resources.vehicles.map((v) => ({ id: v.id, registrationNumber: v.registrationNumber }));
    availableDriverOptions.value = resources.drivers.map((d) => ({ id: d.id, name: d.name }));
    assignDialog.value = true;
  } else {
    if (showPodStep.value) {
      await podStore.fetchList({ tripId, type: 'POD' });
    }
    chargeAmount.value = undefined;
    updateStatusDialog.value = true;
  }
}

async function onPodUpload(type: string, file: File) {
  try {
    await podStore.upload(tripId, type, file);
    await podStore.fetchList({ tripId, type: 'POD' });
    success('POD document uploaded');
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload POD document'));
  }
}

async function submitUpdateStatus() {
  if (!nextStatus.value) return;
  const targetStatus = nextStatus.value;
  updatingStatus.value = true;
  try {
    trip.value = await tripStore.updateStatus(tripId, targetStatus, statusNotes.value || undefined, chargeAmount.value || undefined);
    await tripStore.fetchTimeline(tripId);
    success(`Trip marked as ${statusLabel(targetStatus)}`);
    updateStatusDialog.value = false;
    statusNotes.value = '';
    chargeAmount.value = undefined;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update trip status'));
  } finally {
    updatingStatus.value = false;
  }
}

// --- Assign vehicle & driver ---
const assignDialog = ref(false);
// Only vehicles/drivers not currently tied up on another trip — refetched
// each time the assign dialog opens (see onMarkAsClick).
const availableVehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const availableDriverOptions = ref<{ id: string; name: string }[]>([]);
const supplierOptions = ref<{ id: string; name: string }[]>([]);
const vehicleDriverMap = ref<Record<string, VehicleDriverInfo>>({});

async function onAssignSubmit(payload: Record<string, unknown>) {
  updatingStatus.value = true;
  try {
    trip.value = await tripStore.allocate(tripId, payload);
    await tripStore.fetchTimeline(tripId);
    success('Asset allocated — trip marked as Assigned');
    assignDialog.value = false;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to allocate asset'));
  } finally {
    updatingStatus.value = false;
  }
}

// --- Cancel ---
const cancelDialog = ref(false);
const cancelReason = ref('');
const cancelling = ref(false);
async function submitCancel() {
  if (!cancelReason.value.trim()) {
    error('Please provide a cancellation reason');
    return;
  }
  cancelling.value = true;
  try {
    trip.value = await tripStore.cancel(tripId, cancelReason.value);
    success('Trip cancelled');
    cancelDialog.value = false;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to cancel trip'));
  } finally {
    cancelling.value = false;
  }
}

onMounted(() => {
  loadTrip();
  loadAssignmentOptions();
});
</script>

<style scoped>
.info-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 16px;
  align-items: stretch;
}
@media (max-width: 1200px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
.bottom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.icon-badge {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--color-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.live-tracking-placeholder {
  flex: 1 1 auto;
  /* min-height: 220px; */
  height: 100%;
  border-radius: 12px;
  background: var(--color-hover);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.note-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(var(--color-primary-rgb), 0.14);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
.notes-list {
  max-height: 200px;
  overflow-y: auto;
}
</style>
