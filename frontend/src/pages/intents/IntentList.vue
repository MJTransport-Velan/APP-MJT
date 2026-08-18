<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Intent Management</h2>
        <p class="text-caption text-medium-emphasis mb-0">Manage client requests and convert them into trips</p>
      </div>
      <AppBtn color="primary" prepend-icon="mdi-plus" :to="'/intents/create'">New Intent</AppBtn>
    </div>

    <div class="stat-grid mb-4">
      <AppCard
        v-for="card in statCards"
        :key="card.key"
        variant="outlined"
        class="stat-card"
        :class="{ 'stat-card--active': activeStat === card.key }"
        :style="{ borderColor: card.color, background: card.iconBg }"
        @click="onStatClick(card.key)"
      >
        <div class="pa-3">
          <div class="stat-card__label">{{ card.label }}</div>
          <div class="stat-card__value" :style="{ color: card.color }">{{ card.value }}</div>
        </div>
      </AppCard>
    </div>

    <MasterDataTable
      :headers="headers"
      :items="store.items"
      :items-length="store.meta?.total || 0"
      :loading="store.loading"
      :search="search"
      :page="page"
      :page-size="pageSize"
      export-filename="intent-list"
      :export-row-mapper="exportRowMapper"
      :on-export-all="exportAllIntents"
      @update:search="onSearchUpdate"
      @update:page="onPageUpdate"
      @update:page-size="onPageSizeUpdate"
    >
      <template #filters>
        <AppSelect v-model="statusFilter" :items="statusOptions" label="Status" clearable @update:model-value="onFilterChange" />
      </template>

      <template #item.intentNumber="{ item }">
        <div class="d-flex align-center ga-2">
          <span class="row-bar" :style="{ background: barColor((item as any).status) }"></span>
          <span class="font-weight-medium">{{ (item as any).intentNumber }}</span>
        </div>
      </template>
      <template #item.company="{ item }">{{ (item as any).company.name }}</template>
      <template #item.route="{ item }">
        <RouteInfoCard :from-label="(item as any).fromLocation.name" :to-label="(item as any).toLocation.name" />
      </template>
      <template #item.status="{ item }">
        <TripStatusChip :status="(item as any).status" />
      </template>
      <template #item.freightAmount="{ item }">
        {{ (item as any).freightAmount ? formatCurrency((item as any).freightAmount) : '-' }}
      </template>
      <template #item.createdBy="{ item }">{{ (item as any).createdBy?.fullName || '-' }}</template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-eye-outline" variant="text" size="small" @click="openDetail(item as any)" />
        <AppBtn
          v-if="(item as any).status === 'DRAFT'"
          icon="mdi-send-outline"
          variant="text"
          size="small"
          @click="onSubmitIntent(item as any)"
        />
        <AppBtn
          v-if="(item as any).status === 'SUBMITTED' && canApprove"
          icon="mdi-check-circle-outline"
          variant="text"
          size="small"
          @click="openApproveConfirm(item as any)"
        />
        <AppBtn
          v-if="(item as any).status === 'SUBMITTED' && canApprove"
          icon="mdi-close-circle-outline"
          variant="text"
          size="small"
          @click="openRejectDialog(item as any)"
        />
      </template>
    </MasterDataTable>

    <!-- Detail Dialog -->
    <AppDialog v-model="detailDialog" max-width="640">
      <AppCard v-if="detailTarget">
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span class="text-h6">{{ detailTarget.intentNumber }}</span>
          <AppBtn icon="mdi-close" variant="text" size="small" @click="detailDialog = false" />
        </AppCardTitle>
        <AppCardText>
          <div class="d-flex justify-space-between mb-4">
            <TripStatusChip :status="detailTarget.status" />
            <span class="text-caption text-medium-emphasis">{{ detailTarget.company.name }}</span>
          </div>
          <RouteInfoCard :from-label="detailTarget.fromLocation.name" :to-label="detailTarget.toLocation.name" />
          <AppDivider class="my-3" />
          <div class="row row-dense">
            <div class="col-6 text-body-2 mb-2">PO No.: {{ detailTarget.poNumber || '-' }}</div>
            <div class="col-6 text-body-2 mb-2">Material: {{ detailTarget.material?.name || '-' }}</div>
            <div class="col-6 text-body-2 mb-2">Weight: {{ detailTarget.quantityTon || '-' }} T</div>
            <div class="col-6 text-body-2 mb-2">Packages: {{ detailTarget.packages || '-' }}</div>
            <div class="col-6 text-body-2 mb-2">Volume: {{ detailTarget.volumeCbm || '-' }} CBM</div>
            <div class="col-6 text-body-2 mb-2">Load Mode: {{ detailTarget.loadMode === 'PART' ? 'Part Load' : 'Full Load' }}</div>
          </div>
          <div class="text-body-2 mb-2">Freight: {{ detailTarget.freightAmount ? formatCurrency(detailTarget.freightAmount) : '-' }}</div>
          <div v-if="detailTarget.fleetType" class="text-body-2 mb-2">
            Assigned Team: {{ detailTarget.fleetType === 'OWN' ? 'Own Vehicle Team' : 'Market Vehicle Team' }}
          </div>
          <div class="text-body-2 mb-2">Remarks: {{ detailTarget.remarks || '-' }}</div>
          <div v-if="detailTarget.rejectionReason" class="text-body-2 text-error">Rejection Reason: {{ detailTarget.rejectionReason }}</div>

          <AppDivider class="my-3" />
          <div class="text-subtitle-2 mb-2">Timeline</div>
          <AppTimeline density="compact" side="end">
            <AppTimelineItem size="small" dot-color="info">
              <div class="text-body-2">Created</div>
              <div class="text-caption text-medium-emphasis">{{ new Date(detailTarget.createdAt).toLocaleString() }}</div>
            </AppTimelineItem>
            <AppTimelineItem v-if="detailTarget.approvedAt" size="small" dot-color="success">
              <div class="text-body-2">Approved</div>
              <div class="text-caption text-medium-emphasis">{{ new Date(detailTarget.approvedAt).toLocaleString() }}</div>
            </AppTimelineItem>
          </AppTimeline>
        </AppCardText>
      </AppCard>
    </AppDialog>

    <AppDialog v-model="rejectDialog" max-width="420" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Reject Intent</AppCardTitle>
        <AppCardText>
          <AppTextarea v-model="rejectionReason" label="Rejection Reason" rows="3" />
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="rejectDialog = false">Cancel</AppBtn>
          <AppBtn color="error" variant="flat" :loading="rejecting" @click="submitReject">Reject</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <AuthorizeIntentDialog
      v-model="approveDialog"
      :intent="approveTarget"
      :loading="approving"
      @approve="submitApprove"
      @reject="onRejectFromAuthorization"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useIntentStore } from '@/stores/operations';
import { intentApi } from '@/services/operations';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import AuthorizeIntentDialog from '@/components/operations/AuthorizeIntentDialog.vue';
import TripStatusChip from '@/components/operations/TripStatusChip.vue';
import RouteInfoCard from '@/components/operations/RouteInfoCard.vue';
import {
  AppBtn,
  AppSelect,
  AppTextarea,
  AppDialog,
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppDivider,
  AppTimeline,
  AppTimelineItem,
} from '@/components/ui';
import type { FleetType, Intent } from '@/types/operations.types';

const store = useIntentStore();
const authStore = useAuthStore();
const route = useRoute();
const { success, error } = useSnackbar();

const canApprove = authStore.hasPermission('intent.approve');

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const statusFilter = ref<string | null>((route.query.status as string) || null);

const statusOptions = [
  { title: 'Draft', value: 'DRAFT' },
  { title: 'Pending', value: 'SUBMITTED' },
  { title: 'Approved', value: 'APPROVED' },
  { title: 'Converted', value: 'CONVERTED' },
  { title: 'Rejected', value: 'REJECTED' },
  { title: 'Cancelled', value: 'CANCELLED' },
];

const headers = [
  { title: 'Intent No.', key: 'intentNumber', sortable: false },
  { title: 'Client', key: 'company', sortable: false },
  { title: 'Route', key: 'route', sortable: false },
  { title: 'Freight', key: 'freightAmount', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Created By', key: 'createdBy', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false},
];

const STAT_META: { key: string; label: string; iconBg: string; color: string }[] = [
  { key: 'total', label: 'Total', iconBg: 'rgba(37,99,235,.08)', color: '#1d4ed8' },
  { key: 'DRAFT', label: 'Draft', iconBg: 'rgba(100,116,139,.08)', color: '#475569' },
  { key: 'SUBMITTED', label: 'Pending', iconBg: 'rgba(245,158,11,.1)', color: '#c2660a' },
  { key: 'APPROVED', label: 'Approved', iconBg: 'rgba(168,85,247,.1)', color: '#7e22ce' },
  { key: 'CONVERTED', label: 'Converted', iconBg: 'rgba(34,197,94,.1)', color: '#15803d' },
  { key: 'REJECTED', label: 'Rejected', iconBg: 'rgba(239,68,68,.1)', color: '#c81e1e' },
  { key: 'CANCELLED', label: 'Cancelled', iconBg: 'rgba(100,116,139,.08)', color: '#475569' },
];

const activeStat = computed(() => (statusFilter.value ? statusFilter.value : 'total'));

const statCards = computed(() =>
  STAT_META.map((m) => ({
    ...m,
    value: m.key === 'total' ? store.stats?.total ?? 0 : (store.stats as any)?.[m.key] ?? 0,
  }))
);

function barColor(status: string) {
  const found = STAT_META.find((m) => m.key === status);
  return found ? found.color : '#94a3b8';
}

function statusLabel(status: string) {
  return STAT_META.find((m) => m.key === status)?.label || status;
}

function exportRowMapper(item: Record<string, unknown>) {
  const intent = item as unknown as Intent;
  return {
    intentNumber: intent.intentNumber,
    company: intent.company.name,
    route: `${intent.fromLocation.name} -> ${intent.toLocation.name}`,
    freightAmount: intent.freightAmount || 0,
    status: statusLabel(intent.status),
    createdBy: intent.createdBy?.fullName || '-',
  };
}

async function exportAllIntents() {
  const response = await intentApi.list({
    pageSize: 5000,
    search: search.value || undefined,
    status: statusFilter.value || undefined,
  });
  return response.data.data as unknown as Record<string, unknown>[];
}

function onStatClick(key: string) {
  statusFilter.value = key === 'total' ? null : key;
  page.value = 1;
  fetchData();
}

let debounceTimer: ReturnType<typeof setTimeout>;
function onSearchUpdate(value: string) {
  search.value = value;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    fetchData();
  }, 350);
}
function onPageUpdate(v: number) {
  page.value = v;
  fetchData();
}
function onPageSizeUpdate(v: number) {
  pageSize.value = v;
  fetchData();
}
function onFilterChange() {
  page.value = 1;
  fetchData();
}
async function fetchData() {
  await store.fetchList({
    page: page.value,
    pageSize: pageSize.value,
    search: search.value || undefined,
    status: statusFilter.value || undefined,
  });
}

async function onSubmitIntent(intent: Intent) {
  try {
    await store.submit(intent.id);
    success('Intent submitted for approval');
    refresh();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to submit intent'));
  }
}

// --- Detail ---
const detailDialog = ref(false);
const detailTarget = ref<Intent | null>(null);
function openDetail(intent: Intent) {
  detailTarget.value = intent;
  detailDialog.value = true;
}

// --- Approve ---
const approveDialog = ref(false);
const approveTarget = ref<Intent | null>(null);
const approving = ref(false);
function openApproveConfirm(intent: Intent) {
  approveTarget.value = intent;
  approveDialog.value = true;
}
async function submitApprove(opsAmount: number, fleetType: FleetType) {
  if (!approveTarget.value) return;
  approving.value = true;
  try {
    await store.approve(approveTarget.value.id, opsAmount, fleetType);
    success(
      `Intent approved — trip added to ${fleetType === 'OWN' ? 'Own Vehicle' : 'Market Vehicle'} team's trip list`
    );
    approveDialog.value = false;
    refresh();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to approve intent'));
  } finally {
    approving.value = false;
  }
}

function onRejectFromAuthorization() {
  if (!approveTarget.value) return;
  approveDialog.value = false;
  openRejectDialog(approveTarget.value);
}

// --- Reject ---
const rejectDialog = ref(false);
const rejectTarget = ref<Intent | null>(null);
const rejectionReason = ref('');
const rejecting = ref(false);
function openRejectDialog(intent: Intent) {
  rejectTarget.value = intent;
  rejectionReason.value = '';
  rejectDialog.value = true;
}
async function submitReject() {
  if (!rejectTarget.value || !rejectionReason.value.trim()) {
    error('Please provide a rejection reason');
    return;
  }
  rejecting.value = true;
  try {
    await store.reject(rejectTarget.value.id, rejectionReason.value);
    success('Intent rejected');
    rejectDialog.value = false;
    refresh();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to reject intent'));
  } finally {
    rejecting.value = false;
  }
}

function refresh() {
  fetchData();
  store.fetchStats();
}

onMounted(() => {
  refresh();
});
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.stat-card {
  cursor: pointer;
  border-width: 2px !important;
  border-radius: 10px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-1);
}
.stat-card--active {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.06);
}
.stat-card__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-medium);
  margin-bottom: 6px;
}
.stat-card__value {
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}
.row-bar {
  width: 4px;
  height: 20px;
  border-radius: 2px;
  display: inline-block;
}
</style>
