<template>
  <div>
    <h2 class="text-h6 mb-4">Driver Statement</h2>

    <AppCard class="mb-4">
      <AppCardText class="d-flex flex-wrap ga-2 align-center">
        <AppSelect v-model="driverId" :items="driverOptions" item-title="name" item-value="id" label="Driver" style="min-width: 260px" @update:model-value="fetchStatement" />
        <AppTextField v-model="from" type="date" label="From" style="min-width: 160px" @update:model-value="fetchStatement" />
        <AppTextField v-model="to" type="date" label="To" style="min-width: 160px" @update:model-value="fetchStatement" />
      </AppCardText>
    </AppCard>

    <template v-if="store.current">
      <div class="d-flex flex-wrap ga-4 mb-4">
        <AppCard class="pa-3 flex-1-1">
          <div class="text-caption text-medium-emphasis">Opening Balance</div>
          <div class="text-h6">{{ formatCurrency(store.current.openingBalance) }}</div>
        </AppCard>
        <AppCard class="pa-3 flex-1-1">
          <div class="text-caption text-medium-emphasis">Closing Balance</div>
          <div class="text-h6" :class="store.current.closingBalance >= 0 ? 'text-error' : 'text-success'">{{ formatCurrency(store.current.closingBalance) }}</div>
        </AppCard>
      </div>

      <div class="tblwrap">
        <AppTable>
          <thead>
            <tr>
              <th>Advance No.</th>
              <th>Date</th>
              <th>Narration</th>
              <th class="text-right">Debit</th>
              <th class="text-right">Credit</th>
              <th class="text-right">Running Balance</th>
              <th>Settled</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(t, i) in store.current.transactions" :key="i">
              <td>{{ t.advanceNumber }}</td>
              <td>{{ new Date(t.date).toLocaleDateString() }}</td>
              <td>{{ t.narration }}</td>
              <td class="text-right">{{ Number(t.debitAmount) > 0 ? formatCurrency(t.debitAmount) : '-' }}</td>
              <td class="text-right">{{ Number(t.creditAmount) > 0 ? formatCurrency(t.creditAmount) : '-' }}</td>
              <td class="text-right font-weight-medium">{{ formatCurrency(t.runningBalance) }}</td>
              <td><AppChip size="x-small" :color="t.isSettled ? 'success' : 'warning'">{{ t.isSettled ? 'Settled' : 'Open' }}</AppChip></td>
            </tr>
          </tbody>
        </AppTable>
      </div>
      <p v-if="store.current.transactions.length === 0" class="text-caption text-medium-emphasis pa-4">No transactions in this period.</p>
    </template>
    <p v-else-if="!store.loading" class="text-caption text-medium-emphasis">Select a driver to view their statement.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useDriverStatementStore } from '@/stores/accounts/driverPayroll';
import { driverApi } from '@/services/masters';
import { formatCurrency } from '@/utils/format';
import { AppCard, AppCardText, AppSelect, AppTextField, AppTable, AppChip } from '@/components/ui';

const store = useDriverStatementStore();
const driverId = ref('');
const from = ref('');
const to = ref('');
const driverOptions = ref<{ id: string; name: string }[]>([]);

async function fetchStatement() {
  if (!driverId.value) return;
  await store.fetch(driverId.value, from.value || undefined, to.value || undefined);
}

onMounted(async () => {
  const driversRes = await driverApi.list({ pageSize: 200 });
  driverOptions.value = driversRes.data.data.map((d: any) => ({ id: d.id, name: `${d.name} (${d.code})` }));
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
