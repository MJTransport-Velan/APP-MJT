<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Automation Rules</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Rule</AppBtn>
    </div>

    <AppCard>
      <div class="tblwrap">
        <AppTable density="compact">
          <thead>
            <tr>
              <th>Name</th><th>Trigger</th><th>Action</th><th>Status</th><th>Last Run</th><th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in store.items" :key="rule.id">
              <td>
                <div>{{ rule.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ rule.description || '-' }}</div>
              </td>
              <td>
                <AppChip size="x-small" variant="outlined">{{ rule.triggerType }}</AppChip>
                <div class="text-caption text-medium-emphasis mt-1">{{ rule.triggerType === 'SCHEDULE' ? rule.cronExpression : rule.eventCode }}</div>
              </td>
              <td>{{ rule.actionType }}</td>
              <td>
                <AppChip size="x-small" :color="rule.isActive ? 'success' : 'default'">{{ rule.isActive ? 'Active' : 'Inactive' }}</AppChip>
                <div v-if="rule.lastRunStatus" class="text-caption mt-1" :class="rule.lastRunStatus === 'FAILED' ? 'text-error' : 'text-success'">{{ rule.lastRunStatus }}</div>
              </td>
              <td>{{ rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleString() : 'Never' }}</td>
              <td class="text-right">
                <AppBtn icon="mdi-play-circle-outline" variant="text" size="small" title="Run Now" @click="onRunNow(rule)" />
                <AppBtn icon="mdi-history" variant="text" size="small" title="Run Logs" @click="openLogs(rule)" />
                <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="onDelete(rule)" />
              </td>
            </tr>
          </tbody>
        </AppTable>
      </div>
    </AppCard>

    <MasterFormDialog v-model="dialog" title="New Automation Rule" :loading="submitting" @submit="onSubmit" max-width="650">
      <AppTextField v-model="form.name" label="Name" :error-messages="errors.name" class="mb-2" />
      <AppTextarea v-model="form.description" label="Description" rows="2" class="mb-2" />
      <div class="row row-dense mb-2">
        <div class="col-6"><AppSelect v-model="form.triggerType" :items="['SCHEDULE', 'EVENT']" label="Trigger Type" density="compact" /></div>
        <div class="col-6"><AppSelect v-model="form.actionType" :items="actionTypes" label="Action Type" density="compact" /></div>
      </div>
      <AppTextField v-if="form.triggerType === 'SCHEDULE'" v-model="form.cronExpression" label="Cron Expression" hint="e.g. 0 2 * * * (2 AM daily)" persistent-hint class="mb-2" />
      <AppTextField v-else v-model="form.eventCode" label="Event Code" class="mb-2" />
      <AppTextarea v-model="form.actionConfig" label="Action Config (JSON)" rows="3" hint='e.g. {"scope":"AUDIT_LOG","cutoffDays":365}' persistent-hint />
    </MasterFormDialog>

    <AppDialog v-model="logsDialog" max-width="700">
      <AppCard v-if="selectedRule">
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span class="text-h6">Run Logs — {{ selectedRule.name }}</span>
          <AppBtn icon="mdi-close" variant="text" size="small" @click="logsDialog = false" />
        </AppCardTitle>
        <AppCardText>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Triggered</th><th>Status</th><th>Started</th><th>Result / Error</th></tr></thead>
              <tbody>
                <tr v-for="log in runLogs" :key="log.id">
                  <td>{{ log.triggeredBy }}</td>
                  <td><AppChip size="x-small" :color="log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'error' : 'warning'">{{ log.status }}</AppChip></td>
                  <td>{{ new Date(log.startedAt).toLocaleString() }}</td>
                  <td>{{ log.resultSummary || log.errorMessage || '-' }}</td>
                </tr>
                <tr v-if="!runLogs.length"><td colspan="4" class="text-center text-medium-emphasis py-4">No runs yet</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCardText>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAutomationRuleStore } from '@/stores/system/phase8';
import { automationRuleApi } from '@/services/system/phase8';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppCard, AppCardTitle, AppCardText, AppTable, AppChip, AppDialog, AppTextField, AppTextarea, AppSelect } from '@/components/ui';
import type { AutomationRule, AutomationRunLog } from '@/types/phase8.types';

const store = useAutomationRuleStore();
const { success, error } = useSnackbar();

const actionTypes = ['SEND_NOTIFICATION', 'RUN_REPORT_SCHEDULE', 'RUN_BACKUP', 'ARCHIVE_LOGS', 'OUTSTANDING_REMINDER', 'COMPUTE_KPI_SNAPSHOTS'];

const dialog = ref(false);
const submitting = ref(false);
const form = reactive({ name: '', description: '', triggerType: 'SCHEDULE', cronExpression: '', eventCode: '', actionType: 'SEND_NOTIFICATION', actionConfig: '' });
const errors = reactive({ name: '' });

function openCreateDialog() {
  Object.assign(form, { name: '', description: '', triggerType: 'SCHEDULE', cronExpression: '', eventCode: '', actionType: 'SEND_NOTIFICATION', actionConfig: '' });
  errors.name = '';
  dialog.value = true;
}

async function onSubmit() {
  errors.name = form.name ? '' : 'Name is required';
  if (errors.name) return;
  submitting.value = true;
  try {
    await store.create(form);
    success('Automation rule created');
    dialog.value = false;
    store.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create automation rule'));
  } finally {
    submitting.value = false;
  }
}

async function onDelete(rule: AutomationRule) {
  try {
    await store.remove(rule.id);
    success('Automation rule deleted');
    store.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete automation rule'));
  }
}

async function onRunNow(rule: AutomationRule) {
  try {
    await store.runNow(rule.id);
    success(`"${rule.name}" executed`);
    store.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to run automation rule'));
  }
}

const logsDialog = ref(false);
const selectedRule = ref<AutomationRule | null>(null);
const runLogs = ref<AutomationRunLog[]>([]);
async function openLogs(rule: AutomationRule) {
  selectedRule.value = rule;
  try {
    runLogs.value = (await automationRuleApi.runLogs(rule.id, { pageSize: 30 })).data.data;
    logsDialog.value = true;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to load run logs'));
  }
}

onMounted(() => store.fetchList());
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
