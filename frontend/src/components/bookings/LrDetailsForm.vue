<template>
  <div class="lr-form">
    <!-- Document identity -->
    <section>
      <h3 class="lr-form-heading">Document</h3>
      <div class="form-grid">
        <!-- Auto-issued at confirmation; editable so the system's number can be
             matched to a pre-printed LR pad or a mis-keyed entry corrected. -->
        <AppTextField
          v-model="form.lrNumber"
          label="LR Number"
          placeholder="MJT/26-27/0001"
          :error-messages="errors.lrNumber"
          :hint="lrNumberHint"
          persistent-hint
        />
        <AppTextField v-model="form.dispatchAt" label="Dispatch Date &amp; Time" type="datetime-local" :error-messages="errors.dispatchAt" />
        <AppSelect v-model="form.transportMode" :items="TRANSPORT_MODES" label="Transport Mode" placeholder="Select a mode" />
        <AppSelect v-model="form.paymentTerm" :items="PAYMENT_TERMS" label="Payment Term" placeholder="Select a term" />
      </div>
      <div v-if="lrNumberChanged" class="lr-form-warn">
        <AppIcon icon="mdi-alert-outline" size="small" />
        <span>
          Changing the LR number rewrites an identifier that may already have been quoted to the customer. The
          change is recorded on the booking's timeline.
        </span>
      </div>
    </section>

    <!-- Parties -->
    <section>
      <h3 class="lr-form-heading">Consignor</h3>
      <div class="form-grid">
        <AppTextField :model-value="booking.customerName || '—'" label="Consignor" readonly />
        <AppTextField v-model="form.consignorGstin" label="Consignor GSTIN" placeholder="33AADCV8760C1ZE" :error-messages="errors.consignorGstin" />
      </div>
    </section>

    <section>
      <h3 class="lr-form-heading">Consignee</h3>
      <div class="form-grid">
        <AppTextField
          v-model="form.consigneeName"
          label="Consignee Name"
          :placeholder="booking.toPlace ?? ''"
          hint="Leave blank to print the delivery place"
          persistent-hint
        />
        <AppTextField v-model="form.consigneePhone" label="Consignee Phone" :error-messages="errors.consigneePhone" />
        <AppTextField v-model="form.consigneeGstin" label="Consignee GSTIN" placeholder="33ABRFA4019K1ZC" :error-messages="errors.consigneeGstin" />
      </div>
      <AppTextarea
        v-model="form.consigneeAddress"
        label="Consignee Address"
        rows="2"
        :placeholder="booking.deliveryAddress ?? ''"
        class="mt-2"
      />
    </section>

    <!-- Goods -->
    <section>
      <div class="lr-form-section-head">
        <h3 class="lr-form-heading">Goods Details</h3>
        <AppBtn variant="text" size="small" prepend-icon="mdi-plus" @click="addGoodsRow">Add Row</AppBtn>
      </div>

      <p v-if="!form.goodsItems.length" class="text-caption text-medium-emphasis">
        No goods rows yet — the LR will print the booking's own parcel details
        ({{ booking.packages ?? 0 }} × {{ booking.parcelType || 'unspecified' }}) instead.
      </p>

      <div v-for="(row, index) in form.goodsItems" :key="index" class="lr-goods-row">
        <div class="goods-grid">
          <AppTextField v-model="row.invoiceNo" label="Invoice No." />
          <AppTextField v-model="row.invoiceDate" label="Invoice Date" type="date" />
          <AppTextField
            v-model="row.description"
            label="Description of Goods"
            :error-messages="goodsErrors[index]?.description"
          />
          <AppTextField v-model.number="row.units" label="No. of Units" type="number" min="0" />
          <AppTextField v-model.number="row.goodsValue" label="Goods Value (₹)" type="number" min="0" step="0.01" />
          <AppTextField v-model="row.ewayBillNo" label="E-Way Bill No." />
          <AppTextField v-model="row.ewayBillDate" label="E-Way Bill Date" type="date" />
        </div>
        <AppBtn
          variant="text"
          size="small"
          color="error"
          icon="mdi-delete-outline"
          class="lr-goods-remove"
          @click="form.goodsItems.splice(index, 1)"
        />
      </div>

      <p v-if="form.goodsItems.length > MAX_PRINTED_GOODS_ROWS" class="lr-form-warn mt-2">
        <AppIcon icon="mdi-information-outline" size="small" />
        <span>
          An LR is one sheet — only the first {{ MAX_PRINTED_GOODS_ROWS - 1 }} rows print, followed by a note
          covering the rest. The totals still include every row.
        </span>
      </p>
    </section>

    <!-- Money -->
    <section>
      <h3 class="lr-form-heading">Freight &amp; Charges</h3>
      <div class="form-grid">
        <AppTextField v-model.number="form.freightCharges" label="Freight Charges (₹)" type="number" min="0" step="0.01" />
        <AppTextField v-model.number="form.loadingCharges" label="Loading Charges (₹)" type="number" min="0" step="0.01" />
        <AppTextField v-model.number="form.unloadingCharges" label="Unloading Charges (₹)" type="number" min="0" step="0.01" />
        <AppTextField v-model.number="form.otherCharges" label="Other Charges (₹)" type="number" min="0" step="0.01" />
      </div>
      <div class="lr-form-total">
        <span>Total Freight</span>
        <strong>{{ formatCurrency(totalFreight) }}</strong>
      </div>
    </section>

    <section>
      <h3 class="lr-form-heading">Payment Details</h3>
      <div class="form-grid">
        <AppSelect
          v-model="form.freightPayment"
          :items="FREIGHT_PAYMENTS"
          item-title="title"
          item-value="value"
          label="Freight Payment"
          placeholder="Select"
        />
        <AppSelect v-model="form.billingParty" :items="PARTIES" item-title="title" item-value="value" label="Billing Party" placeholder="Select" />
        <AppSelect v-model="form.freightPayer" :items="PARTIES" item-title="title" item-value="value" label="Freight Payer" placeholder="Select" />
        <AppTextField v-model.number="form.advanceReceived" label="Advance Received (₹)" type="number" min="0" step="0.01" />
      </div>
      <div class="lr-form-total">
        <span>Balance Amount</span>
        <strong>{{ formatCurrency(balanceAmount) }}</strong>
      </div>
    </section>

    <section>
      <h3 class="lr-form-heading">Remarks</h3>
      <AppTextarea v-model="form.remarks" label="Remarks printed on the LR" rows="2" />
    </section>

    <div class="d-flex justify-end ga-2 mt-4">
      <AppBtn variant="text" @click="$emit('cancel')">Cancel</AppBtn>
      <AppBtn color="primary" variant="flat" :loading="loading" prepend-icon="mdi-content-save-outline" @click="onSubmit">
        Save LR Details
      </AppBtn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import { AppBtn, AppIcon, AppSelect, AppTextField, AppTextarea } from '@/components/ui';
import { formatCurrency } from '@/utils/format';
import type { Booking, LrDetailsPayload, GoodsItemPayload } from '@/types/bookings.types';

const props = defineProps<{ booking: Booking; loading?: boolean }>();
const emit = defineEmits<{ (e: 'submit', payload: LrDetailsPayload): void; (e: 'cancel'): void }>();

const TRANSPORT_MODES = ['ROAD', 'RAIL', 'AIR', 'SEA'];
// Commercial wording, printed verbatim. A picklist rather than free text so the
// same phrases come back on every LR.
const PAYMENT_TERMS = ['To Be Billed', 'To Pay', 'Paid', 'Credit 15 Days', 'Credit 30 Days', 'Credit 45 Days'];
const FREIGHT_PAYMENTS = [
  { title: 'To Pay', value: 'TO_PAY' },
  { title: 'Paid', value: 'PAID' },
  { title: 'To Be Billed', value: 'TO_BE_BILLED' },
];
const PARTIES = [
  { title: 'Consignor', value: 'CONSIGNOR' },
  { title: 'Consignee', value: 'CONSIGNEE' },
  { title: 'Third Party', value: 'THIRD_PARTY' },
];

/** Mirrors the cap in LrDocument.vue — kept here only to warn before saving. */
const MAX_PRINTED_GOODS_ROWS = 8;

const MOBILE_RE = /^[0-9+\s-]{7,15}$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Plain dates are stored at UTC midnight, so slicing the ISO string round-trips them exactly. */
function toDateInput(value: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

/**
 * A dispatch stamp is a real moment, not a calendar date — read it back in the
 * operator's own timezone so the box shows the time they typed.
 */
function toDateTimeInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

/** Decimals arrive from the API as strings; a missing value stays undefined so the box is blank. */
function toNumberInput(value: string | number | null): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const form = reactive({
  lrNumber: props.booking.lrNumber || '',
  dispatchAt: toDateTimeInput(props.booking.dispatchAt),
  transportMode: props.booking.transportMode || '',
  paymentTerm: props.booking.paymentTerm || '',

  consignorGstin: props.booking.consignorGstin || '',
  consigneeName: props.booking.consigneeName || '',
  consigneeAddress: props.booking.consigneeAddress || '',
  consigneePhone: props.booking.consigneePhone || '',
  consigneeGstin: props.booking.consigneeGstin || '',

  goodsItems: (props.booking.goodsItems ?? []).map((item) => ({
    invoiceNo: item.invoiceNo || '',
    invoiceDate: toDateInput(item.invoiceDate),
    description: item.description,
    units: toNumberInput(item.units) ?? 0,
    goodsValue: toNumberInput(item.goodsValue) ?? 0,
    ewayBillNo: item.ewayBillNo || '',
    ewayBillDate: toDateInput(item.ewayBillDate),
  })),

  freightCharges: toNumberInput(props.booking.freightCharges),
  loadingCharges: toNumberInput(props.booking.loadingCharges),
  unloadingCharges: toNumberInput(props.booking.unloadingCharges),
  otherCharges: toNumberInput(props.booking.otherCharges),

  freightPayment: props.booking.freightPayment || '',
  billingParty: props.booking.billingParty || '',
  freightPayer: props.booking.freightPayer || '',
  advanceReceived: toNumberInput(props.booking.advanceReceived),
  remarks: props.booking.remarks || '',
});

const errors = reactive<Record<string, string>>({
  lrNumber: '',
  dispatchAt: '',
  consignorGstin: '',
  consigneeGstin: '',
  consigneePhone: '',
});
const goodsErrors = ref<Record<number, { description?: string }>>({});

const lrNumberChanged = computed(() => form.lrNumber.trim() !== (props.booking.lrNumber || ''));
const lrNumberHint = computed(() =>
  lrNumberChanged.value ? 'Must be unique across all bookings' : 'Issued automatically — edit only if it must match your LR book'
);

// Mirrors the document: the itemised lines where they exist, the single agreed
// freight amount where they do not.
const totalFreight = computed(() => {
  const itemised =
    (form.freightCharges ?? 0) +
    (form.loadingCharges ?? 0) +
    (form.unloadingCharges ?? 0) +
    (form.otherCharges ?? 0);
  return itemised || Number(props.booking.freightAmount ?? 0);
});
const balanceAmount = computed(() => Math.max(totalFreight.value - (form.advanceReceived ?? 0), 0));

function addGoodsRow() {
  form.goodsItems.push({
    invoiceNo: '',
    invoiceDate: '',
    description: '',
    units: 0,
    goodsValue: 0,
    ewayBillNo: '',
    ewayBillDate: '',
  });
}

function validate(): boolean {
  for (const key of Object.keys(errors)) errors[key] = '';
  goodsErrors.value = {};
  let valid = true;

  if (!form.lrNumber.trim()) {
    errors.lrNumber = 'LR number is required';
    valid = false;
  }
  if (form.consignorGstin.trim() && !GSTIN_RE.test(form.consignorGstin.trim())) {
    errors.consignorGstin = 'Enter a valid 15-character GSTIN';
    valid = false;
  }
  if (form.consigneeGstin.trim() && !GSTIN_RE.test(form.consigneeGstin.trim())) {
    errors.consigneeGstin = 'Enter a valid 15-character GSTIN';
    valid = false;
  }
  if (form.consigneePhone.trim() && !MOBILE_RE.test(form.consigneePhone.trim())) {
    errors.consigneePhone = 'Enter a valid consignee phone number';
    valid = false;
  }

  form.goodsItems.forEach((row, index) => {
    if (!row.description.trim()) {
      goodsErrors.value[index] = { description: 'Describe the goods' };
      valid = false;
    }
  });

  return valid;
}

/** Empty string means "clear it" server-side, so blanks are sent as-is. */
function onSubmit() {
  if (!validate()) return;

  const goodsItems: GoodsItemPayload[] = form.goodsItems.map((row) => ({
    invoiceNo: row.invoiceNo.trim(),
    invoiceDate: row.invoiceDate || undefined,
    description: row.description.trim(),
    units: Number(row.units) || 0,
    goodsValue: Number(row.goodsValue) || 0,
    ewayBillNo: row.ewayBillNo.trim(),
    ewayBillDate: row.ewayBillDate || undefined,
  }));

  emit('submit', {
    lrNumber: form.lrNumber.trim(),
    dispatchAt: form.dispatchAt || '',
    transportMode: (form.transportMode || null) as LrDetailsPayload['transportMode'],
    paymentTerm: form.paymentTerm || '',

    consignorGstin: form.consignorGstin.trim(),
    consigneeName: form.consigneeName.trim(),
    consigneeAddress: form.consigneeAddress.trim(),
    consigneePhone: form.consigneePhone.trim(),
    consigneeGstin: form.consigneeGstin.trim(),

    freightCharges: form.freightCharges ?? null,
    loadingCharges: form.loadingCharges ?? null,
    unloadingCharges: form.unloadingCharges ?? null,
    otherCharges: form.otherCharges ?? null,

    freightPayment: (form.freightPayment || null) as LrDetailsPayload['freightPayment'],
    billingParty: (form.billingParty || null) as LrDetailsPayload['billingParty'],
    freightPayer: (form.freightPayer || null) as LrDetailsPayload['freightPayer'],
    advanceReceived: form.advanceReceived ?? null,
    remarks: form.remarks.trim(),

    goodsItems,
  });
}

/** Surfaces server-side field errors on the matching inputs. */
function setErrors(serverErrors: Record<string, string>) {
  for (const [key, message] of Object.entries(serverErrors)) {
    if (key in errors) errors[key] = message;
  }
}
defineExpose({ setErrors });
</script>

<style scoped>
.lr-form section + section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-divider);
}
.lr-form-heading {
  margin: 0 0 10px;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-medium);
}
.lr-form-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}
/* Seven narrow fields per row, wrapping on small screens. */
.goods-grid {
  flex: 1 1 auto;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}
.lr-goods-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 0;
}
.lr-goods-row + .lr-goods-row {
  border-top: 1px dashed var(--color-divider);
}
.lr-goods-remove {
  flex: 0 0 auto;
  margin-top: 22px;
}
.lr-form-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--color-divider);
  font-size: 0.9375rem;
}
.lr-form-warn {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  font-size: 0.75rem;
  color: var(--color-text-medium);
}
</style>
