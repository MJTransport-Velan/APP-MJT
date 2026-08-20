<template>
  <div ref="root" class="lr-doc">
    <div class="lr-doc-header">
      <div class="lr-doc-brand">
        <img :src="logo" alt="MJ Express Logistics" />
        <div>
          <h2>MJ EXPRESS</h2>
          <span>LOGISTICS</span>
        </div>
      </div>
      <div class="doc-title">
        <h3>LORRY RECEIPT</h3>
        <p>Date: {{ formatDate(booking.lrGeneratedAt || booking.createdAt) }}</p>
      </div>
    </div>

    <div class="lr-doc-numbers">
      <div>
        <div class="label">LR Number</div>
        <div class="value">{{ booking.lrNumber || '-' }}</div>
      </div>
      <div>
        <div class="label">Booking Number</div>
        <div class="value">{{ booking.bookingNo }}</div>
      </div>
      <div>
        <div class="label">Tracking Number</div>
        <div class="value">{{ booking.trackingNumber || '-' }}</div>
      </div>
    </div>

    <div class="lr-doc-route">
      <div>
        <div class="label">From</div>
        <div class="value">{{ booking.fromPlace }}</div>
      </div>
      <div>
        <div class="label">To</div>
        <div class="value">{{ booking.toPlace }}</div>
      </div>
    </div>

    <div class="lr-doc-section">
      <h4>Consignor &amp; Consignee</h4>
      <div class="lr-doc-grid">
        <div>
          <div class="label">Consignor</div>
          <div class="value">{{ booking.customerName }}</div>
          <div class="value">{{ booking.mobile }}</div>
          <div class="value">{{ booking.pickupAddress }}</div>
        </div>
        <div>
          <div class="label">Consignee</div>
          <div class="value">{{ booking.toPlace }}</div>
          <div class="value">{{ booking.deliveryAddress }}</div>
        </div>
      </div>
    </div>

    <div class="lr-doc-section">
      <h4>Shipment Details</h4>
      <div class="lr-doc-grid cols-4">
        <div>
          <div class="label">Parcel Type</div>
          <div class="value">{{ booking.parcelType }}</div>
        </div>
        <div>
          <div class="label">Packages</div>
          <div class="value">{{ booking.packages }}</div>
        </div>
        <div>
          <div class="label">Weight (approx.)</div>
          <div class="value">{{ booking.weight }} kg</div>
        </div>
        <div>
          <div class="label">Pickup Date</div>
          <div class="value">{{ formatDate(booking.pickupDate) }}</div>
        </div>
      </div>
    </div>

    <div class="lr-doc-section">
      <h4>Vehicle Details</h4>
      <div class="lr-doc-grid cols-4">
        <div>
          <div class="label">Vehicle Type</div>
          <div class="value">{{ booking.vehicleTypeName || booking.vehicleTypeRequested }}</div>
        </div>
        <div>
          <div class="label">Vehicle Number</div>
          <div class="value">{{ booking.vehicleNumber || '-' }}</div>
        </div>
        <div>
          <div class="label">Driver Name</div>
          <div class="value">{{ booking.driverName || '-' }}</div>
        </div>
        <div>
          <div class="label">Driver Mobile</div>
          <div class="value">{{ booking.driverMobile || '-' }}</div>
        </div>
      </div>
    </div>

    <div v-if="booking.instructions" class="lr-doc-section">
      <h4>Special Instructions</h4>
      <div class="lr-doc-instructions">{{ booking.instructions }}</div>
    </div>

    <div class="lr-doc-sign">
      <div>Consignor Signature</div>
      <div>Receiver Signature</div>
    </div>

    <p class="lr-doc-note">This is a system-generated Lorry Receipt issued by MJ Express Logistics.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import logo from '@/assets/images/brand/mjx-logo.png';
import { ensureLrStyles } from './lrStyles';
import type { Booking } from '@/types/bookings.types';

defineProps<{ booking: Booking }>();

const root = ref<HTMLElement | null>(null);

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

onMounted(() => ensureLrStyles());

defineExpose({ root });
</script>
