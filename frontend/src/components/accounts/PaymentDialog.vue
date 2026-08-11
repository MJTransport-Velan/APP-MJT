<template>
  <AppDialog v-model="internalModel" max-width="480" persistent>
    <AppCard>
      <AppCardTitle class="text-h6">Supplier Payment Entry</AppCardTitle>
      <AppCardText>
        <AppSelect
          v-model="form.supplierId"
          :items="supplierOptions"
          item-title="name"
          item-value="id"
          label="Supplier"
          :error-messages="errors.supplierId"
          class="mb-2"
        />
        <AppSelect
          v-model="form.tripId"
          :items="tripOptions"
          item-title="tripNumber"
          item-value="id"
          label="Trip (leave blank for advance)"
          clearable
          class="mb-2"
        />
        <AppSelect
          v-model="form.billId"
          :items="billOptionsForSupplier"
          item-title="billNumber"
          item-value="id"
          label="Supplier Bill (leave blank for advance)"
          clearable
          class="mb-2"
        />
        <AppTextField v-model.number="form.amount" type="number" label="Amount" :error-messages="errors.amount" class="mb-2" />
        <AppTextField v-model="form.paymentDate" type="date" label="Payment Date" class="mb-2" />
        <AppSelect
          v-model="fundAccountKey"
          :items="fundAccountOptions"
          item-title="label"
          item-value="key"
          label="Paid From (Bank/Cash)"
          :error-messages="errors.fundAccount"
          class="mb-2"
        />
        <AppSelect v-model="form.paymentModeId" :items="paymentModeOptions" item-title="name" item-value="id" label="Payment Mode" clearable class="mb-2" />
        <AppTextField v-model="form.referenceNumber" label="Reference Number" class="mb-2" />
        <AppCheckbox v-if="form.billId" v-model="form.isRetentionRelease" label="This is a retention release" class="mb-2" />
        <AppTextarea v-model="form.remarks" label="Remarks" rows="2" />
      </AppCardText>
      <AppCardActions>
        <div class="spacer"></div>
        <AppBtn variant="text" @click="onCancel">Cancel</AppBtn>
        <AppBtn color="primary" variant="flat" :loading="loading" @click="onSubmit">Save</AppBtn>
      </AppCardActions>
    </AppCard>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  AppDialog,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppSelect,
  AppTextField,
  AppTextarea,
  AppCheckbox,
  AppBtn,
} from '@/components/ui';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    supplierOptions?: { id: string; name: string }[];
    tripOptions?: { id: string; tripNumber: string }[];
    billOptions?: { id: string; billNumber: string; supplierId: string }[];
    paymentModeOptions?: { id: string; name: string }[];
    bankAccountOptions?: { id: string; accountHolderName: string; accountNumber: string }[];
    cashAccountOptions?: { id: string; label: string }[];
    loading?: boolean;
  }>(),
  {
    supplierOptions: () => [],
    tripOptions: () => [],
    billOptions: () => [],
    paymentModeOptions: () => [],
    bankAccountOptions: () => [],
    cashAccountOptions: () => [],
    loading: false,
  }
);

const fundAccountKey = ref('');
const fundAccountOptions = computed(() => [
  ...props.bankAccountOptions.map((b) => ({ key: `BANK:${b.id}`, label: `🏦 ${b.accountHolderName} (${b.accountNumber})` })),
  ...props.cashAccountOptions.map((c) => ({ key: `CASH:${c.id}`, label: `💵 ${c.label}` })),
]);
const billOptionsForSupplier = computed(() => props.billOptions.filter((b) => !form.supplierId || b.supplierId === form.supplierId));

const emit = defineEmits<{
  'update:modelValue': [boolean];
  submit: [payload: Record<string, unknown>];
  cancel: [];
}>();

const internalModel = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const form = reactive<{
  supplierId: string;
  tripId: string;
  billId: string;
  amount: number | undefined;
  paymentDate: string;
  paymentModeId: string;
  referenceNumber: string;
  remarks: string;
  isRetentionRelease: boolean;
}>({
  supplierId: '',
  tripId: '',
  billId: '',
  amount: undefined,
  paymentDate: new Date().toISOString().substring(0, 10),
  paymentModeId: '',
  referenceNumber: '',
  remarks: '',
  isRetentionRelease: false,
});
const errors = reactive({ supplierId: '', amount: '', fundAccount: '' });

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      Object.assign(form, {
        supplierId: '',
        tripId: '',
        billId: '',
        amount: undefined,
        paymentDate: new Date().toISOString().substring(0, 10),
        paymentModeId: '',
        referenceNumber: '',
        remarks: '',
        isRetentionRelease: false,
      });
      fundAccountKey.value = '';
      Object.assign(errors, { supplierId: '', amount: '', fundAccount: '' });
    }
  }
);

function onCancel() {
  emit('cancel');
  internalModel.value = false;
}

function onSubmit() {
  errors.supplierId = form.supplierId ? '' : 'Supplier is required';
  errors.amount = !form.amount || form.amount <= 0 ? 'Amount must be greater than 0' : '';
  errors.fundAccount = fundAccountKey.value ? '' : 'Select where the payment was made from';
  if (errors.supplierId || errors.amount || errors.fundAccount) return;

  const [fundAccountType, fundAccountId] = fundAccountKey.value.split(':');

  emit('submit', {
    supplierId: form.supplierId,
    tripId: form.tripId || undefined,
    billId: form.billId || undefined,
    amount: form.amount,
    paymentDate: form.paymentDate,
    paymentModeId: form.paymentModeId || undefined,
    referenceNumber: form.referenceNumber || undefined,
    remarks: form.remarks || undefined,
    fundAccountType,
    fundAccountId,
    isRetentionRelease: form.billId ? form.isRetentionRelease : undefined,
  });
}
</script>
