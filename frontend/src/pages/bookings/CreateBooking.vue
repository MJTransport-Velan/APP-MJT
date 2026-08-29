<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div class="d-flex align-center ga-3">
        <AppBtn icon="mdi-arrow-left" variant="text" title="Back to bookings" @click="router.push('/bookings/list')" />
        <div>
          <h2 class="text-h6 mb-1">New Booking</h2>
          <p class="text-caption text-medium-emphasis mb-0">
            Enter a walk-in or phone booking. It joins the same queue as website bookings, ready to confirm.
          </p>
          <p class="text-caption text-medium-emphasis mb-0">
            Every field is optional — save what you have now and fill in the rest later. The pickup and delivery
            locations are needed only when you come to confirm the booking.
          </p>
        </div>
      </div>
    </div>

    <div class="form-columns">
      <AppCard variant="outlined">
        <AppCardTitle class="text-subtitle-1">Customer Details</AppCardTitle>
        <AppCardText>
          <div class="field-grid">
            <AppTextField v-model="form.customerName" label="Customer Name" :error-messages="errors.customerName" />
            <AppTextField v-model="form.mobile" label="Mobile Number" :error-messages="errors.mobile" />
            <AppTextField v-model="form.email" label="Email (optional)" :error-messages="errors.email" />
          </div>
        </AppCardText>
      </AppCard>

      <AppCard variant="outlined">
        <AppCardTitle class="text-subtitle-1">Route</AppCardTitle>
        <AppCardText>
          <div class="field-grid">
            <AppSelect
              v-model="form.fromLocationId"
              :items="locationOptions"
              item-title="name"
              item-value="id"
              label="From"
              placeholder="Select pickup location"
              :error-messages="errors.fromLocationId"
            />
            <AppSelect
              v-model="form.toLocationId"
              :items="locationOptions"
              item-title="name"
              item-value="id"
              label="To"
              placeholder="Select delivery location"
              :error-messages="errors.toLocationId"
            />
          </div>
          <AppTextarea
            v-model="form.pickupAddress"
            label="Pickup Address"
            rows="2"
            class="mt-2"
            :error-messages="errors.pickupAddress"
          />
          <AppTextarea
            v-model="form.deliveryAddress"
            label="Delivery Address"
            rows="2"
            class="mt-2"
            :error-messages="errors.deliveryAddress"
          />
        </AppCardText>
      </AppCard>

      <AppCard variant="outlined">
        <AppCardTitle class="text-subtitle-1">Shipment Details</AppCardTitle>
        <AppCardText>
          <div class="field-grid">
            <AppTextField v-model="form.parcelType" label="Parcel Type" placeholder="e.g. Documents" :error-messages="errors.parcelType" />
            <AppTextField v-model.number="form.packages" type="number" label="Number of Packages" :error-messages="errors.packages" />
            <AppTextField v-model.number="form.weight" type="number" label="Approximate Weight (kg)" :error-messages="errors.weight" />
            <AppSelect
              v-model="form.vehicleType"
              :items="vehicleTypeOptions"
              label="Vehicle Type"
              placeholder="Select a vehicle type"
              :error-messages="errors.vehicleType"
            />
          </div>
        </AppCardText>
      </AppCard>

      <AppCard variant="outlined">
        <AppCardTitle class="text-subtitle-1">Schedule &amp; Charges</AppCardTitle>
        <AppCardText>
          <div class="field-grid">
            <AppTextField v-model="form.pickupDate" type="date" label="Pickup Date" :error-messages="errors.pickupDate" />
            <AppTextField
              v-model="form.expectedDeliveryDate"
              type="date"
              label="Expected Delivery (optional)"
              :error-messages="errors.expectedDeliveryDate"
            />
            <AppTextField
              v-model.number="form.freightAmount"
              type="number"
              label="Freight Amount (optional)"
              placeholder="Agreed price"
              hint="Carried onto the trip, so this job shows a value in Operations"
              persistent-hint
              :error-messages="errors.freightAmount"
            />
          </div>
          <AppTextarea v-model="form.instructions" label="Special Instructions (optional)" rows="2" class="mt-2" />
        </AppCardText>
      </AppCard>
    </div>

    <div class="d-flex flex-wrap justify-end ga-2 mt-4">
      <AppBtn variant="text" @click="router.push('/bookings/list')">Cancel</AppBtn>
      <AppBtn color="primary" variant="flat" prepend-icon="mdi-content-save-outline" :loading="saving" @click="onSubmit">
        Create Booking
      </AppBtn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBookingStore } from '@/stores/bookings';
import { locationApi, vehicleTypeApi } from '@/services/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { AppBtn, AppCard, AppCardTitle, AppCardText, AppTextField, AppTextarea, AppSelect } from '@/components/ui';
import type { CounterBookingPayload } from '@/types/bookings.types';

const router = useRouter();
const store = useBookingStore();
const { success, error } = useSnackbar();

const saving = ref(false);
const locationOptions = ref<{ id: string; name: string }[]>([]);
const vehicleTypeOptions = ref<string[]>([]);

const form = reactive({
  customerName: '',
  mobile: '',
  email: '',
  pickupAddress: '',
  deliveryAddress: '',
  fromLocationId: '',
  toLocationId: '',
  parcelType: '',
  packages: undefined as number | undefined,
  weight: undefined as number | undefined,
  vehicleType: '',
  pickupDate: '',
  expectedDeliveryDate: '',
  freightAmount: undefined as number | undefined,
  instructions: '',
});

const errors = reactive<Record<string, string>>({});

const MOBILE_RE = /^[0-9+\s-]{7,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Nothing here is required — a booking can be saved with as little as a name,
 * and completed once the rest is known. What validation remains checks only
 * the *shape* of what was actually typed, so a half-entered mobile number is
 * still caught while an empty one is allowed through.
 *
 * The route is the one thing that becomes mandatory later: confirming the
 * booking needs both locations, since that is what turns it into an Intent.
 */
function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key];

  if (form.mobile.trim() && !MOBILE_RE.test(form.mobile.trim())) errors.mobile = 'Enter a valid mobile number';
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (form.packages !== undefined && (form.packages < 0 || !Number.isInteger(form.packages))) {
    errors.packages = 'Enter a whole number of packages';
  }
  if (form.weight !== undefined && form.weight < 0) errors.weight = 'Weight cannot be negative';
  if (form.fromLocationId && form.toLocationId && form.fromLocationId === form.toLocationId) {
    errors.toLocationId = 'Pickup and delivery locations must be different';
  }
  if (form.expectedDeliveryDate && form.pickupDate && form.expectedDeliveryDate < form.pickupDate) {
    errors.expectedDeliveryDate = 'Cannot be before the pickup date';
  }
  if (form.freightAmount !== undefined && form.freightAmount < 0) {
    errors.freightAmount = 'Freight amount cannot be negative';
  }

  return Object.keys(errors).length === 0;
}

async function onSubmit() {
  if (!validate()) {
    error('Please correct the highlighted fields');
    return;
  }

  // Blanks are sent as undefined rather than '' so the record stores "not
  // known yet" instead of an empty string that reads like an answer.
  const payload: CounterBookingPayload = {
    customerName: form.customerName.trim() || undefined,
    mobile: form.mobile.trim() || undefined,
    email: form.email.trim() || undefined,
    pickupAddress: form.pickupAddress.trim() || undefined,
    deliveryAddress: form.deliveryAddress.trim() || undefined,
    fromLocationId: form.fromLocationId || undefined,
    toLocationId: form.toLocationId || undefined,
    parcelType: form.parcelType.trim() || undefined,
    packages: form.packages,
    weight: form.weight,
    vehicleType: form.vehicleType || undefined,
    pickupDate: form.pickupDate || undefined,
    expectedDeliveryDate: form.expectedDeliveryDate || undefined,
    freightAmount: form.freightAmount,
    instructions: form.instructions.trim() || undefined,
  };

  saving.value = true;
  try {
    const booking = await store.create(payload);
    success(`Booking ${booking.bookingNo} created`);
    // Straight to the detail screen — the next step is confirming it.
    router.push(`/bookings/${booking.id}`);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create booking'));
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  const [locationsRes, vehicleTypesRes] = await Promise.allSettled([
    locationApi.list({ pageSize: 500 }),
    vehicleTypeApi.list({ pageSize: 200 }),
  ]);
  if (locationsRes.status === 'fulfilled') {
    locationOptions.value = (locationsRes.value.data.data as any[]).map((l) => ({ id: l.id, name: l.name }));
  }
  if (vehicleTypesRes.status === 'fulfilled') {
    vehicleTypeOptions.value = (vehicleTypesRes.value.data.data as any[]).map((t) => t.name);
  }
});
</script>

<style scoped>
.form-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  align-items: start;
}
.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
</style>
