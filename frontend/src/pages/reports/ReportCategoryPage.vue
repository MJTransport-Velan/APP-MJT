<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6">{{ categoryLabel }}</h2>
        <p class="text-caption text-medium-emphasis mb-0">{{ store.label }}</p>
      </div>
      <div class="d-flex align-center ga-2">
        <AppSelect
          v-model="reportKey"
          :items="store.availableReports"
          item-title="label"
          item-value="key"
          label="Report"
          style="min-width: 260px"
          @update:model-value="onReportChanged"
        />
        <ExportButton :exporting="exporting" @export="onExport" @print="onPrint" />
      </div>
    </div>

    <ReportFilter
      :filters="filters"
      :company-options="companyOptions"
      :supplier-options="supplierOptions"
      :vehicle-options="vehicleOptions"
      :driver-options="driverOptions"
      :route-options="routeOptions"
      :vehicle-type-options="vehicleTypeOptions"
      @update:filters="onFiltersUpdate"
      @apply="onApplyFilters"
    />

    <!-- KPI Summary renders as a widget grid instead of a table -->
    <div v-if="isKpiSummary" class="row mb-4">
      <div v-for="row in store.rows" :key="String(row.metric)" class="col-6 col-sm-4 col-md-3">
        <KPIWidget :metric="String(row.metric)" :value="row.value as number" />
      </div>
    </div>

    <ReportTable
      v-else
      :columns="store.columns"
      :items="store.rows"
      :items-length="store.meta?.total || 0"
      :loading="store.loading"
      :page="page"
      :page-size="pageSize"
      @update:page="onPageUpdate"
      @update:page-size="onPageSizeUpdate"
    />

    <div v-if="charts.length > 0" class="row mt-4">
      <div
        v-for="chart in charts"
        :key="chart.title"
        class="col-12"
        :class="charts.length > 2 ? 'col-md-4' : 'col-md-6'"
      >
        <ChartCard :title="chart.title" :type="chart.type" :options="chart.options" :series="chart.series" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { AppSelect } from '@/components/ui';
import { useOperationsReportsStore, useFleetReportsStore, useAccountsReportsStore, useManagementReportsStore } from '@/stores/reports';
import { useVehicleStore, useDriverStore, useRouteStore, useVehicleTypeStore } from '@/stores/masters';
import { adminCompanyApi } from '@/services/admin-company.service';
import { supplierApi } from '@/services/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import ReportFilter, { type ReportFilterState } from '@/components/reports/ReportFilter.vue';
import ReportTable from '@/components/reports/ReportTable.vue';
import ExportButton from '@/components/reports/ExportButton.vue';
import ChartCard from '@/components/reports/ChartCard.vue';
import KPIWidget from '@/components/reports/KPIWidget.vue';
import { buildChartsForReport } from '@/config/reportCharts';
import type { ReportCategory } from '@/types/reports.types';

const props = defineProps<{ category: ReportCategory; label: string }>();

const storeMap = {
  operations: useOperationsReportsStore,
  fleet: useFleetReportsStore,
  accounts: useAccountsReportsStore,
  management: useManagementReportsStore,
};
const store = storeMap[props.category]();
const { error } = useSnackbar();

const categoryLabel = computed(() => props.label);
const reportKey = ref('');
const page = ref(1);
const pageSize = ref(10);
const exporting = ref(false);

const filters = reactive<ReportFilterState>({
  search: null,
  dateFrom: null,
  dateTo: null,
  companyId: null,
  supplierId: null,
  vehicleId: null,
  driverId: null,
  routeId: null,
  vehicleTypeId: null,
  tripStatus: null,
  paymentStatus: null,
});

const companyOptions = ref<{ id: string; name: string }[]>([]);
const supplierOptions = ref<{ id: string; name: string }[]>([]);
const vehicleOptions = ref<{ id: string; registrationNumber: string }[]>([]);
const driverOptions = ref<{ id: string; name: string }[]>([]);
const routeOptions = ref<{ id: string; name: string }[]>([]);
const vehicleTypeOptions = ref<{ id: string; name: string }[]>([]);

const isKpiSummary = computed(() => props.category === 'management' && reportKey.value === 'kpiSummaryReport');

const charts = computed(() => buildChartsForReport(props.category, reportKey.value, store.rows));

function buildParams() {
  const params: Record<string, unknown> = { report: reportKey.value, page: page.value, pageSize: pageSize.value };
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params[key] = value;
  });
  return params;
}

async function runReport() {
  if (!reportKey.value) return;
  try {
    await store.run(buildParams());
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load report'));
  }
}

function onReportChanged() {
  page.value = 1;
  runReport();
}

function onFiltersUpdate(partial: Partial<ReportFilterState>) {
  Object.assign(filters, partial);
}

function onApplyFilters() {
  page.value = 1;
  runReport();
}

function onPageUpdate(value: number) {
  page.value = value;
  runReport();
}

function onPageSizeUpdate(value: number) {
  pageSize.value = value;
  runReport();
}

async function onExport(format: 'xlsx' | 'pdf' | 'csv') {
  exporting.value = true;
  try {
    const exportFilters: Record<string, unknown> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) exportFilters[key] = value;
    });
    await store.exportFile(reportKey.value, format, exportFilters);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to export report'));
  } finally {
    exporting.value = false;
  }
}

async function onPrint() {
  try {
    const printFilters: Record<string, unknown> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) printFilters[key] = value;
    });
    await store.printReport(reportKey.value, printFilters);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to open print view'));
  }
}

onMounted(async () => {
  await store.fetchAvailable();
  if (store.availableReports.length > 0) {
    reportKey.value = store.availableReports[0].key;
  }

  const [companiesRes, suppliersRes] = await Promise.all([
    adminCompanyApi.list({ pageSize: 200 }),
    supplierApi.list({ pageSize: 200 }),
    useVehicleStore().fetchList({ pageSize: 200 }),
    useDriverStore().fetchList({ pageSize: 200 }),
    useRouteStore().fetchList({ pageSize: 200 }),
    useVehicleTypeStore().fetchList({ pageSize: 200 }),
  ]);
  companyOptions.value = companiesRes.data.data.map((c) => ({ id: c.id, name: c.name }));
  supplierOptions.value = suppliersRes.data.data.map((s: any) => ({ id: s.id, name: s.name }));
  vehicleOptions.value = useVehicleStore().items.map((v: any) => ({ id: v.id, registrationNumber: v.registrationNumber }));
  driverOptions.value = useDriverStore().items.map((d: any) => ({ id: d.id, name: d.name }));
  routeOptions.value = useRouteStore().items.map((r: any) => ({ id: r.id, name: r.name }));
  vehicleTypeOptions.value = useVehicleTypeStore().items.map((v: any) => ({ id: v.id, name: v.name }));

  runReport();
});
</script>
