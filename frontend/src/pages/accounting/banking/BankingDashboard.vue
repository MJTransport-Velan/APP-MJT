<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6 mb-0">Bank Dashboard</h2>
      <AppBtn variant="outlined" :loading="store.loading" @click="refresh">Refresh</AppBtn>
    </div>

    <DateRangeFilterBar
      :date-from="dateFrom"
      :date-to="dateTo"
      snapshot-note="Bank and cash balances, pending cheques and approvals are current figures, not period totals."
      @update:date-from="setFrom"
      @update:date-to="setTo"
      @preset="apply"
      @clear="clear"
    />

    <div v-if="store.summary" class="dashboard-grid mb-4">
      <AppCard><AppCardText>
        <div class="text-caption text-medium-emphasis">{{ isActive ? 'Receipts in Period' : "Today's Receipts" }}</div>
        <div class="text-h6 text-success">{{ formatCurrency(store.summary.todaysReceipts) }}</div>
      </AppCardText></AppCard>
      <AppCard><AppCardText>
        <div class="text-caption text-medium-emphasis">{{ isActive ? 'Payments in Period' : "Today's Payments" }}</div>
        <div class="text-h6 text-error">{{ formatCurrency(store.summary.todaysPayments) }}</div>
      </AppCardText></AppCard>
      <AppCard><AppCardText>
        <div class="text-caption text-medium-emphasis">Pending Cheques</div>
        <div class="text-h6">{{ store.summary.pendingCheques }}</div>
      </AppCardText></AppCard>
      <AppCard><AppCardText>
        <div class="text-caption text-medium-emphasis">Pending Approvals</div>
        <div class="text-h6">{{ store.summary.pendingApprovals }}</div>
      </AppCardText></AppCard>
    </div>

    <div v-if="store.summary" class="d-flex flex-wrap ga-4 mb-4">
      <AppCard style="flex: 1; min-width: 320px">
        <AppCardTitle class="text-subtitle-1">Bank Accounts — Book Balance</AppCardTitle>
        <AppCardText>
          <div v-for="b in store.summary.bankAccounts" :key="b.id" class="d-flex justify-space-between py-1">
            <span>{{ b.accountHolderName }} ({{ b.accountNumber }})</span>
            <span class="font-weight-medium">{{ formatCurrency(b.bookBalance) }}</span>
          </div>
          <p v-if="!store.summary.bankAccounts.length" class="text-medium-emphasis text-caption">No active bank accounts.</p>
        </AppCardText>
      </AppCard>
      <AppCard style="flex: 1; min-width: 320px">
        <AppCardTitle class="text-subtitle-1">Cash Accounts — Balance</AppCardTitle>
        <AppCardText>
          <div v-for="c in store.summary.cashAccounts" :key="c.id" class="d-flex justify-space-between py-1">
            <span>{{ c.cashAccountType }}</span>
            <span class="font-weight-medium">{{ formatCurrency(c.balance) }}</span>
          </div>
          <p v-if="!store.summary.cashAccounts.length" class="text-medium-emphasis text-caption">No active cash accounts.</p>
        </AppCardText>
      </AppCard>
    </div>

    <AppCard v-if="store.summary">
      <AppCardTitle class="text-subtitle-1">Recent Transfers</AppCardTitle>
      <AppCardText>
        <div v-for="t in store.summary.recentTransfers" :key="t.id" class="d-flex justify-space-between py-1">
          <span>{{ t.transferNumber }} — {{ t.fromAccountType }} → {{ t.toAccountType }}</span>
          <span class="font-weight-medium">{{ formatCurrency(Number(t.amount)) }}</span>
        </div>
        <p v-if="!store.summary.recentTransfers.length" class="text-medium-emphasis text-caption">No transfers yet.</p>
      </AppCardText>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useBankingDashboardStore } from '@/stores/banking';
import { AppBtn, AppCard, AppCardTitle, AppCardText } from '@/components/ui';
import { useDateRangeFilter } from '@/composables/useDateRangeFilter';
import { DateRangeFilterBar } from '@/components/filters';

const store = useBankingDashboardStore();

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

const { dateFrom, dateTo, isActive, params, setFrom, setTo, apply, clear } = useDateRangeFilter({ onChange: refresh });

async function refresh() {
  await store.fetchSummary(params.value);
}

onMounted(refresh);
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
</style>
