<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Balance Sheet</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          What MJ Transport owns, owes, and its net financial position — as of {{ formatDate(asOfDate) }}
        </p>
      </div>
      <div class="d-flex flex-wrap align-center ga-2">
        <AppSelect
          v-model="fyPick"
          :items="fyOptions"
          label="Financial Year"
          density="compact"
          hide-details
          style="min-width: 170px"
          @update:model-value="onFyPick"
        />
        <AppTextField v-model="asOfDate" type="date" label="As of Date" density="compact" hide-details style="max-width: 160px" :max="todayStr" @update:model-value="onCustomDate" />
        <AppBtn variant="outlined" size="small" @click="setToday">Today</AppBtn>
        <AppBtn variant="outlined" size="small" prepend-icon="mdi-refresh" :loading="loading" @click="load">Refresh</AppBtn>
        <AppBtn variant="outlined" size="small" prepend-icon="mdi-file-excel-outline" :loading="exporting" :disabled="!result" @click="onExport">Export</AppBtn>
      </div>
    </div>

    <div v-if="loading && !result" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="result">
      <AppAlert v-if="!result.reconciliation.reconciled" type="error" class="mb-4">
        Financial position does not reconcile — Assets ({{ formatCurrency(result.totalAssets) }}) vs Liabilities + Net Position
        ({{ formatCurrency(result.totalLiabilities + result.netPosition) }}), difference {{ formatCurrency(result.reconciliation.difference) }}.
      </AppAlert>

      <div class="row mb-1">
        <div class="col-12 col-sm-4"><ProfitCard label="Total Assets" :value="result.totalAssets" icon="mdi-scale-balance" color="success" /></div>
        <div class="col-12 col-sm-4"><ProfitCard label="Total Liabilities" :value="result.totalLiabilities" icon="mdi-cash-remove" color="error" /></div>
        <div class="col-12 col-sm-4"><ProfitCard label="Net Position" :value="result.netPosition" icon="mdi-chart-donut" color="primary" color-by-value /></div>
      </div>

      <AppCard class="pa-4 mb-4">
        <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
          <span>Assets vs Liabilities + Net Position</span>
          <span>{{ formatCurrency(result.totalAssets) }}</span>
        </div>
        <div class="bs-bar">
          <div class="bs-bar__seg" :style="{ width: liabilitiesPct + '%', background: 'var(--color-error)' }" :title="`Liabilities ${formatCurrency(result.totalLiabilities)}`" />
          <div
            v-if="result.netPosition >= 0"
            class="bs-bar__seg"
            :style="{ width: netPct + '%', background: 'var(--color-primary)' }"
            :title="`Net Position ${formatCurrency(result.netPosition)}`"
          />
        </div>
        <div v-if="result.netPosition < 0" class="text-caption text-error mt-1">
          Liabilities exceed Assets by {{ formatCurrency(-result.netPosition) }}
        </div>
        <div class="d-flex ga-4 mt-2 text-caption">
          <span><span class="bs-dot" style="background: var(--color-error)" /> Liabilities</span>
          <span><span class="bs-dot" style="background: var(--color-primary)" /> Net Position</span>
        </div>
      </AppCard>

      <div class="row">
        <div class="col-12 col-md-6">
          <AppCard class="pa-4">
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="text-subtitle-1 font-weight-bold">Assets</div>
              <div class="text-subtitle-1 font-weight-bold">{{ formatCurrency(result.totalAssets) }}</div>
            </div>
            <div
              v-for="line in assetLines"
              :key="line.key"
              class="bs-row"
              :class="{ 'bs-row--disabled': line.disabled }"
              @click="!line.disabled && openSection(line.key, line.label)"
            >
              <span class="d-flex align-center ga-2">
                <AppIcon :icon="line.icon" size="small" class="text-medium-emphasis" />
                <span>{{ line.label }}</span>
              </span>
              <span class="d-flex align-center ga-1">
                <span class="font-weight-medium">{{ formatCurrency(result.assets[line.key]) }}</span>
                <AppIcon v-if="!line.disabled" icon="mdi-chevron-right" size="small" class="text-medium-emphasis" />
              </span>
            </div>
            <div class="d-flex justify-space-between font-weight-bold pt-2 mt-1 bs-total-row">
              <span>Total Assets</span><span>{{ formatCurrency(result.totalAssets) }}</span>
            </div>
          </AppCard>

          <AppCard class="pa-4 mt-4">
            <div class="text-subtitle-2 mb-2">Asset Composition</div>
            <div class="bs-comp-bar">
              <div v-for="seg in assetComposition" :key="seg.key" class="bs-comp-bar__seg" :style="{ width: seg.pct + '%', background: seg.color }" :title="`${seg.label} ${formatCurrency(seg.value)}`" />
            </div>
            <div class="bs-legend mt-2">
              <div v-for="seg in assetComposition" :key="seg.key" class="d-flex justify-space-between text-caption mb-1">
                <span><span class="bs-dot" :style="{ background: seg.color }" /> {{ seg.label }}</span>
                <span>{{ formatCurrency(seg.value) }} ({{ seg.pct.toFixed(1) }}%)</span>
              </div>
            </div>
          </AppCard>
        </div>

        <div class="col-12 col-md-6">
          <AppCard class="pa-4">
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="text-subtitle-1 font-weight-bold">Liabilities</div>
              <div class="text-subtitle-1 font-weight-bold">{{ formatCurrency(result.totalLiabilities) }}</div>
            </div>
            <div
              v-for="line in liabilityLines"
              :key="line.key"
              class="bs-row"
              :class="{ 'bs-row--disabled': line.disabled }"
              @click="!line.disabled && openSection(line.key, line.label)"
            >
              <span class="d-flex align-center ga-2">
                <AppIcon :icon="line.icon" size="small" class="text-medium-emphasis" />
                <span>{{ line.label }}</span>
              </span>
              <span class="d-flex align-center ga-1">
                <span class="font-weight-medium">{{ formatCurrency(result.liabilities[line.key]) }}</span>
                <AppIcon v-if="!line.disabled" icon="mdi-chevron-right" size="small" class="text-medium-emphasis" />
              </span>
            </div>
            <div class="d-flex justify-space-between font-weight-bold pt-2 mt-1 bs-total-row">
              <span>Total Liabilities</span><span>{{ formatCurrency(result.totalLiabilities) }}</span>
            </div>
          </AppCard>

          <AppCard class="pa-4 mt-4">
            <div class="text-subtitle-2 mb-2">Notes &amp; Limitations</div>
            <ul class="bs-notes">
              <li v-for="(note, i) in result.limitations" :key="i">{{ note }}</li>
            </ul>
          </AppCard>
        </div>
      </div>
    </template>

    <!-- Section breakdown — clicking a line item opens its breakdown here, instead of an inline expand. -->
    <AppDialog v-model="sectionDialog.open" max-width="640">
      <AppCardTitle class="d-flex justify-space-between align-center">
        {{ sectionDialog.title }}
        <AppBtn icon="mdi-close" variant="text" size="small" @click="sectionDialog.open = false" />
      </AppCardTitle>
      <AppCardText>
        <div v-for="(group, gi) in sectionDialog.groups" :key="gi" class="mb-4">
          <div class="text-caption font-weight-bold text-medium-emphasis mb-1">{{ group.title }} ({{ group.rows.length }})</div>
          <p v-if="group.rows.length === 0" class="text-caption text-medium-emphasis">No data.</p>
          <div v-else class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Name</th><th class="text-right">Amount</th></tr></thead>
              <tbody>
                <tr
                  v-for="row in group.rows"
                  :key="row.id"
                  :class="{ 'bs-row-clickable': group.partyType }"
                  @click="group.partyType && openParty(group.partyType, row.id, row.name, sectionDialog.title)"
                >
                  <td>{{ row.name }}</td>
                  <td class="text-right">{{ formatCurrency(row.amount) }}</td>
                </tr>
              </tbody>
            </AppTable>
          </div>
        </div>
      </AppCardText>
    </AppDialog>

    <!-- Party detail — the existing Customer/Supplier/Driver/Employee financial state. -->
    <AppDialog v-model="partyDialog.open" max-width="480">
      <AppCardTitle class="d-flex justify-space-between align-center">
        <span class="d-flex align-center ga-1">
          <AppBtn v-if="partyDialog.back" icon="mdi-arrow-left" variant="text" size="small" @click="backToSection" />
          {{ partyDialog.title }}
        </span>
        <AppBtn icon="mdi-close" variant="text" size="small" @click="partyDialog.open = false" />
      </AppCardTitle>
      <AppCardText>
        <div v-if="partyDialog.loading" class="d-flex justify-center pa-4"><AppProgressCircular indeterminate color="primary" size="32" /></div>
        <template v-else>
          <div v-for="(row, i) in partyDialog.rows" :key="i" class="d-flex justify-space-between text-body-2 mb-1">
            <span class="text-medium-emphasis">{{ row.label }}</span><span>{{ formatCurrency(row.value) }}</span>
          </div>
          <p v-if="partyDialog.rows.length === 0" class="text-caption text-medium-emphasis">No data.</p>
        </template>
      </AppCardText>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { balanceSheetApi } from '@/services/accounts/balanceSheet';
import { financialStateApi } from '@/services/accounts/financialEntry';
import { capitalTransactionApi } from '@/services/accounts/capitalTransaction';
import { formatCurrency, localDateStr } from '@/utils/format';
import { exportRowsToExcel } from '@/utils/exportExcel';
import { useSnackbar } from '@/composables/useSnackbar';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import { AppCard, AppCardTitle, AppCardText, AppProgressCircular, AppAlert, AppBtn, AppTextField, AppSelect, AppDialog, AppTable, AppIcon } from '@/components/ui';
import type { BalanceSheetResult, NamedAmountRow, BalanceSheetAssets, BalanceSheetLiabilities } from '@/types/balanceSheet.types';

type PartyType = 'customer' | 'supplier' | 'driver' | 'employee' | 'capitalPartner';
interface SectionGroup {
  title: string;
  partyType: PartyType | null;
  rows: NamedAmountRow[];
}

const { success, error: showError } = useSnackbar();

const assetLines: { key: keyof BalanceSheetAssets; label: string; icon: string; disabled?: boolean }[] = [
  { key: 'bankAndCash', label: 'Bank & Cash', icon: 'mdi-bank-outline' },
  { key: 'customerReceivables', label: 'Customer Receivables', icon: 'mdi-account-cash-outline' },
  { key: 'advancesRecoverable', label: 'Advances Recoverable', icon: 'mdi-cash-fast' },
  { key: 'fixedAssets', label: 'Vehicle / Fixed Assets', icon: 'mdi-truck-outline' },
  { key: 'otherAssets', label: 'Other Assets', icon: 'mdi-shape-outline', disabled: true },
];
const liabilityLines: { key: keyof BalanceSheetLiabilities; label: string; icon: string; disabled?: boolean }[] = [
  { key: 'capitalAccount', label: 'Capital Account', icon: 'mdi-account-cash-outline' },
  { key: 'supplierPayables', label: 'Supplier Payables', icon: 'mdi-truck-delivery-outline' },
  { key: 'driverEmployeePayables', label: 'Driver / Employee Payables', icon: 'mdi-account-group-outline' },
  { key: 'customerAdvances', label: 'Customer Advances', icon: 'mdi-cash-refund' },
  { key: 'vehicleLoans', label: 'Vehicle Loans', icon: 'mdi-hand-coin-outline' },
  { key: 'otherLoans', label: 'Other Loans', icon: 'mdi-bank-transfer', disabled: true },
  { key: 'otherLiabilities', label: 'Other Outstanding Liabilities', icon: 'mdi-alert-circle-outline', disabled: true },
];

const todayStr = localDateStr();
const asOfDate = ref(todayStr);
const fyPick = ref<string | null>(null);
const loading = ref(false);
const exporting = ref(false);
const result = ref<BalanceSheetResult | null>(null);

function fyLabel(startYear: number) {
  return `FY ${startYear}-${String(startYear + 1).slice(2)}`;
}
// India-style financial year (Apr–Mar); this only computes which "As of"
// date to load (the FY's end date) — no new backend concept.
const fyOptions = computed(() => {
  const now = new Date();
  const currentFyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const opts: { title: string; value: string }[] = [];
  for (let i = 0; i < 4; i++) {
    const startYear = currentFyStart - i;
    const endStr = `${startYear + 1}-03-31`;
    const asOf = endStr > todayStr ? todayStr : endStr;
    opts.push({ title: i === 0 ? `${fyLabel(startYear)} (current, to date)` : fyLabel(startYear), value: asOf });
  }
  return opts;
});

function onFyPick(value: unknown) {
  if (typeof value === 'string' && value) {
    asOfDate.value = value;
    load();
  }
}
function onCustomDate() {
  fyPick.value = null;
  load();
}
function setToday() {
  fyPick.value = null;
  asOfDate.value = todayStr;
  load();
}
function formatDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function load() {
  loading.value = true;
  try {
    result.value = (await balanceSheetApi.get(asOfDate.value)).data.data;
  } catch (e) {
    showError('Failed to load Balance Sheet');
  } finally {
    loading.value = false;
  }
}

const liabilitiesPct = computed(() => {
  if (!result.value || result.value.totalAssets <= 0) return 0;
  return Math.min((result.value.totalLiabilities / result.value.totalAssets) * 100, 100);
});
const netPct = computed(() => {
  if (!result.value || result.value.totalAssets <= 0) return 0;
  return Math.max(100 - liabilitiesPct.value, 0);
});

// Fixed categorical order, reusing the app's own existing semantic tokens
// (already validated for the app's light/dark themes) rather than
// inventing a new palette.
const assetComposition = computed(() => {
  if (!result.value) return [];
  const a = result.value.assets;
  const total = result.value.totalAssets || 1;
  const items = [
    { key: 'bankAndCash', label: 'Bank & Cash', value: a.bankAndCash, color: 'var(--color-primary)' },
    { key: 'customerReceivables', label: 'Customer Receivables', value: a.customerReceivables, color: 'var(--color-secondary)' },
    { key: 'advancesRecoverable', label: 'Advances Recoverable', value: a.advancesRecoverable, color: 'var(--color-success)' },
    { key: 'fixedAssets', label: 'Vehicle / Fixed Assets', value: a.fixedAssets, color: 'var(--color-warning)' },
    { key: 'otherAssets', label: 'Other Assets', value: a.otherAssets, color: 'var(--color-error)' },
  ];
  return items.filter((i) => i.value > 0.004).map((i) => ({ ...i, pct: (i.value / total) * 100 }));
});

// --- Section breakdown dialog ---
const sectionDialog = ref<{ open: boolean; title: string; groups: SectionGroup[] }>({ open: false, title: '', groups: [] });

function sectionGroups(key: string): SectionGroup[] {
  if (!result.value) return [];
  const b = result.value.breakdown;
  switch (key) {
    case 'bankAndCash':
      return [
        { title: 'Bank Accounts', partyType: null, rows: b.bankAccounts.map((a) => ({ id: a.id, name: a.bankName ? `${a.name} — ${a.bankName}` : a.name, amount: a.currentBalance })) },
        { title: 'Cash Accounts', partyType: null, rows: b.cashAccounts.map((c) => ({ id: c.id, name: c.name, amount: c.currentBalance })) },
      ];
    case 'customerReceivables':
      return [{ title: 'Customer-wise', partyType: 'customer', rows: b.customerReceivables }];
    case 'advancesRecoverable':
      return [
        { title: 'Supplier Advances Paid', partyType: 'supplier', rows: b.supplierAdvances },
        { title: 'Driver Advances', partyType: 'driver', rows: b.driverAdvances },
        { title: 'Employee Advances', partyType: 'employee', rows: b.employeeAdvances },
      ];
    case 'fixedAssets':
      return [
        {
          title: `Assets (Vehicle: ${formatCurrency(b.fixedAssetsVehicleTotal)} · Other: ${formatCurrency(b.fixedAssetsOtherTotal)})`,
          partyType: null,
          rows: b.fixedAssets.map((a) => ({ id: a.id, name: `${a.name} [${a.category}]`, amount: a.amount })),
        },
      ];
    case 'supplierPayables':
      return [{ title: 'Supplier-wise', partyType: 'supplier', rows: b.supplierPayables }];
    case 'driverEmployeePayables':
      return [
        { title: 'Driver Payables', partyType: 'driver', rows: b.driverPayables },
        { title: 'Employee Payables', partyType: 'employee', rows: b.employeePayables },
      ];
    case 'customerAdvances':
      return [{ title: 'Customer-wise', partyType: 'customer', rows: b.customerAdvances }];
    case 'vehicleLoans':
      return [{ title: 'Loan-wise', partyType: null, rows: b.vehicleLoans.map((l) => ({ id: l.id, name: `${l.name} — ${l.lenderName} (${l.vehicle})`, amount: l.amount })) }];
    case 'capitalAccount':
      return [{ title: 'Partner-wise', partyType: 'capitalPartner', rows: b.capitalAccount }];
    default:
      return [];
  }
}

function openSection(key: string, label: string) {
  sectionDialog.value = { open: true, title: label, groups: sectionGroups(key) };
}

// --- Party detail dialog (reuses the existing Customer/Supplier/Driver/Employee financial-state endpoints) ---
const partyDialog = ref<{ open: boolean; title: string; loading: boolean; rows: { label: string; value: number }[]; back: string | null }>({
  open: false,
  title: '',
  loading: false,
  rows: [],
  back: null,
});

function backToSection() {
  partyDialog.value.open = false;
  sectionDialog.value.open = true;
}

async function openParty(type: PartyType, id: string, name: string, fromSection?: string) {
  sectionDialog.value.open = false;
  partyDialog.value = { open: true, title: name, loading: true, rows: [], back: fromSection ?? null };
  try {
    if (type === 'customer') {
      const d = (await financialStateApi.customer(id)).data.data;
      partyDialog.value.rows = [
        { label: 'Total Billed', value: d.totalBilled },
        { label: 'Total Received', value: d.totalReceived },
        { label: 'Advance', value: d.advance },
        { label: 'Adjusted (Credit Notes)', value: d.adjusted },
        { label: 'Outstanding', value: d.outstanding },
        { label: 'Overdue', value: d.overdue },
        { label: 'Refund', value: d.refund },
      ];
    } else if (type === 'supplier') {
      const d = (await financialStateApi.supplier(id)).data.data;
      partyDialog.value.rows = [
        { label: 'Total Payable', value: d.totalPayable },
        { label: 'Total Paid', value: d.totalPaid },
        { label: 'Advance', value: d.advance },
        { label: 'Adjusted (Credit Notes)', value: d.adjusted },
        { label: 'Outstanding', value: d.outstanding },
        { label: 'Overdue', value: d.overdue },
        { label: 'Refund', value: d.refund },
      ];
    } else if (type === 'driver') {
      const d = (await financialStateApi.driver(id)).data.data;
      partyDialog.value.rows = [
        { label: 'Total Advance', value: d.totalAdvance },
        { label: 'Adjusted / Settled', value: d.adjusted },
        { label: 'Remaining', value: d.remaining },
      ];
    } else if (type === 'employee') {
      const d = (await financialStateApi.employee(id)).data.data;
      partyDialog.value.rows = [
        { label: 'Total Advance', value: d.totalAdvance },
        { label: 'Adjusted / Settled', value: d.adjusted },
        { label: 'Remaining', value: d.remaining },
      ];
    } else {
      const d = (await capitalTransactionApi.partnerState(id)).data.data;
      partyDialog.value.rows = [
        { label: 'Total Contributed', value: d.totalContributed },
        { label: 'Total Withdrawn', value: d.totalWithdrawn },
        { label: 'Net Balance', value: d.netBalance },
      ];
    }
  } catch (e) {
    showError('Failed to load details');
    partyDialog.value.open = false;
  } finally {
    partyDialog.value.loading = false;
  }
}

async function onExport() {
  if (!result.value) return;
  exporting.value = true;
  try {
    const r = result.value;
    const rows: Record<string, unknown>[] = [
      { section: 'ASSETS', particulars: 'Bank & Cash', amount: r.assets.bankAndCash },
      { section: 'ASSETS', particulars: 'Customer Receivables', amount: r.assets.customerReceivables },
      { section: 'ASSETS', particulars: 'Advances Recoverable', amount: r.assets.advancesRecoverable },
      { section: 'ASSETS', particulars: 'Vehicle / Fixed Assets', amount: r.assets.fixedAssets },
      { section: 'ASSETS', particulars: 'Other Assets', amount: r.assets.otherAssets },
      { section: 'ASSETS', particulars: 'TOTAL ASSETS', amount: r.totalAssets },
      { section: 'LIABILITIES', particulars: 'Supplier Payables', amount: r.liabilities.supplierPayables },
      { section: 'LIABILITIES', particulars: 'Driver / Employee Payables', amount: r.liabilities.driverEmployeePayables },
      { section: 'LIABILITIES', particulars: 'Customer Advances', amount: r.liabilities.customerAdvances },
      { section: 'LIABILITIES', particulars: 'Vehicle Loans', amount: r.liabilities.vehicleLoans },
      { section: 'LIABILITIES', particulars: 'Other Loans', amount: r.liabilities.otherLoans },
      { section: 'LIABILITIES', particulars: 'Other Outstanding Liabilities', amount: r.liabilities.otherLiabilities },
      { section: 'LIABILITIES', particulars: 'TOTAL LIABILITIES', amount: r.totalLiabilities },
      { section: 'NET POSITION', particulars: 'Net Position (Assets − Liabilities)', amount: r.netPosition },
    ];
    await exportRowsToExcel(
      `Balance Sheet as of ${r.asOfDate}`,
      [
        { header: 'Section', key: 'section' },
        { header: 'Particulars', key: 'particulars' },
        { header: 'Amount', key: 'amount' },
      ],
      rows
    );
    success('Balance Sheet exported to Excel');
  } finally {
    exporting.value = false;
  }
}

load();
</script>

<style scoped>
.bs-bar {
  height: 18px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--color-success) 22%, transparent);
  overflow: hidden;
  display: flex;
}
.bs-bar__seg {
  height: 100%;
}
.bs-comp-bar {
  height: 14px;
  border-radius: 7px;
  overflow: hidden;
  display: flex;
  background: var(--color-surface-variant, #eee);
}
.bs-comp-bar__seg {
  height: 100%;
  border-right: 2px solid var(--color-surface, #fff);
}
.bs-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}
.bs-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 4px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border, #eef0f2);
  transition: background 0.12s ease;
}
.bs-row:hover {
  background: var(--color-surface-variant, #f5f7fa);
}
.bs-row--disabled {
  cursor: default;
  color: var(--color-text-medium-emphasis, #888);
}
.bs-row--disabled:hover {
  background: transparent;
}
.bs-total-row {
  border-top: 1px solid var(--color-border, #e5e7eb);
}
.bs-row-clickable {
  cursor: pointer;
}
.bs-row-clickable:hover {
  background: var(--color-surface-variant, #f5f7fa);
}
.bs-notes {
  padding-left: 18px;
  margin: 0;
}
.bs-notes li {
  font-size: 12px;
  color: var(--color-text-medium-emphasis, #666);
  margin-bottom: 6px;
}
.tblwrap {
  overflow-x: auto;
}
</style>
