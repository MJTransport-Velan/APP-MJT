<template>
  <div ref="root" class="lr-doc">
    <!-- Header: logo, letterhead, and the document's own identity -->
    <header class="lr-head">
      <div class="lr-head-logo">
        <img :src="logoUrl" :alt="COMPANY.name" />
      </div>
      <div class="lr-head-brand">
        <h1>{{ COMPANY.name }}</h1>
        <p v-for="line in COMPANY.addressLines" :key="line">{{ line }}</p>
        <p>{{ COMPANY.contact }}</p>
        <p class="lr-gstin">{{ COMPANY.gstin }}</p>
      </div>
      <dl class="lr-head-meta">
        <dt>LR No.</dt>
        <dd>{{ booking.lrNumber || '-' }}</dd>
        <dt>LR Date</dt>
        <dd>{{ formatDate(booking.lrGeneratedAt || booking.createdAt) }}</dd>
        <dt>From</dt>
        <dd>{{ dash(booking.fromPlace) }}</dd>
        <dt>To</dt>
        <dd>{{ dash(booking.toPlace) }}</dd>
      </dl>
    </header>

    <!-- Vehicle strip -->
    <table class="lr-table">
      <thead>
        <tr>
          <th>Vehicle Number</th>
          <th>Driver Number</th>
          <th>Vehicle Type</th>
          <th>Transport Mode</th>
          <th>Payment Term</th>
          <th>Dispatch Date &amp; Time</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ dash(booking.vehicleNumber) }}</td>
          <td>{{ dash(booking.driverMobile) }}</td>
          <td>{{ dash(booking.vehicleTypeName || booking.vehicleTypeRequested) }}</td>
          <td>{{ dash(booking.transportMode) }}</td>
          <td>{{ dash(booking.paymentTerm) }}</td>
          <td>{{ formatDateTime(booking.dispatchAt) }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Consignor / consignee -->
    <div class="lr-parties">
      <section class="lr-party">
        <h2>CONSIGNOR (FROM)</h2>
        <div class="lr-party-name">{{ consignor.name }}</div>
        <div class="lr-party-address">{{ consignor.address }}</div>
        <div class="lr-party-contact">
          <div>Phone: {{ consignor.phone }}</div>
          <div>GSTIN: {{ consignor.gstin }}</div>
        </div>
      </section>
      <section class="lr-party">
        <h2>CONSIGNEE (TO)</h2>
        <div class="lr-party-name">{{ consignee.name }}</div>
        <div class="lr-party-address">{{ consignee.address }}</div>
        <div class="lr-party-contact">
          <div>Phone: {{ consignee.phone }}</div>
          <div>GSTIN: {{ consignee.gstin }}</div>
        </div>
      </section>
    </div>

    <!-- Goods details -->
    <table class="lr-table lr-goods">
      <thead>
        <tr>
          <th class="lr-goods-title" colspan="7">GOODS DETAILS</th>
        </tr>
        <tr>
          <th>Invoice No.</th>
          <th>Invoice Date</th>
          <th>Description of Goods</th>
          <th>No. of Units</th>
          <th>Goods Value (₹)</th>
          <th>E-Way Bill No.</th>
          <th>E-Way Bill Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in visibleGoodsRows" :key="index">
          <td>{{ row.invoiceNo }}</td>
          <td>{{ row.invoiceDate }}</td>
          <td class="lr-goods-desc">{{ row.description }}</td>
          <td>{{ row.units }}</td>
          <td>{{ formatAmount(row.goodsValue) }}</td>
          <td>{{ row.ewayBillNo }}</td>
          <td>{{ row.ewayBillDate }}</td>
        </tr>
        <tr v-if="hiddenGoodsCount" class="lr-goods-overflow">
          <td colspan="7">
            + {{ hiddenGoodsCount }} more item{{ hiddenGoodsCount === 1 ? '' : 's' }} — see the attached invoice
            list. Totals below cover all items.
          </td>
        </tr>
        <tr class="lr-goods-total">
          <td></td>
          <td></td>
          <td class="lr-goods-desc">Total:</td>
          <td>{{ totalUnits }}</td>
          <td>{{ formatAmount(totalGoodsValue) }}</td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <!-- Freight & payment -->
    <div class="lr-money">
      <section class="lr-money-box">
        <h2>FREIGHT &amp; CHARGES</h2>
        <div class="lr-money-body">
          <div v-for="charge in charges" :key="charge.label" class="lr-charge">
            <span>{{ charge.label }}</span>
            <span class="lr-amount">₹ {{ formatAmount(charge.amount) }}</span>
          </div>
          <div class="lr-charge lr-charge-total">
            <span>TOTAL FREIGHT</span>
            <span class="lr-amount">₹ {{ formatAmount(totalFreight) }}</span>
          </div>
        </div>
      </section>
      <section class="lr-money-box">
        <h2>PAYMENT DETAILS</h2>
        <div class="lr-money-body">
          <div class="lr-payment">
            <template v-for="row in paymentRows" :key="row.label">
              <div>{{ row.label }}</div>
              <div>:</div>
              <div>{{ row.value }}</div>
            </template>
          </div>
        </div>
      </section>
    </div>

    <!-- Remarks -->
    <div class="lr-remarks">
      <strong>Remarks:</strong>
      <span>{{ remarks }}</span>
    </div>

    <!-- The document ends at the remarks box. Everything below is deliberately
         empty: the sheet keeps room for a signature or stamp added by hand
         after printing. -->
    <div class="lr-blank"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import logoAsset from '@/assets/images/brand/MJ-Transport image.png';
import { ensureLrStyles } from './lrStyles';
import type { Booking } from '@/types/bookings.types';

const props = defineProps<{ booking: Booking }>();

const root = ref<HTMLElement | null>(null);

/**
 * The transporter's own letterhead. Hard-coded rather than read from the
 * Organization record, which carries only a code and a name — see the matching
 * block in backend/src/utils/lrPdf.util.ts, which must stay identical to this
 * one. The on-screen LR and the downloaded PDF are the same document.
 */
const COMPANY = {
  name: 'MJ TRANSPORT',
  addressLines: ['6/123 K, Ishwarya Nagar, Pattanam Road,', 'Coimbatore - 641016, Tamil Nadu, India'],
  contact: 'Phone: +91 82209 26327   |   Email: mjtransport1246@gmail.com',
  gstin: 'GSTIN: 33HORPK1759G1ZJ',
};

/**
 * Printing clones this node into a detached window whose base URL is
 * about:blank, where the bundler's root-relative asset path would not resolve.
 * Absolute from the start, so the logo survives the copy.
 */
const logoUrl = new URL(logoAsset, window.location.origin).href;

/**
 * The printed sheet has room for a limited number of goods rows. The PDF
 * enforces this by measurement; here it is a fixed cap chosen to match what
 * fits on A4, with the same explicit short-fall note so neither version can
 * silently drop an invoice.
 */
const MAX_PRINTED_GOODS_ROWS = 8;

const FREIGHT_PAYMENT_LABELS: Record<string, string> = {
  TO_PAY: 'To Pay',
  PAID: 'Paid',
  TO_BE_BILLED: 'To Be Billed',
};
const PARTY_LABELS: Record<string, string> = {
  CONSIGNOR: 'Consignor',
  CONSIGNEE: 'Consignee',
  THIRD_PARTY: 'Third Party',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  return `${formatDate(value)} ${time}`;
}

/** Decimals arrive from the API as strings; null and undefined both mean zero. */
function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function label(map: Record<string, string>, value: string | null | undefined): string {
  return value ? map[value] ?? value : '-';
}

/**
 * Every booking detail is optional — a consignment is routinely booked before
 * its weight, address or parcel type is known. An unknown field prints as a
 * dash so the box reads as deliberately blank rather than broken, and so the
 * printed sheet has somewhere to write the value in by hand.
 */
function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const text = String(value).trim();
  return text || '-';
}

// The consignee is a party in its own right but optional on the record — fall
// back to the delivery details the booking already carries so the box is never
// blank.
const consignee = computed(() => ({
  name: dash(props.booking.consigneeName || props.booking.toPlace),
  address: dash(props.booking.consigneeAddress || props.booking.deliveryAddress),
  phone: dash(props.booking.consigneePhone),
  gstin: dash(props.booking.consigneeGstin),
}));

/** Consignor identity comes from the booking's own customer fields. */
const consignor = computed(() => ({
  name: dash(props.booking.customerName),
  address: dash(props.booking.pickupAddress),
  phone: dash(props.booking.mobile),
  gstin: dash(props.booking.consignorGstin),
}));

// Before anyone keys in invoices, the booking's own parcel details are still
// the truth about what is moving — show them as a single row rather than an
// empty table.
const goodsRows = computed(() => {
  if (props.booking.goodsItems?.length) {
    return props.booking.goodsItems.map((item) => ({
      invoiceNo: item.invoiceNo || '-',
      invoiceDate: formatDate(item.invoiceDate),
      description: item.description,
      units: item.units,
      goodsValue: num(item.goodsValue),
      ewayBillNo: item.ewayBillNo || '-',
      ewayBillDate: formatDate(item.ewayBillDate),
    }));
  }
  return [
    {
      invoiceNo: '-',
      invoiceDate: '-',
      description: dash(props.booking.parcelType),
      units: props.booking.packages ?? 0,
      goodsValue: 0,
      ewayBillNo: '-',
      ewayBillDate: '-',
    },
  ];
});

const visibleGoodsRows = computed(() =>
  goodsRows.value.length > MAX_PRINTED_GOODS_ROWS
    ? goodsRows.value.slice(0, MAX_PRINTED_GOODS_ROWS - 1)
    : goodsRows.value
);
const hiddenGoodsCount = computed(() => goodsRows.value.length - visibleGoodsRows.value.length);

// Totals always cover every row, including any the sheet has no room to print.
const totalUnits = computed(() => goodsRows.value.reduce((sum, row) => sum + row.units, 0));
const totalGoodsValue = computed(() => goodsRows.value.reduce((sum, row) => sum + row.goodsValue, 0));

const charges = computed(() => [
  { label: 'Freight Charges', amount: num(props.booking.freightCharges) },
  { label: 'Loading Charges', amount: num(props.booking.loadingCharges) },
  { label: 'Unloading Charges', amount: num(props.booking.unloadingCharges) },
  { label: 'Other Charges', amount: num(props.booking.otherCharges) },
]);

// The four charge lines are the LR's itemised view; freightAmount is the single
// agreed price Operations works from. Where nothing has been itemised yet, fall
// back to that so the document still shows a figure.
const totalFreight = computed(() => {
  const itemised = charges.value.reduce((sum, charge) => sum + charge.amount, 0);
  return itemised || num(props.booking.freightAmount);
});

const paymentRows = computed(() => {
  const advance = num(props.booking.advanceReceived);
  return [
    { label: 'Freight Payment', value: label(FREIGHT_PAYMENT_LABELS, props.booking.freightPayment) },
    { label: 'Payment Terms', value: props.booking.paymentTerm || '-' },
    { label: 'Billing Party', value: label(PARTY_LABELS, props.booking.billingParty) },
    { label: 'Freight Payer', value: label(PARTY_LABELS, props.booking.freightPayer) },
    { label: 'Advance Received', value: `₹ ${formatAmount(advance)}` },
    { label: 'Balance Amount', value: `₹ ${formatAmount(Math.max(totalFreight.value - advance, 0))}` },
  ];
});

// `remarks` is what the operator wrote for the document; `instructions` is what
// the customer wrote at booking. Prefer the former, fall back to the latter,
// and leave the box empty for a handwritten note when there is neither.
const remarks = computed(() => props.booking.remarks || props.booking.instructions || '');

onMounted(() => ensureLrStyles());

defineExpose({ root });
</script>
