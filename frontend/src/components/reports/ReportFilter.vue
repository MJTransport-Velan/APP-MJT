<template>
  <AppCard class="pa-4 mb-4">
    <div class="row row-dense">
      <div class="col-12 col-sm-6 col-md-3">
        <AppTextField
          :model-value="filters.search"
          label="Search"
          prepend-inner-icon="mdi-magnify"
          clearable
          @update:model-value="(v: string) => update('search', v)"
        />
      </div>

      <div class="col-12 col-sm-6 col-md-5">
        <DateRangePicker
          :from="filters.dateFrom"
          :to="filters.dateTo"
          @update:from="(v: string) => update('dateFrom', v)"
          @update:to="(v: string) => update('dateTo', v)"
          @change="$emit('apply')"
        />
      </div>

      <div v-if="companyOptions.length" class="col-6 col-sm-4 col-md-2">
        <AppSelect
          :model-value="filters.companyId"
          :items="companyOptions"
          item-title="name"
          item-value="id"
          label="Company"
          clearable
          @update:model-value="(v: string) => update('companyId', v)"
        />
      </div>
      <div v-if="supplierOptions.length" class="col-6 col-sm-4 col-md-2">
        <AppSelect
          :model-value="filters.supplierId"
          :items="supplierOptions"
          item-title="name"
          item-value="id"
          label="Supplier"
          clearable
          @update:model-value="(v: string) => update('supplierId', v)"
        />
      </div>
      <div v-if="vehicleOptions.length" class="col-6 col-sm-4 col-md-2">
        <AppSelect
          :model-value="filters.vehicleId"
          :items="vehicleOptions"
          item-title="registrationNumber"
          item-value="id"
          label="Vehicle"
          clearable
          @update:model-value="(v: string) => update('vehicleId', v)"
        />
      </div>
      <div v-if="driverOptions.length" class="col-6 col-sm-4 col-md-2">
        <AppSelect
          :model-value="filters.driverId"
          :items="driverOptions"
          item-title="name"
          item-value="id"
          label="Driver"
          clearable
          @update:model-value="(v: string) => update('driverId', v)"
        />
      </div>
      <div v-if="routeOptions.length" class="col-6 col-sm-4 col-md-2">
        <AppSelect
          :model-value="filters.routeId"
          :items="routeOptions"
          item-title="name"
          item-value="id"
          label="Route"
          clearable
          @update:model-value="(v: string) => update('routeId', v)"
        />
      </div>
      <div v-if="vehicleTypeOptions.length" class="col-6 col-sm-4 col-md-2">
        <AppSelect
          :model-value="filters.vehicleTypeId"
          :items="vehicleTypeOptions"
          item-title="name"
          item-value="id"
          label="Vehicle Type"
          clearable
          @update:model-value="(v: string) => update('vehicleTypeId', v)"
        />
      </div>
      <div class="col-6 col-sm-4 col-md-2">
        <AppSelect
          :model-value="filters.tripStatus"
          :items="tripStatusOptions"
          label="Trip Status"
          clearable
          @update:model-value="(v: string) => update('tripStatus', v)"
        />
      </div>
      <div class="col-6 col-sm-4 col-md-2">
        <AppSelect
          :model-value="filters.paymentStatus"
          :items="paymentStatusOptions"
          label="Payment Status"
          clearable
          @update:model-value="(v: string) => update('paymentStatus', v)"
        />
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { AppCard, AppTextField, AppSelect } from '@/components/ui';
import { AppDateRangePicker as DateRangePicker } from '@/components/ui';

export interface ReportFilterState {
  search: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  companyId: string | null;
  supplierId: string | null;
  vehicleId: string | null;
  driverId: string | null;
  routeId: string | null;
  vehicleTypeId: string | null;
  tripStatus: string | null;
  paymentStatus: string | null;
}

withDefaults(
  defineProps<{
    filters: ReportFilterState;
    companyOptions?: { id: string; name: string }[];
    supplierOptions?: { id: string; name: string }[];
    vehicleOptions?: { id: string; registrationNumber: string }[];
    driverOptions?: { id: string; name: string }[];
    routeOptions?: { id: string; name: string }[];
    vehicleTypeOptions?: { id: string; name: string }[];
  }>(),
  {
    companyOptions: () => [],
    supplierOptions: () => [],
    vehicleOptions: () => [],
    driverOptions: () => [],
    routeOptions: () => [],
    vehicleTypeOptions: () => [],
  }
);

const emit = defineEmits<{
  'update:filters': [filters: Partial<ReportFilterState>];
  apply: [];
}>();

const tripStatusOptions = [
  'DRAFT', 'PLANNED', 'APPROVED', 'ASSIGNED', 'STARTED', 'LOADING',
  'IN_TRANSIT', 'REACHED_DESTINATION', 'UNLOADING', 'COMPLETED', 'CANCELLED',
];
const paymentStatusOptions = ['DRAFT', 'GENERATED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'];

function update(key: keyof ReportFilterState, value: string) {
  emit('update:filters', { [key]: value || null });
  emit('apply');
}
</script>
