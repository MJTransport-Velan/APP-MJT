<template>
  <div>
    <h2 class="text-h6 mb-4">Intelligence Center</h2>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="ai">AI Foundation</AppTab>
      <AppTab value="kpi">Executive KPI Dashboard</AppTab>
    </AppTabs>

    <AppWindow v-model="activeTab">
      <AppWindowItem value="ai">
        <AppCard class="pa-4 mb-4">
          <div class="row row-dense align-end">
            <div class="col-6 col-sm-4"><AppSelect v-model="insightType" :items="insightTypes" label="Insight Type" density="compact" hide-details /></div>
            <div class="col-6 col-sm-3"><AppBtn color="primary" variant="flat" block :loading="generating" @click="onGenerate">Generate</AppBtn></div>
          </div>
        </AppCard>
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Type</th><th>Method</th><th>Confidence</th><th>Generated</th><th>Result</th></tr></thead>
              <tbody>
                <tr v-for="i in insights" :key="i.id">
                  <td>{{ i.type }}</td>
                  <td><AppChip size="x-small" variant="outlined">{{ i.method }}</AppChip></td>
                  <td>{{ i.confidence !== null ? `${(i.confidence * 100).toFixed(0)}%` : '-' }}</td>
                  <td>{{ new Date(i.generatedAt).toLocaleString() }}</td>
                  <td>
                    <pre class="result-json">{{ JSON.stringify(i.resultJson, null, 2) }}</pre>
                  </td>
                </tr>
                <tr v-if="!insights.length"><td colspan="5" class="text-center text-medium-emphasis py-4">No insights generated yet</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="kpi">
        <DateRangeFilterBar
          :date-from="dateFrom"
          :date-to="dateTo"
          snapshot-note="Each card shows the last snapshot inside the window."
          @update:date-from="setFrom"
          @update:date-to="setTo"
          @preset="apply"
          @clear="clear"
        />
        <div class="d-flex justify-end mb-3">
          <AppBtn variant="outlined" prepend-icon="mdi-refresh" :loading="computing" @click="onComputeSnapshots">Compute Today's Snapshot</AppBtn>
        </div>
        <div class="row row-dense">
          <div v-for="card in kpiCards" :key="card.code" class="col-12 col-sm-6 col-md-4">
            <AppCard class="pa-4 h-100">
              <div class="text-caption text-medium-emphasis">{{ card.category }}</div>
              <div class="text-subtitle-1 mb-1">{{ card.name }}</div>
              <div class="text-h5">{{ card.latestValue !== null ? formatValue(card.latestValue, card.unit) : '-' }}</div>
              <div class="text-caption text-medium-emphasis">{{ card.latestPeriodDate ? new Date(card.latestPeriodDate).toLocaleDateString() : 'No snapshot yet' }}</div>
            </AppCard>
          </div>
          <div v-if="!kpiCards.length" class="col-12">
            <AppCard class="pa-8 text-center text-medium-emphasis">No KPI snapshots yet — click "Compute Today's Snapshot" to populate the dashboard.</AppCard>
          </div>
        </div>
      </AppWindowItem>
    </AppWindow>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { aiInsightApi, kpiApi } from '@/services/system/phase8';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import { AppTabs, AppTab, AppWindow, AppWindowItem, AppCard, AppTable, AppChip, AppBtn, AppSelect } from '@/components/ui';
import { useDateRangeFilter } from '@/composables/useDateRangeFilter';
import { DateRangeFilterBar } from '@/components/filters';
import type { AiInsight, KpiCard } from '@/types/phase8.types';

const { success, error } = useSnackbar();
const activeTab = ref('ai');

const insightTypes = ['OUTSTANDING_PREDICTION'];
const insightType = ref('OUTSTANDING_PREDICTION');
const insights = ref<AiInsight[]>([]);
const generating = ref(false);

async function fetchInsights() {
  insights.value = (await aiInsightApi.list({ pageSize: 20 })).data.data;
}
async function onGenerate() {
  generating.value = true;
  try {
    await aiInsightApi.generate(insightType.value, 3);
    success('Insight generated');
    fetchInsights();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to generate insight'));
  } finally {
    generating.value = false;
  }
}

const kpiCards = ref<KpiCard[]>([]);
const computing = ref(false);
function formatValue(value: number, unit: string | null) {
  if (unit === 'INR') return `₹${value.toLocaleString('en-IN')}`;
  if (unit === '%') return `${value}%`;
  return String(value);
}
const { dateFrom, dateTo, params, setFrom, setTo, apply, clear } = useDateRangeFilter({ onChange: fetchKpiDashboard });

async function fetchKpiDashboard() {
  kpiCards.value = (await kpiApi.executiveDashboard(params.value)).data.data.cards;
}
async function onComputeSnapshots() {
  computing.value = true;
  try {
    const result = await kpiApi.computeSnapshots();
    success(`${result.data.data.computed} KPI snapshot(s) computed`);
    fetchKpiDashboard();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to compute snapshots'));
  } finally {
    computing.value = false;
  }
}

onMounted(() => {
  fetchInsights();
  fetchKpiDashboard();
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
.result-json {
  max-width: 400px;
  max-height: 150px;
  overflow: auto;
  font-size: 11px;
  background: rgba(0, 0, 0, 0.03);
  padding: 6px;
  border-radius: 4px;
}
</style>
