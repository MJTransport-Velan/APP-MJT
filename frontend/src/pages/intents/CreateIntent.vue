<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Create New Intent</h2>
        <p class="text-caption text-medium-emphasis mb-0">Create a new booking intent and allocate for trip planning.</p>
      </div>
      <div class="d-flex ga-2">
        <AppBtn variant="outlined" prepend-icon="mdi-content-save-outline" :loading="savingDraft" @click="onSaveDraft">
          Save as Draft
        </AppBtn>
        <AppBtn color="primary" :loading="submitting" @click="onNext">
          {{ step === 3 ? 'Confirm Intent Creation' : `Next: ${STEP_META[step].title}` }}
        </AppBtn>
      </div>
    </div>

    <!-- Step header -->
    <AppCard variant="outlined" class="mb-4">
      <div class="step-header">
        <div v-for="(meta, idx) in STEP_META" :key="meta.n" class="step-header__item">
          <div class="d-flex align-center ga-3" style="cursor: pointer">
            <div class="step-circle" :class="{ 'step-circle--active': meta.n <= step }">
              <AppIcon v-if="meta.n < step" icon="mdi-check" size="small" />
              <span v-else>{{ meta.n }}</span>
            </div>
            <div>
              <div class="text-body-2 font-weight-medium" :class="{ 'text-primary': meta.n === step }">{{ meta.title }}</div>
              <div class="text-caption text-medium-emphasis">{{ meta.subtitle }}</div>
            </div>
          </div>
          <div v-if="idx < STEP_META.length - 1" class="step-line" :class="{ 'step-line--done': meta.n < step }"></div>
        </div>
      </div>
    </AppCard>

    <div class="wizard-grid">
      <AppCard variant="outlined" class="pa-4">
        <!-- Step 1: Basic Details -->
        <div v-if="step === 1" class="d-flex flex-column ga-3">
          <div class="text-subtitle-1 font-weight-medium mb-1">Client &amp; Load Details</div>
          <div class="row row-dense">
            <div class="col-12 col-md-4">
              <AppSelect
                v-model="form.companyId"
                :items="companyOptions"
                item-title="name"
                item-value="id"
                label="Client / Company"
                required
                :error-messages="errors.companyId"
              />
            </div>
            <div class="col-12 col-md-4">
              <AppTextField v-model="form.poNumber" label="Reference / PO No." />
            </div>
            <div class="col-12 col-md-4">
              <AppSelect
                v-model="form.vehicleTypeId"
                :items="vehicleTypeOptions"
                item-title="name"
                item-value="id"
                label="Truck Type Required"
                required
                clearable
                :error-messages="errors.vehicleTypeId"
              />
            </div>
          </div>
          <div class="row row-dense">
            <div class="col-12 col-md-4">
              <AppSelect
                v-model="form.materialId"
                :items="materialOptions"
                item-title="name"
                item-value="id"
                label="Material / Goods"
                clearable
              />
            </div>
            <div class="col-12 col-md-4">
              <AppTextField v-model.number="form.quantityTon" type="number" label="Weight (MT)" />
            </div>
            <div class="col-12 col-md-4">
              <AppTextField v-model.number="form.packages" type="number" label="No. of Packages" />
            </div>
          </div>
          <div class="row row-dense">
            <div class="col-12 col-md-4">
              <AppTextField v-model.number="form.volumeCbm" type="number" label="Volume (CBM)" />
            </div>
          </div>
          <AppTextarea v-model="form.remarks" label="Goods Description / Remarks" rows="2" />
        </div>

        <!-- Step 2: Pickup & Delivery -->
        <div v-if="step === 2" class="d-flex flex-column ga-3">
          <div class="text-subtitle-1 font-weight-medium mb-1">Pickup &amp; Delivery</div>
          <div class="row row-dense">
            <div class="col-12 col-md-6">
              <AppSelect
                v-model="form.fromLocationId"
                :items="locationOptions"
                item-title="name"
                item-value="id"
                label="From (Pickup)"
                required
                :error-messages="errors.fromLocationId"
              />
            </div>
            <div class="col-12 col-md-6">
              <AppSelect
                v-model="form.toLocationId"
                :items="locationOptions"
                item-title="name"
                item-value="id"
                label="To (Delivery)"
                required
                :error-messages="errors.toLocationId"
              />
            </div>
          </div>
          <div class="row row-dense">
            <div class="col-12 col-md-6">
              <AppTextField
                v-model="form.expectedPickupDate"
                type="datetime-local"
                label="Truck Needed Date"
                required
                :error-messages="errors.expectedPickupDate"
              />
            </div>
            <div class="col-12 col-md-6">
              <AppTextField
                v-model="form.expectedDeliveryDate"
                type="datetime-local"
                label="Expected Delivery Date"
                required
                :error-messages="errors.expectedDeliveryDate"
              />
            </div>
          </div>
          <div>
            <div class="text-caption font-weight-medium mb-2">Operation Mode</div>
            <div class="d-flex ga-2">
              <AppBtn
                :variant="form.loadMode === 'FULL' ? 'flat' : 'outlined'"
                :color="form.loadMode === 'FULL' ? 'primary' : undefined"
                @click="form.loadMode = 'FULL'"
              >
                Full Load
              </AppBtn>
              <AppBtn
                :variant="form.loadMode === 'PART' ? 'flat' : 'outlined'"
                :color="form.loadMode === 'PART' ? 'primary' : undefined"
                @click="form.loadMode = 'PART'"
              >
                Part Load
              </AppBtn>
            </div>
          </div>
          <div class="d-flex align-start ga-2">
            <AppCheckbox v-model="form.podRequired" />
            <div>
              <div class="text-body-2 font-weight-medium">POD Required (Proof of Delivery)</div>
              <div class="text-caption text-medium-emphasis">Driver must upload delivery proof before trip is marked complete.</div>
            </div>
          </div>
          <div class="d-flex align-start ga-2">
            <AppCheckbox v-model="form.insuranceRequired" />
            <div>
              <div class="text-body-2 font-weight-medium">Insurance Required</div>
              <div class="text-caption text-medium-emphasis">Goods-in-transit insurance cover for this shipment.</div>
            </div>
          </div>
        </div>

        <!-- Step 3: Charges & Summary -->
        <div v-if="step === 3" class="d-flex flex-column ga-3">
          <div class="text-subtitle-1 font-weight-medium mb-1">Charges &amp; Summary</div>
          <div class="row row-dense">
            <div class="col-12 col-md-6">
              <AppTextField
                v-model.number="form.baseFreightAmount"
                type="number"
                label="Base Freight (₹)"
                required
                :error-messages="errors.baseFreightAmount"
              />
            </div>
            <div class="col-12 col-md-6">
              <AppTextField v-model.number="form.tollCharges" type="number" label="Toll &amp; Permits (₹)" />
            </div>
            <div class="col-12 col-md-6">
              <AppTextField v-model.number="form.loadingCharges" type="number" label="Loading / Unloading (₹)" />
            </div>
            <div class="col-12 col-md-6">
              <AppTextField v-model.number="form.otherCharges" type="number" label="Other Charges (₹)" />
            </div>
          </div>
          <AppAlert type="info">
            Submitting will notify the Operation Manager for approval and vehicle assignment.
          </AppAlert>
        </div>

        <AppDivider class="my-4" />
        <div class="d-flex justify-space-between">
          <AppBtn variant="outlined" :disabled="step === 1" @click="step = Math.max(1, step - 1)">&larr; Back</AppBtn>
          <AppBtn color="primary" :loading="submitting" @click="onNext">
            {{ step === 3 ? 'Confirm Intent Creation' : `Next: ${STEP_META[step].title}` }} &rarr;
          </AppBtn>
        </div>
      </AppCard>

      <div class="d-flex flex-column ga-3">
        <AppCard variant="outlined" class="pa-4">
          <div class="text-subtitle-2 font-weight-medium mb-2">Load Summary</div>
          <div class="row row-dense text-caption">
            <div class="col-6"><span class="text-medium-emphasis">Total Weight</span><div class="font-weight-medium">{{ form.quantityTon || 0 }} MT</div></div>
            <div class="col-6"><span class="text-medium-emphasis">Total Packages</span><div class="font-weight-medium">{{ form.packages || 0 }}</div></div>
            <div class="col-6"><span class="text-medium-emphasis">Total Volume</span><div class="font-weight-medium">{{ form.volumeCbm || 0 }} CBM</div></div>
            <div class="col-6"><span class="text-medium-emphasis">Load Mode</span><div class="font-weight-medium">{{ form.loadMode === 'PART' ? 'Part Load' : 'Full Load' }}</div></div>
          </div>
        </AppCard>
        <AppCard variant="outlined" class="pa-4">
          <div class="text-subtitle-2 font-weight-medium mb-2">Estimated Charges</div>
          <div class="d-flex flex-column ga-1 text-caption">
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Base Freight</span><span>{{ formatCurrency(form.baseFreightAmount || 0) }}</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Toll &amp; Permits</span><span>{{ formatCurrency(form.tollCharges || 0) }}</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Loading / Unloading</span><span>{{ formatCurrency(form.loadingCharges || 0) }}</span></div>
            <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Other Charges</span><span>{{ formatCurrency(form.otherCharges || 0) }}</span></div>
          </div>
          <AppDivider class="my-2" />
          <div class="d-flex justify-space-between align-center">
            <span class="text-body-2 font-weight-medium">Total Amount</span>
            <span class="text-h6">{{ formatCurrency(totalAmount) }}</span>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useIntentStore } from '@/stores/operations';
import { adminCompanyApi } from '@/services/admin-company.service';
import { useLocationStore, useMaterialStore, useVehicleTypeStore } from '@/stores/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import {
  AppBtn,
  AppIcon,
  AppCard,
  AppSelect,
  AppTextField,
  AppTextarea,
  AppCheckbox,
  AppAlert,
  AppDivider,
} from '@/components/ui';
import type { LoadMode } from '@/types/operations.types';

const router = useRouter();
const store = useIntentStore();
const { success, error } = useSnackbar();
const locationStore = useLocationStore();
const materialStore = useMaterialStore();
const vehicleTypeStore = useVehicleTypeStore();

const STEP_META = [
  { n: 1, title: 'Basic Details', subtitle: 'Client & Load' },
  { n: 2, title: 'Pickup & Delivery', subtitle: 'Route & Schedule' },
  { n: 3, title: 'Charges & Summary', subtitle: 'Review & Confirm' },
];

const step = ref(1);
const savingDraft = ref(false);
const submitting = ref(false);

const companyOptions = ref<{ id: string; name: string }[]>([]);
const locationOptions = ref<{ id: string; name: string }[]>([]);
const materialOptions = ref<{ id: string; name: string }[]>([]);
const vehicleTypeOptions = ref<{ id: string; name: string }[]>([]);

function nowForDateTimeInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const form = reactive({
  companyId: '',
  poNumber: '',
  vehicleTypeId: '',
  materialId: '',
  quantityTon: undefined as number | undefined,
  packages: undefined as number | undefined,
  volumeCbm: undefined as number | undefined,
  remarks: '',
  fromLocationId: '',
  toLocationId: '',
  expectedPickupDate: nowForDateTimeInput(),
  expectedDeliveryDate: nowForDateTimeInput(),
  loadMode: 'FULL' as LoadMode,
  podRequired: true,
  insuranceRequired: false,
  baseFreightAmount: undefined as number | undefined,
  tollCharges: undefined as number | undefined,
  loadingCharges: undefined as number | undefined,
  otherCharges: undefined as number | undefined,
});

const errors = reactive({
  companyId: '',
  vehicleTypeId: '',
  fromLocationId: '',
  toLocationId: '',
  expectedPickupDate: '',
  expectedDeliveryDate: '',
  baseFreightAmount: '',
});

const totalAmount = computed(
  () => (form.baseFreightAmount || 0) + (form.tollCharges || 0) + (form.loadingCharges || 0) + (form.otherCharges || 0)
);

function buildPayload() {
  return {
    companyId: form.companyId,
    fromLocationId: form.fromLocationId,
    toLocationId: form.toLocationId,
    materialId: form.materialId || undefined,
    vehicleTypeId: form.vehicleTypeId || undefined,
    quantityTon: form.quantityTon,
    expectedPickupDate: form.expectedPickupDate || undefined,
    expectedDeliveryDate: form.expectedDeliveryDate || undefined,
    remarks: form.remarks || undefined,
    poNumber: form.poNumber || undefined,
    packages: form.packages,
    volumeCbm: form.volumeCbm,
    loadMode: form.loadMode,
    podRequired: form.podRequired,
    insuranceRequired: form.insuranceRequired,
    baseFreightAmount: form.baseFreightAmount,
    tollCharges: form.tollCharges,
    loadingCharges: form.loadingCharges,
    otherCharges: form.otherCharges,
  };
}

function validateStep1() {
  errors.companyId = form.companyId ? '' : 'Client is required';
  errors.vehicleTypeId = form.vehicleTypeId ? '' : 'Truck type is required';
  return !errors.companyId && !errors.vehicleTypeId;
}

function validateStep2() {
  errors.fromLocationId = form.fromLocationId ? '' : 'Origin is required';
  errors.toLocationId = !form.toLocationId
    ? 'Destination is required'
    : form.toLocationId === form.fromLocationId
    ? 'Origin and destination must be different'
    : '';
  errors.expectedPickupDate = form.expectedPickupDate ? '' : 'Truck needed date is required';
  errors.expectedDeliveryDate = form.expectedDeliveryDate ? '' : 'Expected delivery date is required';
  return (
    !errors.fromLocationId && !errors.toLocationId && !errors.expectedPickupDate && !errors.expectedDeliveryDate
  );
}

function validateStep3() {
  errors.baseFreightAmount = form.baseFreightAmount ? '' : 'Base freight is required';
  return !errors.baseFreightAmount;
}

async function onNext() {
  if (step.value === 1) {
    if (!validateStep1()) return;
    step.value = 2;
    return;
  }
  if (step.value === 2) {
    if (!validateStep2()) return;
    step.value = 3;
    return;
  }
  // Step 3 — final confirm: create then submit for approval.
  if (!validateStep1() || !validateStep2() || !validateStep3()) {
    error('Please complete all required fields');
    return;
  }
  submitting.value = true;
  try {
    const intent = await store.create(buildPayload());
    await store.submit(intent.id);
    success('Intent created and submitted for approval');
    router.push('/intents/list');
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create intent'));
  } finally {
    submitting.value = false;
  }
}

async function onSaveDraft() {
  if (!validateStep1()) {
    step.value = 1;
    return;
  }
  savingDraft.value = true;
  try {
    await store.create(buildPayload());
    success('Intent saved as draft');
    router.push('/intents/list');
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save draft'));
  } finally {
    savingDraft.value = false;
  }
}

onMounted(async () => {
  // Settled, not all — a role missing permission for one lookup (e.g. no
  // company.view) must not blank out every other dropdown on this form.
  const [companiesRes] = await Promise.allSettled([
    adminCompanyApi.list({ pageSize: 200 }),
    locationStore.fetchList({ pageSize: 200 }),
    materialStore.fetchList({ pageSize: 200 }),
    vehicleTypeStore.fetchList({ pageSize: 200 }),
  ]);
  if (companiesRes.status === 'fulfilled') {
    companyOptions.value = companiesRes.value.data.data.map((c) => ({ id: c.id, name: c.name }));
  }
  locationOptions.value = locationStore.items.map((l: any) => ({ id: l.id, name: l.name }));
  materialOptions.value = materialStore.items.map((m: any) => ({ id: m.id, name: m.name }));
  vehicleTypeOptions.value = vehicleTypeStore.items.map((v: any) => ({ id: v.id, name: v.name }));
});
</script>

<style scoped>
.wizard-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  align-items: flex-start;
}
@media (max-width: 960px) {
  .wizard-grid {
    grid-template-columns: 1fr;
  }
}
.step-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
}
.step-header__item {
  display: flex;
  align-items: center;
  flex: 1;
}
.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--color-hover);
  color: var(--color-text-medium);
}
.step-circle--active {
  background: var(--color-primary);
  color: white;
}
.step-line {
  flex: 1;
  height: 2px;
  background: var(--color-border);
  margin: 0 16px;
}
.step-line--done {
  background: var(--color-primary);
}
</style>
