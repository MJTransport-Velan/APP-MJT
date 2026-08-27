<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Driver Settlements</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openWizard">Generate Settlement</AppBtn>
    </div>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.meta?.total || 0" :loading="store.loading" :page="page" :page-size="pageSize" @update:page="onPageUpdate" @update:page-size="onPageSizeUpdate">
      <template #filters>
        <AppSelect v-model="statusFilter" :items="statusOptions" label="Status" clearable density="compact" hide-details @update:model-value="fetchData" />
      </template>
      <template #item.driver="{ item }">{{ (item as any).driver.name }}</template>
      <template #item.period="{ item }">{{ formatDate((item as any).periodStart) }} - {{ formatDate((item as any).periodEnd) }}</template>
      <template #item.netPayable="{ item }">
        <span :class="(item as any).netPayable >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency((item as any).netPayable) }}</span>
      </template>
      <template #item.status="{ item }"><AppChip size="small" :color="statusColor((item as any).status)">{{ (item as any).status }}</AppChip></template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-eye-outline" variant="text" size="small" @click="openDetail(item as any)" />
        <AppBtn
          v-if="(item as any).status !== 'PAID'"
          icon="mdi-delete-outline"
          variant="text"
          size="small"
          color="error"
          @click="openDeleteConfirm(item as any)"
        />
      </template>
    </MasterDataTable>

    <!-- Wizard: pick driver + period, preview, then create/calculate -->
    <AppDialog v-model="wizardDialog" max-width="560" persistent>
      <AppCard>
        <AppCardTitle class="text-h6">Generate Driver Settlement</AppCardTitle>
        <AppCardText>
          <AppSelect v-model="wizardForm.driverId" :items="driverOptions" item-title="name" item-value="id" label="Driver" :error-messages="wizardErrors.driverId" class="mb-2" @update:model-value="onPreview" />
          <AppSelect v-model="wizardForm.settlementType" :items="settlementTypeOptions" label="Settlement Type" class="mb-2" />
          <div class="d-flex ga-2">
            <AppTextField v-model="wizardForm.periodStart" type="date" label="Period Start" class="mb-2 flex-1-1" @update:model-value="onPreview" />
            <AppTextField v-model="wizardForm.periodEnd" type="date" label="Period End" class="mb-2 flex-1-1" @update:model-value="onPreview" />
          </div>

          <AppDivider class="my-3" />
          <div v-if="previewing" class="text-caption text-medium-emphasis">Computing preview...</div>
          <div v-else-if="preview">
            <AppTable density="compact" class="mb-2">
              <tbody>
                <tr v-for="(line, i) in preview.lines" :key="i">
                  <td>{{ line.description }}</td>
                  <td class="text-right" :class="line.direction === 'CREDIT' ? 'text-success' : 'text-error'">
                    {{ line.direction === 'CREDIT' ? '+' : '-' }}{{ formatCurrency(line.amount) }}
                  </td>
                </tr>
              </tbody>
            </AppTable>
            <div class="d-flex justify-space-between text-subtitle-1 font-weight-bold">
              <span>Net Payable</span>
              <span :class="preview.netPayable >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(preview.netPayable) }}</span>
            </div>
          </div>
          <p v-else class="text-caption text-medium-emphasis">Pick a driver and period to preview the settlement.</p>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <AppBtn variant="text" @click="wizardDialog = false">Cancel</AppBtn>
          <AppBtn color="primary" variant="flat" :loading="creating" @click="onCreateAndCalculate">Create &amp; Calculate</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <!-- Detail dialog with approve/pay actions -->
    <AppDialog v-model="detailDialog" max-width="560">
      <AppCard v-if="detailTarget">
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span class="text-h6">{{ detailTarget.settlementNumber }}</span>
          <AppBtn icon="mdi-close" variant="text" size="small" @click="detailDialog = false" />
        </AppCardTitle>
        <AppCardText>
          <div class="d-flex justify-space-between mb-3">
            <AppChip size="small" :color="statusColor(detailTarget.status)">{{ detailTarget.status }}</AppChip>
            <span class="text-caption text-medium-emphasis">{{ detailTarget.driver.name }}</span>
          </div>
          <AppTable density="compact" class="mb-3">
            <tbody>
              <tr v-for="line in detailTarget.lines" :key="line.id">
                <td>{{ line.description }}</td>
                <td class="text-right" :class="line.direction === 'CREDIT' ? 'text-success' : 'text-error'">
                  {{ line.direction === 'CREDIT' ? '+' : '-' }}{{ formatCurrency(line.amount) }}
                </td>
              </tr>
            </tbody>
          </AppTable>
          <div class="d-flex justify-space-between text-subtitle-1 font-weight-bold mb-3">
            <span>Net Payable</span>
            <span :class="detailTarget.netPayable >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(detailTarget.netPayable) }}</span>
          </div>
        </AppCardText>
        <AppCardActions>
          <div class="spacer"></div>
          <!-- Editing a settlement means putting it back to draft and
               recalculating: the lines are derived from the driver's
               advances, earnings and penalties, never typed in by hand. -->
          <AppBtn
            v-if="['CALCULATED', 'APPROVED'].includes(detailTarget.status)"
            variant="text"
            :loading="acting"
            @click="onRevert"
          >Revert to Draft</AppBtn>
          <AppBtn
            v-if="['DRAFT', 'CALCULATED'].includes(detailTarget.status)"
            variant="text"
            :loading="acting"
            @click="onRecalculate"
          >Recalculate</AppBtn>
          <AppBtn v-if="detailTarget.status === 'CALCULATED'" color="primary" variant="flat" :loading="acting" @click="onApprove">Approve</AppBtn>
          <AppBtn v-if="detailTarget.status === 'APPROVED'" color="primary" variant="flat" :loading="acting" @click="onPay">Pay</AppBtn>
        </AppCardActions>
      </AppCard>
    </AppDialog>

    <ConfirmDialog
      v-model="deleteDialog"
      title="Delete Settlement"
      :message="`Delete settlement ${deleteTarget?.settlementNumber}? The advances, earnings and penalties it claimed go back to unsettled.`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="submitDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useDriverSettlementStore } from '@/stores/accounts/driverPayroll';
import { driverApi } from '@/services/masters';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { formatCurrency } from '@/utils/format';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import { AppBtn, AppSelect, AppTextField, AppChip, AppDialog, AppCard, AppCardTitle, AppCardText, AppCardActions, AppDivider, AppTable } from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import type { DriverSettlement, DriverSettlementPreview } from '@/types/phase5.types';

const store = useDriverSettlementStore();
const { success, error } = useSnackbar();

const page = ref(1);
const pageSize = ref(10);
const statusFilter = ref<string | null>(null);
const statusOptions = ['DRAFT', 'CALCULATED', 'APPROVED', 'PAID'];
const settlementTypeOptions = ['PARTIAL', 'FINAL', 'EXIT', 'YEAR_END'];
const driverOptions = ref<{ id: string; name: string }[]>([]);

function statusColor(status: string) {
  return ({ PAID: 'success', APPROVED: 'info', CALCULATED: 'warning', DRAFT: 'default' } as Record<string, string>)[status] || 'info';
}
function formatDate(d: string) { return new Date(d).toLocaleDateString(); }

const headers = [
  { title: 'Settlement No.', key: 'settlementNumber', sortable: false },
  { title: 'Driver', key: 'driver', sortable: false },
  { title: 'Period', key: 'period', sortable: false },
  { title: 'Net Payable', key: 'netPayable', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

function onPageUpdate(v: number) { page.value = v; fetchData(); }
function onPageSizeUpdate(v: number) { pageSize.value = v; fetchData(); }
async function fetchData() {
  await store.fetchList({ page: page.value, pageSize: pageSize.value, status: statusFilter.value || undefined });
}

// --- Wizard ---
const wizardDialog = ref(false);
const creating = ref(false);
const previewing = ref(false);
const preview = ref<DriverSettlementPreview | null>(null);
const wizardForm = reactive({
  driverId: '',
  settlementType: 'PARTIAL',
  periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
  periodEnd: new Date().toISOString().slice(0, 10),
});
const wizardErrors = reactive({ driverId: '' });

function openWizard() {
  Object.assign(wizardForm, {
    driverId: '',
    settlementType: 'PARTIAL',
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
  });
  wizardErrors.driverId = '';
  preview.value = null;
  wizardDialog.value = true;
}

async function onPreview() {
  if (!wizardForm.driverId || !wizardForm.periodStart || !wizardForm.periodEnd) return;
  previewing.value = true;
  try {
    preview.value = await store.preview(wizardForm.driverId, wizardForm.periodStart, wizardForm.periodEnd);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to compute preview'));
  } finally {
    previewing.value = false;
  }
}

async function onCreateAndCalculate() {
  wizardErrors.driverId = wizardForm.driverId ? '' : 'Driver is required';
  if (wizardErrors.driverId) return;
  creating.value = true;
  try {
    const created = await store.create({
      driverId: wizardForm.driverId,
      settlementType: wizardForm.settlementType,
      periodStart: wizardForm.periodStart,
      periodEnd: wizardForm.periodEnd,
    });
    await store.calculate(created.id);
    success('Settlement created and calculated');
    wizardDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create settlement'));
  } finally {
    creating.value = false;
  }
}

// --- Detail / approve / pay ---
const detailDialog = ref(false);
const detailTarget = ref<DriverSettlement | null>(null);
const acting = ref(false);

async function openDetail(settlement: DriverSettlement) {
  detailTarget.value = await store.getById(settlement.id);
  detailDialog.value = true;
}
async function onRevert() {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.revert(detailTarget.value.id);
    success('Settlement reverted to draft');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to revert settlement'));
  } finally {
    acting.value = false;
  }
}

async function onRecalculate() {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.calculate(detailTarget.value.id);
    success('Settlement recalculated');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to recalculate settlement'));
  } finally {
    acting.value = false;
  }
}

async function onApprove() {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.approve(detailTarget.value.id);
    success('Settlement approved');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to approve settlement'));
  } finally {
    acting.value = false;
  }
}
async function onPay() {
  if (!detailTarget.value) return;
  acting.value = true;
  try {
    detailTarget.value = await store.pay(detailTarget.value.id);
    success('Settlement paid');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to pay settlement'));
  } finally {
    acting.value = false;
  }
}

const deleteDialog = ref(false);
const deleteTarget = ref<DriverSettlement | null>(null);
const deleting = ref(false);

function openDeleteConfirm(settlement: DriverSettlement) {
  deleteTarget.value = settlement;
  deleteDialog.value = true;
}

async function submitDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await store.remove(deleteTarget.value.id);
    success('Settlement deleted');
    deleteDialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete settlement'));
    deleteDialog.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  const driversRes = await driverApi.list({ pageSize: 200 });
  driverOptions.value = driversRes.data.data.map((d: any) => ({ id: d.id, name: `${d.name} (${d.code})` }));
  fetchData();
});
</script>
