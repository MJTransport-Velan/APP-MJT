<template>
  <AppDialog v-model="internalModel" :max-width="820" persistent>
    <AppCardTitle class="d-flex flex-column ga-1">
      <span class="text-h6">Allocate Asset: {{ trip?.intent.intentNumber }}</span>
      <span class="text-caption text-medium-emphasis">
        {{ trip?.intent.company.name }} &bull; {{ trip?.fromLocation.name }} &rarr; {{ trip?.toLocation.name }}
      </span>
    </AppCardTitle>
    <AppCardText v-if="trip">
      <AppBtnToggle v-if="canOwnFleet && canMarketTruck" class="mb-4">
        <AppBtn
          :variant="allocationType === 'OWN_FLEET' ? 'flat' : 'text'"
          :color="allocationType === 'OWN_FLEET' ? 'primary' : undefined"
          prepend-icon="mdi-shield-check-outline"
          @click="allocationType = 'OWN_FLEET'"
        >
          Own Fleet
        </AppBtn>
        <AppBtn
          :variant="allocationType === 'MARKET_TRUCK' ? 'flat' : 'text'"
          :color="allocationType === 'MARKET_TRUCK' ? 'secondary' : undefined"
          prepend-icon="mdi-account-group-outline"
          @click="allocationType = 'MARKET_TRUCK'"
        >
          Market Truck
        </AppBtn>
      </AppBtnToggle>

      <div class="allocate-grid">
        <div class="d-flex flex-column ga-3">
          <template v-if="allocationType === 'OWN_FLEET'">
            <div class="row row-dense">
              <div class="col-12 col-md-6">
                <AppSelect
                  v-model="ownForm.vehicleId"
                  :items="vehicleOptions"
                  item-title="registrationNumber"
                  item-value="id"
                  label="Select Available Truck"
                  :error-messages="errors.vehicleId"
                />
              </div>
              <div class="col-12 col-md-6">
                <AppSelect
                  v-model="ownForm.driverId"
                  :items="driverOptions"
                  item-title="name"
                  item-value="id"
                  label="Assign Driver"
                  :error-messages="errors.driverId"
                />
                <div v-if="driverChangedFromAssignment" class="text-caption text-medium-emphasis mt-1">
                  Currently assigned to {{ assignedInfo?.driverName }} — picking a different driver will update the
                  vehicle assignment.
                </div>
              </div>
            </div>
            <AppDivider />
            <div class="text-subtitle-2 font-weight-medium d-flex align-center ga-2">
              <AppIcon icon="mdi-credit-card-outline" size="small" /> Trip Financials
            </div>
            <AppTextField v-model.number="ownForm.clientAdvance" type="number" label="Client Advance" />
          </template>

          <template v-else>
            <div class="row row-dense">
              <div class="col-12 col-md-6">
                <AppSelect
                  v-model="marketForm.supplierId"
                  :items="supplierOptions"
                  item-title="name"
                  item-value="id"
                  label="Market Vendor *"
                  :error-messages="errors.supplierId"
                />
              </div>
              <div class="col-12 col-md-6">
                <AppTextField v-model="marketForm.marketVehicleNumber" label="Market Vehicle Number" />
              </div>
            </div>
            <div class="row row-dense">
              <div class="col-12 col-md-6">
                <AppTextField v-model="marketForm.marketDriverName" label="Market Driver Name" />
              </div>
              <div class="col-12 col-md-6">
                <AppTextField
                  v-model="marketForm.marketDriverContact"
                  label="Driver Contact (required) *"
                  :error-messages="errors.marketDriverContact"
                />
              </div>
            </div>
            <AppDivider />
            <div class="text-subtitle-2 font-weight-medium d-flex align-center ga-2">
              <AppIcon icon="mdi-credit-card-outline" size="small" /> Trip Financials
            </div>
            <div class="row row-dense">
              <div class="col-12 col-md-4">
                <AppTextField
                  v-model.number="marketForm.tripAmount"
                  type="number"
                  label="Trip Amount (Cost) *"
                  :error-messages="errors.tripAmount"
                />
              </div>
              <div class="col-12 col-md-4">
                <AppTextField v-model.number="marketForm.clientAdvance" type="number" label="Client Advance" />
              </div>
              <div class="col-12 col-md-4">
                <AppTextField v-model.number="marketForm.supplierAdvance" type="number" label="Supplier Advance" />
              </div>
            </div>
          </template>
        </div>

        <AppCard variant="outlined" class="pa-4 d-flex flex-column ga-3">
          <div class="text-caption font-weight-medium text-medium-emphasis">INTENT SUMMARY</div>
          <div class="d-flex justify-space-between text-body-2">
            <span class="text-medium-emphasis">Material</span>
            <span class="font-weight-medium">{{ trip.intent.material?.name || '-' }}</span>
          </div>
          <AppDivider />
          <div class="d-flex justify-space-between text-body-2">
            <span class="text-medium-emphasis">Weight</span>
            <span class="font-weight-medium">{{ trip.intent.quantityTon ?? 0 }} MT</span>
          </div>
          <AppDivider />
          <div class="d-flex justify-space-between text-body-2">
            <span class="text-medium-emphasis">Ops Amt</span>
            <span class="font-weight-bold text-primary">{{ formatCurrency(opsAmount) }}</span>
          </div>
        </AppCard>
      </div>
    </AppCardText>
    <AppCardActions>
      <div class="spacer"></div>
      <AppBtn variant="text" @click="onCancel">Cancel</AppBtn>
      <AppBtn :color="allocationType === 'MARKET_TRUCK' ? 'secondary' : 'primary'" variant="flat" :loading="loading" @click="onSubmit">
        Confirm &amp; Book Trip
      </AppBtn>
    </AppCardActions>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  AppDialog,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppBtn,
  AppBtnToggle,
  AppSelect,
  AppTextField,
  AppCard,
  AppDivider,
  AppIcon,
} from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import { useAuthStore } from '@/stores/auth.store';
import type { Trip } from '@/types/operations.types';

export interface VehicleDriverInfo {
  driverId: string;
  driverName: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    trip: Trip | null;
    vehicleOptions: { id: string; registrationNumber: string }[];
    driverOptions: { id: string; name: string }[];
    supplierOptions: { id: string; name: string }[];
    vehicleDriverMap?: Record<string, VehicleDriverInfo>;
    loading?: boolean;
  }>(),
  { loading: false, vehicleDriverMap: () => ({}) }
);

const emit = defineEmits<{
  'update:modelValue': [boolean];
  submit: [payload: Record<string, unknown>];
  cancel: [];
}>();

const internalModel = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const authStore = useAuthStore();
// Mirrors backend trip.service.ts assertAllocationTypeAccess(): OWN_FLEET_OPERATOR
// only allocates own-fleet vehicles, MARKET_FLEET_OPERATOR only market trucks;
// any other role (managers/admins) can do both. Also mirrors assertFleetTypeMatch():
// once an intent's approval routed this trip to a specific team (trip.fleetType),
// that overrides role — a manager can't allocate the "wrong" team's asset either.
const roles = authStore.user?.roles || [];
const canOwnFleet = computed(() => !roles.includes('MARKET_FLEET_OPERATOR') && props.trip?.fleetType !== 'MARKET');
const canMarketTruck = computed(() => !roles.includes('OWN_FLEET_OPERATOR') && props.trip?.fleetType !== 'OWN');

const allocationType = ref<'OWN_FLEET' | 'MARKET_TRUCK'>(canOwnFleet.value ? 'OWN_FLEET' : 'MARKET_TRUCK');

const ownForm = reactive({ vehicleId: '', driverId: '', clientAdvance: undefined as number | undefined });
const marketForm = reactive({
  supplierId: '',
  marketVehicleNumber: '',
  marketDriverName: '',
  marketDriverContact: '',
  tripAmount: undefined as number | undefined,
  clientAdvance: undefined as number | undefined,
  supplierAdvance: undefined as number | undefined,
});
const errors = reactive({ vehicleId: '', driverId: '', supplierId: '', marketDriverContact: '', tripAmount: '' });

const opsAmount = computed(() => Number(props.trip?.intent.opsAmount || 0));

const assignedInfo = computed(() => (ownForm.vehicleId ? props.vehicleDriverMap[ownForm.vehicleId] : undefined));
const driverChangedFromAssignment = computed(
  () => !!assignedInfo.value && !!ownForm.driverId && ownForm.driverId !== assignedInfo.value.driverId
);

watch(
  () => ownForm.vehicleId,
  (vehicleId) => {
    const info = vehicleId ? props.vehicleDriverMap[vehicleId] : undefined;
    if (info) ownForm.driverId = info.driverId;
  }
);

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    allocationType.value = canOwnFleet.value ? 'OWN_FLEET' : 'MARKET_TRUCK';
    ownForm.vehicleId = props.trip?.vehicle?.id || '';
    ownForm.driverId = props.trip?.driver?.id || '';
    ownForm.clientAdvance = undefined;
    marketForm.supplierId = props.trip?.supplier?.id || '';
    marketForm.marketVehicleNumber = props.trip?.marketVehicleNumber || '';
    marketForm.marketDriverName = props.trip?.marketDriverName || '';
    marketForm.marketDriverContact = props.trip?.marketDriverContact || '';
    marketForm.tripAmount = props.trip?.supplierRate ?? undefined;
    marketForm.clientAdvance = undefined;
    marketForm.supplierAdvance = undefined;
    errors.vehicleId = '';
    errors.driverId = '';
    errors.supplierId = '';
    errors.marketDriverContact = '';
    errors.tripAmount = '';
  }
);

function onCancel() {
  emit('cancel');
  internalModel.value = false;
}

function onSubmit() {
  if (allocationType.value === 'OWN_FLEET') {
    errors.vehicleId = ownForm.vehicleId ? '' : 'Vehicle is required';
    errors.driverId = ownForm.driverId ? '' : 'Driver is required';
    if (errors.vehicleId || errors.driverId) return;

    emit('submit', {
      allocationType: 'OWN_FLEET',
      vehicleId: ownForm.vehicleId,
      driverId: ownForm.driverId,
      clientAdvance: ownForm.clientAdvance || undefined,
    });
    return;
  }

  errors.supplierId = marketForm.supplierId ? '' : 'Market vendor is required';
  errors.marketDriverContact = marketForm.marketDriverContact.trim() ? '' : 'Driver contact is required';
  errors.tripAmount = !marketForm.tripAmount || marketForm.tripAmount <= 0
    ? 'Trip amount is required'
    : marketForm.tripAmount > opsAmount.value
    ? `Trip amount cannot exceed the approved operation amount of ${formatCurrency(opsAmount.value)}`
    : '';
  if (errors.supplierId || errors.marketDriverContact || errors.tripAmount) return;

  emit('submit', {
    allocationType: 'MARKET_TRUCK',
    supplierId: marketForm.supplierId,
    marketVehicleNumber: marketForm.marketVehicleNumber || undefined,
    marketDriverName: marketForm.marketDriverName || undefined,
    marketDriverContact: marketForm.marketDriverContact,
    tripAmount: marketForm.tripAmount,
    clientAdvance: marketForm.clientAdvance || undefined,
    supplierAdvance: marketForm.supplierAdvance || undefined,
  });
}
</script>

<style scoped>
.allocate-grid {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 20px;
  align-items: start;
}
@media (max-width: 720px) {
  .allocate-grid {
    grid-template-columns: 1fr;
  }
}
</style>
