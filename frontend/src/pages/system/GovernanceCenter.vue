<template>
  <div>
    <h2 class="text-h6 mb-4">Governance</h2>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="exceptions">Exception Management</AppTab>
      <AppTab value="rules">Business Rules</AppTab>
    </AppTabs>

    <AppWindow v-model="activeTab">
      <AppWindowItem value="exceptions">
        <AppCard class="pa-4 mb-4">
          <div class="row row-dense align-end">
            <div class="col-6 col-sm-3">
              <AppSelect v-model="statusFilter" :items="['OPEN', 'ACKNOWLEDGED', 'RESOLVED']" label="Status" clearable density="compact" hide-details @update:model-value="exceptionStore.fetchList({ status: statusFilter || undefined })" />
            </div>
          </div>
        </AppCard>
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Module</th><th>Type</th><th>Message</th><th>Status</th><th>At</th><th class="text-right">Actions</th></tr></thead>
              <tbody>
                <tr v-for="e in exceptionStore.items" :key="e.id">
                  <td>{{ e.module }}</td>
                  <td><AppChip size="x-small" variant="outlined">{{ e.errorType }}</AppChip></td>
                  <td>{{ e.message }}</td>
                  <td><AppChip size="x-small" :color="e.status === 'OPEN' ? 'error' : e.status === 'ACKNOWLEDGED' ? 'warning' : 'success'">{{ e.status }}</AppChip></td>
                  <td>{{ new Date(e.createdAt).toLocaleString() }}</td>
                  <td class="text-right">
                    <AppBtn v-if="e.status === 'OPEN'" size="small" variant="text" @click="onAck(e.id)">Acknowledge</AppBtn>
                    <AppBtn v-if="e.status !== 'RESOLVED'" size="small" variant="text" color="success" @click="openResolve(e.id)">Resolve</AppBtn>
                  </td>
                </tr>
                <tr v-if="!exceptionStore.items.length"><td colspan="6" class="text-center text-medium-emphasis py-4">No exceptions</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="rules">
        <div class="d-flex justify-end mb-3">
          <AppBtn color="primary" prepend-icon="mdi-plus" @click="openRuleDialog">New Business Rule</AppBtn>
        </div>

        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Name</th><th>Type</th><th>Priority</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
              <tbody>
                <tr v-for="r in ruleStore.items" :key="r.id">
                  <td>{{ r.name }}</td>
                  <td><AppChip size="x-small" variant="outlined">{{ r.ruleType }}</AppChip></td>
                  <td>{{ r.priority }}</td>
                  <td><AppChip size="x-small" :color="r.isActive ? 'success' : 'default'">{{ r.isActive ? 'Active' : 'Inactive' }}</AppChip></td>
                  <td class="text-right"><AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="onDeleteRule(r.id)" /></td>
                </tr>
                <tr v-if="!ruleStore.items.length"><td colspan="5" class="text-center text-medium-emphasis py-4">No business rules configured</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>
    </AppWindow>

    <MasterFormDialog v-model="resolveDialog" title="Resolve Exception" :loading="resolving" @submit="onResolve" max-width="500">
      <AppTextarea v-model="resolutionText" label="Resolution notes" rows="3" />
    </MasterFormDialog>

    <MasterFormDialog v-model="ruleDialog" title="New Business Rule" :loading="ruleSubmitting" @submit="onSubmitRule" max-width="600">
      <AppTextField v-model="ruleForm.name" label="Name" class="mb-2" />
      <AppSelect v-model="ruleForm.ruleType" :items="ruleTypes" label="Rule Type" density="compact" class="mb-2" />
      <AppTextarea v-model="ruleForm.description" label="Description" rows="2" class="mb-2" />
      <AppTextarea v-model="ruleForm.conditionJson" label="Condition (JSON)" rows="3" hint='e.g. {"windowDays":3}' persistent-hint />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useSystemExceptionStore, useBusinessRuleStore } from '@/stores/system/phase8';
import { businessRuleApi } from '@/services/system/phase8';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppTabs, AppTab, AppWindow, AppWindowItem, AppCard, AppTable, AppChip, AppBtn, AppSelect, AppTextField, AppTextarea, AppAlert } from '@/components/ui';

const { success, error } = useSnackbar();
const activeTab = ref('exceptions');

const exceptionStore = useSystemExceptionStore();
const statusFilter = ref<string | null>(null);

async function onAck(id: string) {
  try {
    await exceptionStore.acknowledge(id);
    success('Exception acknowledged');
    exceptionStore.fetchList({ status: statusFilter.value || undefined });
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to acknowledge'));
  }
}

const resolveDialog = ref(false);
const resolving = ref(false);
const resolutionText = ref('');
const resolvingId = ref('');
function openResolve(id: string) {
  resolvingId.value = id;
  resolutionText.value = '';
  resolveDialog.value = true;
}
async function onResolve() {
  resolving.value = true;
  try {
    await exceptionStore.resolve(resolvingId.value, resolutionText.value);
    success('Exception resolved');
    resolveDialog.value = false;
    exceptionStore.fetchList({ status: statusFilter.value || undefined });
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to resolve'));
  } finally {
    resolving.value = false;
  }
}

const ruleStore = useBusinessRuleStore();
const ruleTypes = ['CREDIT_LIMIT', 'PAYMENT', 'LOAN', 'PAYROLL', 'EXPENSE', 'GST', 'APPROVAL', 'DUPLICATE_DETECTION'];
const ruleDialog = ref(false);
const ruleSubmitting = ref(false);
const ruleForm = reactive({ name: '', ruleType: 'DUPLICATE_DETECTION', description: '', conditionJson: '{}' });
function openRuleDialog() {
  Object.assign(ruleForm, { name: '', ruleType: 'DUPLICATE_DETECTION', description: '', conditionJson: '{}' });
  ruleDialog.value = true;
}
async function onSubmitRule() {
  ruleSubmitting.value = true;
  try {
    await ruleStore.create(ruleForm);
    success('Business rule created');
    ruleDialog.value = false;
    ruleStore.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create business rule'));
  } finally {
    ruleSubmitting.value = false;
  }
}
async function onDeleteRule(id: string) {
  try {
    await ruleStore.remove(id);
    success('Business rule deleted');
    ruleStore.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete business rule'));
  }
}

onMounted(() => {
  exceptionStore.fetchList();
  ruleStore.fetchList();
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
