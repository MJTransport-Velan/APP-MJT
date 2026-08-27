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
        <ExcelExportButton variant="outlined" size="small" :loading="exporting" :disabled="!result" @click="onExport" />
      </div>
    </div>

    <div v-if="loading && !result" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="result">
      <AppAlert v-if="!result.reconciliation.reconciled" type="error" class="mb-4">
        Financial position does not reconcile — Assets ({{ formatCurrency(result.totalAssets) }}) vs Liabilities + Equity
        ({{ formatCurrency(result.totalLiabilities + result.totalEquity) }}), difference {{ formatCurrency(result.reconciliation.difference) }}.
      </AppAlert>

      <div class="row mb-1">
        <div class="col-12 col-sm-4"><ProfitCard label="Total Assets" :value="result.totalAssets" icon="mdi-scale-balance" color="success" /></div>
        <div class="col-12 col-sm-4"><ProfitCard label="Total Liabilities" :value="result.totalLiabilities" icon="mdi-cash-remove" color="error" /></div>
        <div class="col-12 col-sm-4"><ProfitCard label="Total Equity" :value="result.totalEquity" icon="mdi-chart-donut" color="primary" color-by-value /></div>
      </div>

      <AppCard class="pa-4 mb-4">
        <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
          <span>Assets = Liabilities + Equity</span>
          <span>{{ formatCurrency(result.totalAssets) }}</span>
        </div>
        <div class="bs-bar">
          <div class="bs-bar__seg" :style="{ width: liabilitiesPct + '%', background: 'var(--color-error)' }" :title="`Liabilities ${formatCurrency(result.totalLiabilities)}`" />
          <div
            v-if="result.totalEquity >= 0"
            class="bs-bar__seg"
            :style="{ width: equityPct + '%', background: 'var(--color-primary)' }"
            :title="`Equity ${formatCurrency(result.totalEquity)}`"
          />
        </div>
        <div v-if="result.totalEquity < 0" class="text-caption text-error mt-1">
          Liabilities exceed Assets by {{ formatCurrency(-result.totalEquity) }}
        </div>
        <div class="d-flex ga-4 mt-2 text-caption">
          <span><span class="bs-dot" style="background: var(--color-error)" /> Liabilities</span>
          <span><span class="bs-dot" style="background: var(--color-primary)" /> Equity</span>
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
                <span class="font-weight-medium">{{ formatCurrency(line.value(result)) }}</span>
                <AppIcon v-if="!line.disabled" icon="mdi-chevron-right" size="small" class="text-medium-emphasis" />
              </span>
            </div>
            <div class="d-flex justify-space-between font-weight-bold pt-2 mt-1 bs-total-row">
              <span>Total Assets</span><span>{{ formatCurrency(result.totalAssets) }}</span>
            </div>
          </AppCard>

          <!-- Fixed assets read as a block: what they cost, what has been
               written off, and what is left — with the migration split shown
               so opening assets are never mistaken for this year's purchases. -->
          <AppCard class="pa-4 mt-4">
            <div class="text-subtitle-2 mb-2">Fixed Assets</div>
            <div class="bs-row bs-row--disabled">
              <span>Gross Block (original cost)</span><span>{{ formatCurrency(result.assets.fixedAssets.grossBlock) }}</span>
            </div>
            <div class="bs-row bs-row--disabled">
              <span>Less: Accumulated Depreciation</span><span>({{ formatCurrency(result.assets.fixedAssets.accumulatedDepreciation) }})</span>
            </div>
            <div class="d-flex justify-space-between font-weight-bold pt-2 mt-1 bs-total-row">
              <span>Net Fixed Assets</span><span>{{ formatCurrency(result.assets.fixedAssets.total) }}</span>
            </div>
            <div class="bs-row" @click="openSection('openingAssets', 'Existing / Opening Assets')">
              <span class="d-flex align-center ga-2">
                <AppIcon icon="mdi-database-import-outline" size="small" class="text-medium-emphasis" />
                <span>Existing / Opening Assets</span>
              </span>
              <span class="d-flex align-center ga-1">
                <span class="font-weight-medium">{{ formatCurrency(result.assets.fixedAssets.openingAssets) }}</span>
                <AppIcon icon="mdi-chevron-right" size="small" class="text-medium-emphasis" />
              </span>
            </div>
            <div class="bs-row" @click="openSection('newAssets', 'New Assets')">
              <span class="d-flex align-center ga-2">
                <AppIcon icon="mdi-plus-box-outline" size="small" class="text-medium-emphasis" />
                <span>New Assets</span>
              </span>
              <span class="d-flex align-center ga-1">
                <span class="font-weight-medium">{{ formatCurrency(result.assets.fixedAssets.newAssets) }}</span>
                <AppIcon icon="mdi-chevron-right" size="small" class="text-medium-emphasis" />
              </span>
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
                <span class="font-weight-medium">{{ formatCurrency(line.value(result)) }}</span>
                <AppIcon v-if="!line.disabled" icon="mdi-chevron-right" size="small" class="text-medium-emphasis" />
              </span>
            </div>
            <div class="d-flex justify-space-between font-weight-bold pt-2 mt-1 bs-total-row">
              <span>Total Liabilities</span><span>{{ formatCurrency(result.totalLiabilities) }}</span>
            </div>
          </AppCard>

          <!-- Equity is its own section, not a liability line — that
               separation is the whole point of Capital vs Owner Loan. -->
          <AppCard class="pa-4 mt-4">
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="text-subtitle-1 font-weight-bold">Equity</div>
              <div class="text-subtitle-1 font-weight-bold">{{ formatCurrency(result.totalEquity) }}</div>
            </div>
            <div
              v-for="line in equityLines"
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
                <span class="font-weight-medium">{{ line.negative ? '(' + formatCurrency(line.value(result)) + ')' : formatCurrency(line.value(result)) }}</span>
                <AppIcon v-if="!line.disabled" icon="mdi-chevron-right" size="small" class="text-medium-emphasis" />
              </span>
            </div>
            <div class="d-flex justify-space-between font-weight-bold pt-2 mt-1 bs-total-row">
              <span>Total Equity</span><span>{{ formatCurrency(result.totalEquity) }}</span>
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
import { AppCard, AppCardTitle, AppCardText, AppProgressCircular, AppAlert, AppBtn, AppTextField, AppSelect, AppDialog, AppTable, AppIcon, ExcelExportButton } from '@/components/ui';
import type { BalanceSheetResult, NamedAmountRow, BalanceSheetAssets, BalanceSheetLiabilities } from '@/types/balanceSheet.types';

type PartyType = 'customer' | 'supplier' | 'driver' | 'employee' | 'capitalPartner';
interface SectionGroup {
  title: string;
  partyType: PartyType | null;
  rows: NamedAmountRow[];
}

const { success, error: showError } = useSnackbar();

// Assets are grouped (Fixed vs Current) server-side, so each line reads its
// figure through an accessor rather than a flat key lookup.
interface SectionLine {
  key: string;
  label: string;
  icon: string;
  value: (r: BalanceSheetResult) => number;
  disabled?: boolean;
  negative?: boolean;
}

const assetLines: SectionLine[] = [
  { key: 'fixedAssetsVehicles', label: 'Fixed Assets — Vehicles', icon: 'mdi-truck-outline', value: (r) => r.assets.fixedAssets.vehicles },
  { key: 'fixedAssetsOther', label: 'Fixed Assets — Equipment & Other', icon: 'mdi-desktop-tower-monitor', value: (r) => r.assets.fixedAssets.equipmentAndOther },
  { key: 'cash', label: 'Cash', icon: 'mdi-cash', value: (r) => r.assets.currentAssets.cash },
  { key: 'bank', label: 'Bank', icon: 'mdi-bank-outline', value: (r) => r.assets.currentAssets.bank },
  { key: 'customerReceivables', label: 'Receivables', icon: 'mdi-account-cash-outline', value: (r) => r.assets.currentAssets.receivables },
  { key: 'advancesRecoverable', label: 'Advances Recoverable', icon: 'mdi-cash-fast', value: (r) => r.assets.currentAssets.advances },
  // Deposits and similar balances carried over from the previous system.
  { key: 'otherAssets', label: 'Other Assets', icon: 'mdi-shape-outline', value: (r) => r.assets.otherAssets },
];

const liabilityLines: SectionLine[] = [
  { key: 'vehicleLoans', label: 'Vehicle Loans', icon: 'mdi-truck-outline', value: (r) => r.liabilities.vehicleLoans },
  { key: 'bankLoans', label: 'Bank / Business Loans', icon: 'mdi-bank-outline', value: (r) => r.liabilities.bankLoans },
  { key: 'ownerLoans', label: 'Owner Loans', icon: 'mdi-account-cash-outline', value: (r) => r.liabilities.ownerLoans },
  { key: 'otherLoans', label: 'Other Loans', icon: 'mdi-hand-coin-outline', value: (r) => r.liabilities.otherLoans },
  { key: 'supplierPayables', label: 'Supplier Payables', icon: 'mdi-truck-delivery-outline', value: (r) => r.liabilities.supplierPayables },
  { key: 'employeePayables', label: 'Driver / Employee Payables', icon: 'mdi-account-group-outline', value: (r) => r.liabilities.employeePayables },
  { key: 'customerAdvances', label: 'Customer Advances', icon: 'mdi-cash-refund', value: (r) => r.liabilities.customerAdvances },
  // Owner money from the migration whose nature is still undecided sits in
  // liabilities, never in equity, until the user classifies it.
  { key: 'openingUnclassified', label: 'Owner Funds — Needs Review', icon: 'mdi-help-circle-outline', value: (r) => r.liabilities.openingUnclassified },
  { key: 'taxPayables', label: 'Tax / Statutory Payables', icon: 'mdi-file-percent-outline', value: (r) => r.liabilities.taxPayables, disabled: true },
  { key: 'otherLiabilities', label: 'Other Liabilities', icon: 'mdi-alert-circle-outline', value: (r) => r.liabilities.otherLiabilities },
];

const equityLines: SectionLine[] = [
  { key: 'ownerCapital', label: 'Owner Capital', icon: 'mdi-wallet-outline', value: (r) => r.equity.ownerCapital },
  { key: 'openingEquity', label: 'Opening Equity (brought forward)', icon: 'mdi-database-import-outline', value: (r) => r.equity.openingEquityAdjustments },
  { key: 'retainedProfit', label: 'Retained Profit', icon: 'mdi-chart-line', value: (r) => r.equity.retainedProfit, disabled: true },
  { key: 'drawings', label: 'Drawings', icon: 'mdi-cash-minus', value: (r) => r.equity.drawings, negative: true },
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
const equityPct = computed(() => {
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
    { key: 'bankAndCash', label: 'Bank & Cash', value: a.currentAssets.cash + a.currentAssets.bank, color: 'var(--color-primary)' },
    { key: 'customerReceivables', label: 'Receivables', value: a.currentAssets.receivables, color: 'var(--color-secondary)' },
    { key: 'advancesRecoverable', label: 'Advances Recoverable', value: a.currentAssets.advances, color: 'var(--color-success)' },
    { key: 'fixedAssets', label: 'Fixed Assets', value: a.fixedAssets.total, color: 'var(--color-warning)' },
    { key: 'otherAssets', label: 'Other Assets', value: a.otherAssets, color: 'var(--color-error)' },
  ];
  return items.filter((i) => i.value > 0.004).map((i) => ({ ...i, pct: (i.value / total) * 100 }));
});

// --- Section breakdown dialog ---
const sectionDialog = ref<{ open: boolean; title: string; groups: SectionGroup[] }>({ open: false, title: '', groups: [] });

/** Splits one asset list into its opening and newly-purchased halves, dropping an empty half. */
function assetGroups(rows: { id: string; name: string; amount: number; origin: string }[], label: string): SectionGroup[] {
  const opening = rows.filter((a) => a.origin === 'OPENING').map((a) => ({ id: a.id, name: a.name, amount: a.amount }));
  const fresh = rows.filter((a) => a.origin !== 'OPENING').map((a) => ({ id: a.id, name: a.name, amount: a.amount }));
  const groups: SectionGroup[] = [];
  if (opening.length) groups.push({ title: `${label} — Existing / Opening`, partyType: null, rows: opening });
  groups.push({ title: opening.length ? `${label} — New` : label, partyType: null, rows: fresh });
  return groups;
}

function sectionGroups(key: string): SectionGroup[] {
  if (!result.value) return [];
  const b = result.value.breakdown;
  switch (key) {
    case 'bank':
      return [{ title: 'Bank Accounts', partyType: null, rows: b.bankAccounts.map((a) => ({ id: a.id, name: a.bankName ? `${a.name} — ${a.bankName}` : a.name, amount: a.currentBalance })) }];
    case 'cash':
      return [{ title: 'Cash Accounts', partyType: null, rows: b.cashAccounts.map((c) => ({ id: c.id, name: c.name, amount: c.currentBalance })) }];
    case 'customerReceivables':
      return [{ title: 'Customer-wise', partyType: 'customer', rows: b.customerReceivables }];
    case 'advancesRecoverable':
      return [
        { title: 'Supplier Advances Paid', partyType: 'supplier', rows: b.supplierAdvances },
        { title: 'Driver Advances', partyType: 'driver', rows: b.driverAdvances },
        { title: 'Employee Advances', partyType: 'employee', rows: b.employeeAdvances },
      ];
    // Each asset group is listed opening-first, so a migrated asset is never
    // mistaken for something bought this year.
    case 'fixedAssetsVehicles':
      return assetGroups(b.fixedAssets.filter((a) => a.category === 'Vehicle'), 'Vehicle Assets');
    case 'fixedAssetsOther':
      return assetGroups(b.fixedAssets.filter((a) => a.category !== 'Vehicle'), 'Equipment & Other Assets');
    case 'openingAssets':
      return [{ title: 'Carried over from the previous system', partyType: null, rows: b.openingAssetRows.map((a) => ({ id: a.id, name: a.name, amount: a.amount })) }];
    case 'newAssets':
      return [{ title: 'Bought through this system', partyType: null, rows: b.newAssetRows.map((a) => ({ id: a.id, name: a.name, amount: a.amount })) }];
    case 'otherAssets':
      return [{ title: 'Opening adjustments', partyType: null, rows: b.openingOtherAssets }];
    case 'otherLiabilities':
      return [{ title: 'Opening adjustments', partyType: null, rows: b.openingOtherLiabilities }];
    case 'openingEquity':
      return [{ title: 'Opening adjustments', partyType: null, rows: b.openingOtherEquity }];
    case 'openingUnclassified':
      return [{ title: 'Owner funds still to classify', partyType: null, rows: b.openingUnclassifiedOwnerFunds }];
    case 'supplierPayables':
      return [{ title: 'Supplier-wise', partyType: 'supplier', rows: b.supplierPayables }];
    case 'employeePayables':
      return [
        { title: 'Driver Payables', partyType: 'driver', rows: b.driverPayables },
        { title: 'Employee Payables', partyType: 'employee', rows: b.employeePayables },
      ];
    case 'customerAdvances':
      return [{ title: 'Customer-wise', partyType: 'customer', rows: b.customerAdvances }];
    case 'vehicleLoans':
    case 'bankLoans':
    case 'ownerLoans':
    case 'otherLoans': {
      const wanted: Record<string, string[]> = {
        vehicleLoans: ['VEHICLE_LOAN'],
        bankLoans: ['BANK_LOAN', 'BUSINESS_LOAN'],
        ownerLoans: ['OWNER_LOAN'],
        otherLoans: ['OTHER_LOAN'],
      };
      const groups: SectionGroup[] = [
        {
          title: key === 'ownerLoans' ? 'Owner Loans with an EMI schedule' : 'Loan-wise',
          partyType: null,
          rows: b.loans
            .filter((l) => wanted[key].includes(l.loanType))
            .map((l) => ({ id: l.id, name: l.linkedTo ? `${l.name} — ${l.lenderName} (${l.linkedTo})` : `${l.name} — ${l.lenderName}`, amount: l.amount })),
        },
      ];
      // Informal owner money lives on Capital & Owner Funds instead of the
      // Loans module, so both sources are listed under Owner Loans.
      if (key === 'ownerLoans') {
        groups.push({ title: 'Owner Loans recorded on Capital & Owner Funds', partyType: 'capitalPartner', rows: b.ownerLoans });
      }
      return groups;
    }
    case 'ownerCapital':
    case 'drawings':
      return [{ title: 'Partner-wise (net capital)', partyType: 'capitalPartner', rows: b.capitalAccount }];
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
      // Capital (equity) and owner loan (liability) are shown as two
      // separate blocks — never summed into one "partner balance".
      partyDialog.value.rows = [
        { label: 'Capital Contributed', value: d.totalContributed },
        { label: 'Capital Withdrawn (Drawings)', value: d.totalWithdrawn },
        { label: 'Owner Capital Balance', value: d.capitalBalance ?? d.netBalance },
        { label: 'Owner Loan Received', value: d.ownerLoanReceived ?? 0 },
        { label: 'Owner Loan Repaid', value: d.ownerLoanRepaid ?? 0 },
        { label: 'Owner Loan Outstanding', value: d.ownerLoanBalance ?? 0 },
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
      { section: 'ASSETS', particulars: 'Fixed Assets — Vehicles', amount: r.assets.fixedAssets.vehicles },
      { section: 'ASSETS', particulars: 'Fixed Assets — Equipment & Other', amount: r.assets.fixedAssets.equipmentAndOther },
      { section: 'ASSETS', particulars: 'Total Fixed Assets', amount: r.assets.fixedAssets.total },
      { section: 'ASSETS', particulars: 'Cash', amount: r.assets.currentAssets.cash },
      { section: 'ASSETS', particulars: 'Bank', amount: r.assets.currentAssets.bank },
      { section: 'ASSETS', particulars: 'Receivables', amount: r.assets.currentAssets.receivables },
      { section: 'ASSETS', particulars: 'Advances Recoverable', amount: r.assets.currentAssets.advances },
      { section: 'ASSETS', particulars: 'Total Current Assets', amount: r.assets.currentAssets.total },
      { section: 'ASSETS', particulars: 'Other Assets', amount: r.assets.otherAssets },
      { section: 'ASSETS', particulars: 'TOTAL ASSETS', amount: r.totalAssets },
      { section: 'LIABILITIES', particulars: 'Vehicle Loans', amount: r.liabilities.vehicleLoans },
      { section: 'LIABILITIES', particulars: 'Bank / Business Loans', amount: r.liabilities.bankLoans },
      { section: 'LIABILITIES', particulars: 'Owner Loans', amount: r.liabilities.ownerLoans },
      { section: 'LIABILITIES', particulars: 'Other Loans', amount: r.liabilities.otherLoans },
      { section: 'LIABILITIES', particulars: 'Supplier Payables', amount: r.liabilities.supplierPayables },
      { section: 'LIABILITIES', particulars: 'Driver / Employee Payables', amount: r.liabilities.employeePayables },
      { section: 'LIABILITIES', particulars: 'Customer Advances', amount: r.liabilities.customerAdvances },
      { section: 'LIABILITIES', particulars: 'Tax / Statutory Payables', amount: r.liabilities.taxPayables },
      { section: 'LIABILITIES', particulars: 'Other Liabilities', amount: r.liabilities.otherLiabilities },
      { section: 'LIABILITIES', particulars: 'TOTAL LIABILITIES', amount: r.totalLiabilities },
      { section: 'EQUITY', particulars: 'Owner Capital', amount: r.equity.ownerCapital },
      { section: 'EQUITY', particulars: 'Retained Profit', amount: r.equity.retainedProfit },
      { section: 'EQUITY', particulars: 'Drawings (deduction)', amount: -r.equity.drawings },
      { section: 'EQUITY', particulars: 'TOTAL EQUITY', amount: r.totalEquity },
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
