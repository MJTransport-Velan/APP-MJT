<template>
  <AppDialog v-model="internalModel" :max-width="480" persistent>
    <AppCardTitle class="d-flex flex-column ga-1">
      <span class="text-h6">Authorization Required</span>
      <span class="text-caption text-medium-emphasis">{{ intent?.intentNumber }} &bull; {{ intent?.company.name }}</span>
    </AppCardTitle>
    <AppCardText v-if="intent">
      <div class="summary-grid mb-4">
        <div>
          <div class="text-caption text-medium-emphasis">ROUTE</div>
          <div class="text-body-2 font-weight-medium">{{ intent.fromLocation.name }} &rarr; {{ intent.toLocation.name }}</div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis">CARGO</div>
          <div class="text-body-2 font-weight-medium">
            {{ intent.material?.name || '-' }} ({{ intent.quantityTon ?? 0 }} MT)
          </div>
        </div>
      </div>

      <div class="d-flex justify-space-between text-body-2 mb-3">
        <span class="text-medium-emphasis">Client Freight (fixed)</span>
        <span class="font-weight-medium">{{ formatCurrency(clientFreight) }}</span>
      </div>

      <div class="d-flex justify-space-between align-center mb-1">
        <span class="text-caption font-weight-medium">OPERATION AMOUNT (HIRING)</span>
        <AppChip size="x-small" color="info" variant="tonal">EST: {{ formatCurrency(estimate) }}</AppChip>
      </div>
      <AppTextField v-model.number="opsAmount" type="number" :error-messages="error" />

      <div class="mt-4">
        <div class="text-caption font-weight-medium mb-2">
          ASSIGN TO TEAM<span class="required-mark">*</span>
        </div>
        <div class="d-flex ga-2">
          <AppBtn
            :variant="fleetType === 'OWN' ? 'flat' : 'outlined'"
            :color="fleetType === 'OWN' ? 'primary' : undefined"
            class="flex-grow-1"
            prepend-icon="mdi-truck"
            @click="selectFleetType('OWN')"
          >
            Own Vehicle Team
          </AppBtn>
          <AppBtn
            :variant="fleetType === 'MARKET' ? 'flat' : 'outlined'"
            :color="fleetType === 'MARKET' ? 'primary' : undefined"
            class="flex-grow-1"
            prepend-icon="mdi-truck-outline"
            @click="selectFleetType('MARKET')"
          >
            Market Vehicle Team
          </AppBtn>
        </div>
        <div v-if="fleetTypeError" class="app-field__hint app-field--error-text">{{ fleetTypeError }}</div>
      </div>

      <AppAlert type="warning" class="mt-4">
        Approval locks the hiring rate for this trip. This will notify the {{ fleetType === 'MARKET' ? 'Market Vehicle' : fleetType === 'OWN' ? 'Own Vehicle' : '' }} team for asset allocation.
      </AppAlert>
    </AppCardText>
    <AppCardActions>
      <AppBtn variant="outlined" color="error" prepend-icon="mdi-close-circle-outline" @click="onReject">Reject Intent</AppBtn>
      <div class="spacer"></div>
      <AppBtn color="primary" variant="flat" prepend-icon="mdi-check" :loading="loading" @click="onApprove">
        Approve &amp; Authorize
      </AppBtn>
    </AppCardActions>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { AppDialog, AppCardTitle, AppCardText, AppCardActions, AppBtn, AppTextField, AppChip, AppAlert } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import type { FleetType, Intent } from '@/types/operations.types';

const props = defineProps<{
  modelValue: boolean;
  intent: Intent | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  approve: [opsAmount: number, fleetType: FleetType];
  reject: [];
}>();

const internalModel = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const opsAmount = ref<number | undefined>(undefined);
const error = ref('');
const fleetType = ref<FleetType | undefined>(undefined);
const fleetTypeError = ref('');

// Final client billing amount, fixed at intent creation — never changed by
// approval. Shown only for context; the manager authorizes opsAmount separately.
const clientFreight = computed(() => Number(props.intent?.freightAmount || 0));
// Client freight is a reasonable starting suggestion for the hiring cap, but
// the manager can adjust it — it's stored as its own field (Intent.opsAmount).
const estimate = computed(() => clientFreight.value);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      opsAmount.value = estimate.value || undefined;
      error.value = '';
      fleetType.value = undefined;
      fleetTypeError.value = '';
    }
  }
);

function selectFleetType(value: FleetType) {
  fleetType.value = value;
  fleetTypeError.value = '';
}

function onApprove() {
  let valid = true;
  if (!opsAmount.value || opsAmount.value <= 0) {
    error.value = 'Operation amount is required';
    valid = false;
  }
  if (!fleetType.value) {
    fleetTypeError.value = 'Choose which team this trip goes to';
    valid = false;
  }
  if (!valid) return;
  emit('approve', opsAmount.value!, fleetType.value!);
}

function onReject() {
  emit('reject');
}
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  background: var(--color-hover);
  border-radius: var(--radius-md);
  padding: 12px;
}
.required-mark {
  color: var(--color-error);
  margin-left: 2px;
}
.app-field__hint {
  font-size: 0.6875rem;
  margin-top: 3px;
  padding: 0 2px;
}
.app-field--error-text {
  color: var(--color-error);
}
</style>
