<template>
  <AppDialog v-model="internalModel" max-width="480" persistent>
    <AppCard>
      <AppCardTitle class="text-h6">{{ isAllocation ? 'Allocate Receipt' : 'Receipt Entry' }}</AppCardTitle>
      <AppCardText>
        <template v-if="!isAllocation">
          <AppSelect
            v-model="form.companyId"
            :items="companyOptions"
            item-title="name"
            item-value="id"
            label="Company"
            :error-messages="errors.companyId"
            class="mb-2"
          />
          <AppSelect
            v-model="form.invoiceId"
            :items="invoiceOptions"
            item-title="invoiceNumber"
            item-value="id"
            label="Invoice (leave blank for advance)"
            clearable
            class="mb-2"
          />
          <AppTextField v-model.number="form.amount" type="number" label="Amount" :error-messages="errors.amount" class="mb-2" />
          <AppTextField v-model="form.receiptDate" type="date" label="Receipt Date" class="mb-2" />
          <AppSelect
            v-model="fundAccountKey"
            :items="fundAccountOptions"
            item-title="label"
            item-value="key"
            label="Received Into (Bank/Cash)"
            :error-messages="errors.fundAccount"
            class="mb-2"
          />
          <AppSelect v-model="form.paymentModeId" :items="paymentModeOptions" item-title="name" item-value="id" label="Payment Mode" clearable class="mb-2" />
          <AppTextField v-model="form.referenceNumber" label="Reference Number" class="mb-2" />
          <AppTextarea v-model="form.remarks" label="Remarks" rows="2" />
        </template>
        <template v-else>
          <AppSelect
            v-model="form.invoiceId"
            :items="invoiceOptions"
            item-title="invoiceNumber"
            item-value="id"
            label="Invoice"
            :error-messages="errors.invoiceId"
          />
        </template>
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
  AppBtn,
} from '@/components/ui';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    isAllocation?: boolean;
    companyOptions?: { id: string; name: string }[];
    invoiceOptions?: { id: string; invoiceNumber: string }[];
    paymentModeOptions?: { id: string; name: string }[];
    bankAccountOptions?: { id: string; accountHolderName: string; accountNumber: string }[];
    cashAccountOptions?: { id: string; label: string }[];
    loading?: boolean;
  }>(),
  {
    isAllocation: false,
    companyOptions: () => [],
    invoiceOptions: () => [],
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
  companyId: string;
  invoiceId: string;
  amount: number | undefined;
  receiptDate: string;
  paymentModeId: string;
  referenceNumber: string;
  remarks: string;
}>({
  companyId: '',
  invoiceId: '',
  amount: undefined,
  receiptDate: new Date().toISOString().substring(0, 10),
  paymentModeId: '',
  referenceNumber: '',
  remarks: '',
});
const errors = reactive({ companyId: '', amount: '', invoiceId: '', fundAccount: '' });

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      Object.assign(form, {
        companyId: '',
        invoiceId: '',
        amount: undefined,
        receiptDate: new Date().toISOString().substring(0, 10),
        paymentModeId: '',
        referenceNumber: '',
        remarks: '',
      });
      fundAccountKey.value = '';
      Object.assign(errors, { companyId: '', amount: '', invoiceId: '', fundAccount: '' });
    }
  }
);

function onCancel() {
  emit('cancel');
  internalModel.value = false;
}

function onSubmit() {
  if (props.isAllocation) {
    errors.invoiceId = form.invoiceId ? '' : 'Please select an invoice';
    if (errors.invoiceId) return;
    emit('submit', { invoiceId: form.invoiceId });
    return;
  }

  errors.companyId = form.companyId ? '' : 'Company is required';
  errors.amount = !form.amount || form.amount <= 0 ? 'Amount must be greater than 0' : '';
  errors.fundAccount = fundAccountKey.value ? '' : 'Select where the money was received into';
  if (errors.companyId || errors.amount || errors.fundAccount) return;

  const [fundAccountType, fundAccountId] = fundAccountKey.value.split(':');

  emit('submit', {
    companyId: form.companyId,
    invoiceId: form.invoiceId || undefined,
    amount: form.amount,
    receiptDate: form.receiptDate,
    paymentModeId: form.paymentModeId || undefined,
    referenceNumber: form.referenceNumber || undefined,
    remarks: form.remarks || undefined,
    fundAccountType,
    fundAccountId,
  });
}
</script>
