<template>
  <div>
    <!-- Own vs Market decides where the vehicle identity comes from: the fleet
         masters, or typed in for an ad-hoc hired truck. -->
    <div class="d-flex flex-wrap ga-2 mb-4">
      <AppBtn
        :variant="fleetType === 'OWN' ? 'flat' : 'outlined'"
        :color="fleetType === 'OWN' ? 'primary' : undefined"
        prepend-icon="mdi-truck-outline"
        @click="fleetType = 'OWN'"
      >
        Own Vehicle
      </AppBtn>
      <AppBtn
        :variant="fleetType === 'MARKET' ? 'flat' : 'outlined'"
        :color="fleetType === 'MARKET' ? 'primary' : undefined"
        prepend-icon="mdi-handshake-outline"
        @click="fleetType = 'MARKET'"
      >
        Market Vehicle
      </AppBtn>
    </div>

    <div v-if="fleetType === 'OWN'" class="form-grid">
      <AppSelect
        v-model="form.vehicleId"
        :items="vehicleOptions"
        item-title="registrationNumber"
        item-value="id"
        label="Vehicle"
        placeholder="Select a vehicle"
        :error-messages="errors.vehicleId"
        clearable
      />
      <AppSelect
        v-model="form.driverId"
        :items="driverOptions"
        item-title="name"
        item-value="id"
        label="Driver"
        placeholder="Select a driver"
        :error-messages="errors.driverId"
        clearable
      />
      <!-- Driver.phone is optional on the master; the LR needs a contact
           number, so it is prefilled where known and editable where not. -->
      <AppTextField
        v-model="form.driverMobile"
        label="Driver Mobile"
        placeholder="Contact number for the LR"
        :error-messages="errors.driverMobile"
        :hint="driverMobileHint"
        persistent-hint
      />
    </div>

    <div v-else class="form-grid">
      <AppSelect
        v-model="form.vehicleType"
        :items="vehicleTypeOptions"
        label="Vehicle Type"
        placeholder="Select a vehicle type"
        :error-messages="errors.vehicleType"
      />
      <AppTextField v-model="form.vehicleNumber" label="Vehicle Number" placeholder="TN38AB1234" :error-messages="errors.vehicleNumber" />
      <AppTextField v-model="form.driverName" label="Driver Name" :error-messages="errors.driverName" />
      <AppTextField v-model="form.driverMobile" label="Driver Mobile" :error-messages="errors.driverMobile" />
    </div>

    <div class="d-flex justify-end mt-4">
      <AppBtn color="primary" variant="flat" :loading="loading" prepend-icon="mdi-content-save-outline" @click="onSubmit">
        Save Vehicle Details
      </AppBtn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted } from 'vue';
import { AppBtn, AppSelect, AppTextField } from '@/components/ui';
import { useVehicleStore, useDriverStore } from '@/stores/masters';
import { vehicleTypeApi } from '@/services/masters';
import type { Booking, AssignVehiclePayload, FleetType } from '@/types/bookings.types';

const props = defineProps<{ booking: Booking; loading?: boolean }>();
const emit = defineEmits<{ (e: 'submit', payload: AssignVehiclePayload): void }>();

const vehicleStore = useVehicleStore();
const driverStore = useDriverStore();

const fleetType = ref<FleetType>(props.booking.fleetType || 'OWN');
const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const driverOptions = ref<{ id: string; name: string }[]>([]);
const vehicleTypeOptions = ref<string[]>([]);

const form = reactive({
  vehicleId: props.booking.vehicle?.id || '',
  driverId: props.booking.driver?.id || '',
  vehicleType: props.booking.vehicleTypeName || props.booking.vehicleTypeRequested || '',
  vehicleNumber: props.booking.vehicleNumber || '',
  driverName: props.booking.driverName || '',
  driverMobile: props.booking.driverMobile || '',
});

const errors = reactive<Record<string, string>>({
  vehicleId: '',
  driverId: '',
  vehicleType: '',
  vehicleNumber: '',
  driverName: '',
  driverMobile: '',
});

function clearErrors() {
  for (const key of Object.keys(errors)) errors[key] = '';
}

watch(fleetType, clearErrors);

// Picking a vehicle pre-fills its currently assigned driver, so the common case
// is one click rather than two independent lookups.
watch(
  () => form.vehicleId,
  (vehicleId) => {
    if (fleetType.value !== 'OWN' || !vehicleId || form.driverId) return;
    const assignment = vehicleStore.items.find((v: any) => v.id === vehicleId) as any;
    const assignedDriverId = assignment?.assignments?.find((a: any) => a.status === 'ACTIVE')?.driver?.id;
    if (assignedDriverId) form.driverId = assignedDriverId;
  }
);

// Selecting a driver pulls their number across from the master when it has one.
const driverMobileHint = ref('');
watch(
  () => form.driverId,
  (driverId) => {
    if (fleetType.value !== 'OWN' || !driverId) return;
    const driver = driverStore.items.find((d: any) => d.id === driverId) as any;
    if (driver?.phone) {
      form.driverMobile = driver.phone;
      driverMobileHint.value = '';
    } else {
      driverMobileHint.value = 'This driver has no number on file — add one so it appears on the LR.';
    }
  }
);

/**
 * Nothing is required: a vehicle is often half-arranged — a registration
 * number agreed but no driver named yet — and staff need to record what they
 * have. Only the format of what was actually typed is enforced.
 */
function validate(): boolean {
  clearErrors();
  let valid = true;
  if (form.driverMobile.trim() && !/^[0-9+\s-]{7,15}$/.test(form.driverMobile.trim())) {
    errors.driverMobile = 'Enter a valid driver mobile number';
    valid = false;
  }
  return valid;
}

function onSubmit() {
  if (!validate()) return;
  emit(
    'submit',
    fleetType.value === 'OWN'
      ? {
          fleetType: 'OWN',
          vehicleId: form.vehicleId || undefined,
          driverId: form.driverId || undefined,
          driverMobile: form.driverMobile.trim() || undefined,
        }
      : {
          fleetType: 'MARKET',
          vehicleType: form.vehicleType || undefined,
          vehicleNumber: form.vehicleNumber.trim() || undefined,
          driverName: form.driverName.trim() || undefined,
          driverMobile: form.driverMobile.trim() || undefined,
        }
  );
}

/** Surfaces server-side field errors on the matching inputs. */
function setErrors(serverErrors: Record<string, string>) {
  for (const [key, message] of Object.entries(serverErrors)) {
    if (key in errors) errors[key] = message;
  }
}
defineExpose({ setErrors });

onMounted(async () => {
  // Settled, not all — a role without one of these lookups should still get
  // the other dropdown rather than an empty form.
  const [, , vehicleTypesRes] = await Promise.allSettled([
    vehicleStore.fetchList({ pageSize: 200 }),
    driverStore.fetchList({ pageSize: 200 }),
    vehicleTypeApi.list({ pageSize: 200 }),
  ]);
  vehicleOptions.value = vehicleStore.items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  driverOptions.value = driverStore.items.map((d: any) => ({ id: d.id, name: d.name }));
  if (vehicleTypesRes.status === 'fulfilled') {
    vehicleTypeOptions.value = vehicleTypesRes.value.data.data.map((t: any) => t.name);
  }
  // Whatever the customer asked for on the website is the sensible default for
  // a market truck, even if it isn't a registered VehicleType.
  const requested = props.booking.vehicleTypeName || props.booking.vehicleTypeRequested;
  if (requested && !vehicleTypeOptions.value.includes(requested)) {
    vehicleTypeOptions.value = [requested, ...vehicleTypeOptions.value];
  }
});
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
</style>
