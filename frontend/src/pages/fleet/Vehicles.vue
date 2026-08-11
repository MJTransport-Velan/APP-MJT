<template>
  <div>
    <div class="mb-1">
      <h2 class="text-h6 mb-1">{{ pageTitle }}</h2>
      <p class="text-caption text-medium-emphasis mb-0">{{ pageSubtitle }}</p>
    </div>

    <div class="stat-grid my-4">
      <AppCard variant="outlined" class="stat-card" :class="{ 'stat-card--active': activeFilter === null }" @click="activeFilter = null">
        <div class="d-flex align-center justify-space-between pa-3">
          <div>
            <div class="d-flex align-center ga-2">
              <span class="text-caption text-medium-emphasis">{{ totalLabel }}</span>
              <AppChip size="x-small" variant="outlined">{{ ownershipBadge }}</AppChip>
            </div>
            <div class="text-h5 font-weight-bold">{{ stats.total }}</div>
          </div>
          <div class="stat-card__icon" style="background: rgba(37,99,235,.12); color:#1d4ed8">
            <AppIcon icon="mdi-truck-outline" />
          </div>
        </div>
      </AppCard>

      <AppCard variant="outlined" class="stat-card" :class="{ 'stat-card--active': activeFilter === 'AVAILABLE' }" @click="activeFilter = 'AVAILABLE'">
        <div class="d-flex align-center justify-space-between pa-3">
          <div>
            <span class="text-caption font-weight-medium" style="color: var(--color-success)">AVAILABLE</span>
            <div class="text-h5 font-weight-bold">{{ stats.available }}</div>
          </div>
          <div class="stat-card__icon" style="background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success)">
            <AppIcon icon="mdi-check-circle-outline" />
          </div>
        </div>
      </AppCard>

      <AppCard variant="outlined" class="stat-card" :class="{ 'stat-card--active': activeFilter === 'ON_TRIP' }" @click="activeFilter = 'ON_TRIP'">
        <div class="d-flex align-center justify-space-between pa-3">
          <div>
            <span class="text-caption font-weight-medium" style="color: var(--color-warning)">ON TRIP</span>
            <div class="text-h5 font-weight-bold">{{ stats.onTrip }}</div>
          </div>
          <div class="stat-card__icon" style="background: color-mix(in srgb, var(--color-warning) 16%, transparent); color: var(--color-warning)">
            <AppIcon icon="mdi-navigation-outline" />
          </div>
        </div>
      </AppCard>

      <AppCard variant="outlined" class="stat-card" :class="{ 'stat-card--active': activeFilter === 'UNAVAILABLE' }" @click="activeFilter = 'UNAVAILABLE'">
        <div class="d-flex align-center justify-space-between pa-3">
          <div>
            <span class="text-caption font-weight-medium" style="color: var(--color-error)">UNAVAILABLE</span>
            <div class="text-h5 font-weight-bold">{{ stats.unavailable }}</div>
            <div class="text-caption text-medium-emphasis">Accident &bull; Maintenance &bull; No Driver</div>
          </div>
          <div class="stat-card__icon" style="background: color-mix(in srgb, var(--color-error) 14%, transparent); color: var(--color-error)">
            <AppIcon icon="mdi-alert-circle-outline" />
          </div>
        </div>
      </AppCard>
    </div>

    <AppCard variant="outlined" class="pa-3 mb-4">
      <div class="d-flex flex-wrap align-center ga-3">
        <AppTextField
          v-model="search"
          placeholder="Search by truck number, driver, or location..."
          prepend-inner-icon="mdi-magnify"
          clearable
          class="search-field"
        />
        <div class="d-flex ga-2 flex-wrap">
          <AppBtn
            v-for="opt in filterOptions"
            :key="opt.value ?? 'all'"
            size="small"
            :variant="activeFilter === opt.value ? 'flat' : 'outlined'"
            :color="activeFilter === opt.value ? 'primary' : undefined"
            @click="activeFilter = opt.value"
          >
            {{ opt.label }}
          </AppBtn>
        </div>
      </div>
    </AppCard>

    <div v-if="fleetStore.trackingLoading" class="d-flex justify-center pa-8">
      <AppProgressCircular indeterminate />
    </div>
    <div v-else-if="filteredVehicles.length === 0" class="text-center pa-8 text-medium-emphasis">
      No vehicles match your search or filter.
    </div>
    <div v-else class="tracking-grid">
      <AppCard
        v-for="vehicle in filteredVehicles"
        :key="vehicle.id"
        variant="outlined"
        class="tracking-card"
        :class="`tracking-card--${vehicle.trackingStatus.toLowerCase()}`"
        @click="openDetail(vehicle)"
      >
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center ga-2">
            <div class="tracking-card__icon"><AppIcon icon="mdi-truck-outline" /></div>
            <div>
              <div class="text-subtitle-2 font-weight-bold">{{ vehicle.registrationNumber }}</div>
              <div class="text-caption text-medium-emphasis d-flex align-center ga-1">
                <AppIcon icon="mdi-account-outline" size="x-small" />{{ vehicle.driverName || 'Unassigned' }}
              </div>
            </div>
          </div>
          <AppChip size="x-small" :color="STATUS_META[vehicle.trackingStatus].color">
            {{ STATUS_META[vehicle.trackingStatus].label }}
          </AppChip>
        </div>

        <div class="tracking-card__location mb-3">
          <div class="d-flex align-center justify-space-between">
            <span class="text-caption text-medium-emphasis">
              {{ vehicle.trackingStatus === 'ON_TRIP' ? 'CURRENT LOCATION' : 'LAST KNOWN LOCATION' }}
            </span>
            <span class="location-dot" :class="{ 'location-dot--live': vehicle.trackingStatus === 'ON_TRIP' }" />
          </div>
          <div class="font-weight-medium">{{ vehicle.currentLocation || '—' }}</div>
        </div>

        <div v-if="vehicle.activeTrip" class="tracking-card__panel tracking-card__panel--trip">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-caption font-weight-bold" style="color: var(--color-warning)">ACTIVE TRIP</span>
            <AppChip size="x-small" variant="outlined">{{ vehicle.activeTrip.tripNumber }}</AppChip>
          </div>
          <div class="d-flex align-center justify-space-between ga-2">
            <div class="text-truncate">
              <div class="text-caption text-medium-emphasis">FROM</div>
              <div class="font-weight-medium text-truncate">{{ vehicle.activeTrip.fromLocation }}</div>
            </div>
            <AppIcon icon="mdi-arrow-right-circle-outline" style="color: var(--color-warning)" />
            <div class="text-end text-truncate">
              <div class="text-caption text-medium-emphasis">TO</div>
              <div class="font-weight-medium text-truncate">{{ vehicle.activeTrip.toLocation }}</div>
            </div>
          </div>
          <div class="d-flex justify-space-between text-caption mt-2 mb-1">
            <span class="text-medium-emphasis">TRIP PROGRESS</span>
            <span class="font-weight-bold">{{ vehicle.activeTrip.progressPercent }}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-track__fill" :style="{ width: vehicle.activeTrip.progressPercent + '%' }" />
          </div>
        </div>

        <div v-else-if="vehicle.trackingStatus === 'AVAILABLE'" class="tracking-card__panel tracking-card__panel--available">
          <div class="d-flex align-center ga-1 text-caption font-weight-bold" style="color: var(--color-success)">
            <AppIcon icon="mdi-check-circle-outline" size="small" />Ready for next trip
          </div>
          <div class="text-caption text-medium-emphasis mt-2">IDLE SINCE LAST TRIP</div>
          <div class="text-subtitle-1 font-weight-bold">{{ idleDurations[vehicle.id] || '—' }}</div>
          <div v-if="vehicle.lastCompletedTripNumber" class="text-caption text-medium-emphasis mt-1">
            Last completed: {{ vehicle.lastCompletedTripNumber }}
          </div>
        </div>

        <div v-else class="tracking-card__panel tracking-card__panel--unavailable">
          <div class="d-flex align-center ga-1 text-caption font-weight-bold" style="color: var(--color-error)">
            <AppIcon icon="mdi-alert-circle-outline" size="small" />
            {{ vehicle.isActive ? 'Under maintenance' : 'Inactive' }}
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Detail Dialog -->
    <AppDialog v-model="detailDialog" max-width="820" persistent>
      <AppCard v-if="detailTarget">
        <AppCardTitle class="d-flex align-center justify-space-between">
          <span class="text-h6">{{ detailTarget.registrationNumber }}</span>
          <AppBtn icon="mdi-close" variant="text" size="small" @click="detailDialog = false" />
        </AppCardTitle>

        <AppTabs v-model="activeTab" color="primary">
          <AppTab value="profile">Profile & Status</AppTab>
          <AppTab value="documents">Documents & Compliance</AppTab>
          <AppTab value="timeline">Timeline</AppTab>
        </AppTabs>

        <AppCardText style="max-height: 520px; overflow-y: auto">
          <AppWindow v-model="activeTab">
            <!-- Profile & Status -->
            <AppWindowItem value="profile">
              <div class="d-flex align-center ga-4 mb-4">
                <AppAvatar size="72" rounded="lg" color="primary">
                  <img v-if="fleetVehicle?.photo" :src="apiOrigin + fleetVehicle.photo" class="app-img" />
                  <AppIcon v-else icon="mdi-truck-outline" color="white" size="32" />
                </AppAvatar>
                <div class="flex-grow-1">
                  <VehicleStatusChip v-if="fleetVehicle" :status="fleetVehicle.status" />
                  <AppFileInput
                    v-model="photoFile"
                    label="Upload photo"
                    class="mt-2"
                    accept="image/*"
                    @update:model-value="onPhotoSelected"
                  />
                </div>
                <div>
                  <AppSelect
                    v-model="newStatus"
                    :items="statusOptions"
                    label="Change Status"
                    style="width: 200px"
                  />
                  <AppBtn size="small" color="primary" class="mt-2" :loading="savingStatus" @click="onSaveStatus">
                    Update
                  </AppBtn>
                </div>
              </div>

              <AppBtn variant="tonal" size="small" :loading="checkingAvailability" @click="onCheckAvailability">
                Check Availability
              </AppBtn>
              <AppAlert v-if="availabilityResult" :type="availabilityResult.isAvailable ? 'success' : 'warning'" class="mt-3">
                <div v-if="availabilityResult.isAvailable">Vehicle is available for assignment.</div>
                <ul v-else class="mb-0">
                  <li v-for="(reason, i) in availabilityResult.reasons" :key="i">{{ reason }}</li>
                </ul>
              </AppAlert>
            </AppWindowItem>

            <!-- Documents & Compliance -->
            <AppWindowItem value="documents">
              <div class="row row-dense" v-if="fleetVehicle">
                <div class="col-6 col-sm-3">
                  <div class="text-caption text-medium-emphasis mb-1">RC</div>
                  <DocumentExpiryChip :date="fleetVehicle.rcExpiryDate" />
                </div>
                <div class="col-6 col-sm-3">
                  <div class="text-caption text-medium-emphasis mb-1">Insurance</div>
                  <DocumentExpiryChip :date="fleetVehicle.insuranceExpiryDate" />
                </div>
                <div class="col-6 col-sm-3">
                  <div class="text-caption text-medium-emphasis mb-1">Permit</div>
                  <DocumentExpiryChip :date="fleetVehicle.permitExpiryDate" />
                </div>
                <div class="col-6 col-sm-3">
                  <div class="text-caption text-medium-emphasis mb-1">Fitness</div>
                  <DocumentExpiryChip :date="fleetVehicle.fitnessExpiryDate" />
                </div>
                <div class="col-6 col-sm-3">
                  <div class="text-caption text-medium-emphasis mb-1">PUC</div>
                  <DocumentExpiryChip :date="fleetVehicle.pucExpiryDate" />
                </div>
              </div>

              <AppDivider class="my-4" />

              <form>
                <div class="row row-dense">
                  <div class="col-12 col-sm-6">
                    <AppTextField v-model="complianceForm.fastagNumber" label="FASTag Number" />
                  </div>
                  <div class="col-12 col-sm-6">
                    <AppTextField v-model="complianceForm.gpsDeviceNumber" label="GPS Device Number" />
                  </div>
                  <div class="col-6 col-sm-3">
                    <AppTextField v-model="complianceForm.rcExpiryDate" type="date" label="RC Expiry" />
                  </div>
                  <div class="col-6 col-sm-3">
                    <AppTextField v-model="complianceForm.insuranceExpiryDate" type="date" label="Insurance Expiry" />
                  </div>
                  <div class="col-6 col-sm-3">
                    <AppTextField v-model="complianceForm.permitExpiryDate" type="date" label="Permit Expiry" />
                  </div>
                  <div class="col-6 col-sm-3">
                    <AppTextField v-model="complianceForm.fitnessExpiryDate" type="date" label="Fitness Expiry" />
                  </div>
                  <div class="col-6 col-sm-3">
                    <AppTextField v-model="complianceForm.pucExpiryDate" type="date" label="PUC Expiry" />
                  </div>
                </div>
                <AppBtn color="primary" size="small" :loading="savingCompliance" @click="onSaveCompliance">
                  Save Compliance Details
                </AppBtn>
              </form>

              <AppDivider class="my-4" />

              <div class="row row-dense">
                <div class="col-12 col-sm-6">
                  <AppFileInput
                    v-model="fitnessFile"
                    label="Upload Fitness Certificate"
                    accept="image/*,application/pdf"
                    @update:model-value="onFitnessSelected"
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <AppFileInput
                    v-model="pucFile"
                    label="Upload PUC Certificate"
                    accept="image/*,application/pdf"
                    @update:model-value="onPucSelected"
                  />
                </div>
              </div>
            </AppWindowItem>

            <!-- Timeline -->
            <AppWindowItem value="timeline">
              <VehicleTimeline :events="fleetStore.timeline" />
            </AppWindowItem>
          </AppWindow>
        </AppCardText>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useVehicleFleetStore } from '@/stores/fleet';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import VehicleStatusChip from '@/components/fleet/VehicleStatusChip.vue';
import DocumentExpiryChip from '@/components/fleet/DocumentExpiryChip.vue';
import VehicleTimeline from '@/components/fleet/VehicleTimeline.vue';
import {
  AppChip,
  AppBtn,
  AppDialog,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppTabs,
  AppTab,
  AppWindow,
  AppWindowItem,
  AppAvatar,
  AppIcon,
  AppFileInput,
  AppSelect,
  AppAlert,
  AppDivider,
  AppTextField,
  AppProgressCircular,
} from '@/components/ui';
import type { VehicleTracking } from '@/types/fleet.types';

const fleetStore = useVehicleFleetStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

// --- Role-scoped title (mirrors the backend's forced ownership in
// vehicle-fleet.service.ts / vehicleAccess.ts) ---
const forcedOwnership = computed<'OWN' | 'MARKET' | null>(() => {
  const roles = authStore.user?.roles || [];
  if (roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'OPERATION_MANAGER'].includes(r))) return null;
  if (roles.includes('OWN_FLEET_OPERATOR')) return 'OWN';
  if (roles.includes('MARKET_FLEET_OPERATOR')) return 'MARKET';
  return null;
});
const pageTitle = computed(() => {
  if (forcedOwnership.value === 'OWN') return 'Live Fleet Tracking — Own Trucks';
  if (forcedOwnership.value === 'MARKET') return 'Live Fleet Tracking — Market Trucks';
  return 'Live Fleet Tracking';
});
const pageSubtitle = computed(() => {
  if (forcedOwnership.value === 'OWN') {
    return 'Real-time locations and availability of your own fleet for trip planning (market trucks not shown)';
  }
  if (forcedOwnership.value === 'MARKET') {
    return 'Real-time locations and availability of market vehicles for trip planning (own trucks not shown)';
  }
  return 'Real-time locations and availability across your entire fleet';
});
const totalLabel = computed(() => {
  if (forcedOwnership.value === 'OWN') return 'OWN FLEET';
  if (forcedOwnership.value === 'MARKET') return 'MARKET FLEET';
  return 'TOTAL FLEET';
});
const ownershipBadge = computed(() => (forcedOwnership.value === 'MARKET' ? 'Market' : 'Owned'));

// --- Tracking list, search & filter ---
const search = ref('');
const activeFilter = ref<'AVAILABLE' | 'ON_TRIP' | 'UNAVAILABLE' | null>(null);
const filterOptions: { label: string; value: 'AVAILABLE' | 'ON_TRIP' | 'UNAVAILABLE' | null }[] = [
  { label: 'All', value: null },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'On Trip', value: 'ON_TRIP' },
  { label: 'Unavailable', value: 'UNAVAILABLE' },
];

const STATUS_META: Record<VehicleTracking['trackingStatus'], { label: string; color: string }> = {
  ON_TRIP: { label: 'On Trip', color: 'warning' },
  AVAILABLE: { label: 'Available', color: 'success' },
  UNAVAILABLE: { label: 'Unavailable', color: 'error' },
};

const stats = computed(() => {
  const list = fleetStore.tracking;
  return {
    total: list.length,
    available: list.filter((v) => v.trackingStatus === 'AVAILABLE').length,
    onTrip: list.filter((v) => v.trackingStatus === 'ON_TRIP').length,
    unavailable: list.filter((v) => v.trackingStatus === 'UNAVAILABLE').length,
  };
});

const filteredVehicles = computed(() => {
  let list = fleetStore.tracking;
  if (activeFilter.value) list = list.filter((v) => v.trackingStatus === activeFilter.value);
  const q = search.value.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (v) =>
        v.registrationNumber.toLowerCase().includes(q) ||
        (v.driverName || '').toLowerCase().includes(q) ||
        (v.currentLocation || '').toLowerCase().includes(q)
    );
  }
  return list;
});

// --- Live "idle since last trip" ticker ---
const now = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | undefined;

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

const idleDurations = computed(() => {
  const map: Record<string, string> = {};
  for (const v of fleetStore.tracking) {
    if (v.trackingStatus === 'AVAILABLE' && v.idleSince) {
      map[v.id] = formatDuration(now.value - new Date(v.idleSince).getTime());
    }
  }
  return map;
});

// --- Detail dialog (unchanged from the previous table-based page) ---
const detailDialog = ref(false);
const detailTarget = ref<any>(null);
const activeTab = ref('profile');
const fleetVehicle = ref<any>(null);

const statusOptions = [
  { title: 'Available', value: 'AVAILABLE' },
  { title: 'Running', value: 'RUNNING' },
  { title: 'Under Maintenance', value: 'UNDER_MAINTENANCE' },
  { title: 'Inactive', value: 'INACTIVE' },
];
const newStatus = ref('AVAILABLE');
const savingStatus = ref(false);

const complianceForm = reactive({
  fastagNumber: '',
  gpsDeviceNumber: '',
  rcExpiryDate: '',
  insuranceExpiryDate: '',
  permitExpiryDate: '',
  fitnessExpiryDate: '',
  pucExpiryDate: '',
});
const savingCompliance = ref(false);

const checkingAvailability = ref(false);
const availabilityResult = ref<{ isAvailable: boolean; reasons: string[] } | null>(null);

const photoFile = ref<File[]>([]);
const fitnessFile = ref<File[]>([]);
const pucFile = ref<File[]>([]);

async function openDetail(vehicle: VehicleTracking) {
  detailTarget.value = vehicle;
  activeTab.value = 'profile';
  availabilityResult.value = null;
  detailDialog.value = true;

  await fleetStore.fetchById(vehicle.id);
  fleetVehicle.value = fleetStore.current;
  newStatus.value = fleetVehicle.value?.status || 'AVAILABLE';
  complianceForm.fastagNumber = fleetVehicle.value?.fastagNumber || '';
  complianceForm.gpsDeviceNumber = fleetVehicle.value?.gpsDeviceNumber || '';
  complianceForm.rcExpiryDate = fleetVehicle.value?.rcExpiryDate?.substring(0, 10) || '';
  complianceForm.insuranceExpiryDate = fleetVehicle.value?.insuranceExpiryDate?.substring(0, 10) || '';
  complianceForm.permitExpiryDate = fleetVehicle.value?.permitExpiryDate?.substring(0, 10) || '';
  complianceForm.fitnessExpiryDate = fleetVehicle.value?.fitnessExpiryDate?.substring(0, 10) || '';
  complianceForm.pucExpiryDate = fleetVehicle.value?.pucExpiryDate?.substring(0, 10) || '';
}

watch(activeTab, async (tab) => {
  if (tab === 'timeline' && detailTarget.value) {
    await fleetStore.fetchTimeline(detailTarget.value.id);
  }
});

async function onSaveStatus() {
  if (!detailTarget.value) return;
  savingStatus.value = true;
  try {
    await fleetStore.setStatus(detailTarget.value.id, newStatus.value);
    fleetVehicle.value = fleetStore.current;
    success('Vehicle status updated');
    await fleetStore.fetchTracking();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update status'));
  } finally {
    savingStatus.value = false;
  }
}

async function onCheckAvailability() {
  if (!detailTarget.value) return;
  checkingAvailability.value = true;
  try {
    availabilityResult.value = await fleetStore.checkAvailability(detailTarget.value.id);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to check availability'));
  } finally {
    checkingAvailability.value = false;
  }
}

async function onSaveCompliance() {
  if (!detailTarget.value) return;
  savingCompliance.value = true;
  try {
    const payload: Record<string, unknown> = {};
    Object.entries(complianceForm).forEach(([key, value]) => {
      if (value) payload[key] = value;
    });
    await fleetStore.updateCompliance(detailTarget.value.id, payload);
    fleetVehicle.value = fleetStore.current;
    success('Compliance details updated');
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update compliance details'));
  } finally {
    savingCompliance.value = false;
  }
}

async function onPhotoSelected(files: File[] | File | null) {
  const file = Array.isArray(files) ? files[0] : files;
  if (!file || !detailTarget.value) return;
  try {
    await fleetStore.uploadPhoto(detailTarget.value.id, file);
    fleetVehicle.value = fleetStore.current;
    success('Photo uploaded');
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload photo'));
  } finally {
    photoFile.value = [];
  }
}

async function onFitnessSelected(files: File[] | File | null) {
  const file = Array.isArray(files) ? files[0] : files;
  if (!file || !detailTarget.value) return;
  try {
    await fleetStore.uploadFitness(detailTarget.value.id, file);
    fleetVehicle.value = fleetStore.current;
    success('Fitness certificate uploaded');
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload fitness certificate'));
  } finally {
    fitnessFile.value = [];
  }
}

async function onPucSelected(files: File[] | File | null) {
  const file = Array.isArray(files) ? files[0] : files;
  if (!file || !detailTarget.value) return;
  try {
    await fleetStore.uploadPuc(detailTarget.value.id, file);
    fleetVehicle.value = fleetStore.current;
    success('PUC certificate uploaded');
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload PUC certificate'));
  } finally {
    pucFile.value = [];
  }
}

onMounted(() => {
  fleetStore.fetchTracking();
  tickTimer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onBeforeUnmount(() => {
  if (tickTimer) clearInterval(tickTimer);
});
</script>

<style scoped>
.app-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.search-field {
  flex: 1 1 260px;
  min-width: 220px;
  margin-bottom: 0;
}
.tracking-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.tracking-card {
  cursor: pointer;
  padding: 16px;
  border-top: 3px solid var(--color-border);
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.tracking-card:hover {
  box-shadow: var(--shadow-2);
}
.tracking-card--on_trip {
  border-top-color: var(--color-warning);
}
.tracking-card--available {
  border-top-color: var(--color-success);
}
.tracking-card--unavailable {
  border-top-color: var(--color-error);
}
.tracking-card__icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--color-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tracking-card__location {
  background: var(--color-hover);
  border-radius: 10px;
  padding: 8px 10px;
}
.location-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-disabled);
  flex-shrink: 0;
}
.location-dot--live {
  background: var(--color-success);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-success) 20%, transparent);
}
.tracking-card__panel {
  border-radius: 10px;
  padding: 10px 12px;
}
.tracking-card__panel--trip {
  background: color-mix(in srgb, var(--color-warning) 8%, transparent);
}
.tracking-card__panel--available {
  background: color-mix(in srgb, var(--color-success) 8%, transparent);
}
.tracking-card__panel--unavailable {
  background: color-mix(in srgb, var(--color-error) 8%, transparent);
}
.progress-track {
  height: 6px;
  border-radius: 3px;
  background: var(--color-divider);
  overflow: hidden;
}
.progress-track__fill {
  height: 100%;
  background: var(--color-warning);
  border-radius: 3px;
}
</style>
