<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Report Schedules</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">New Schedule</AppBtn>
    </div>
    <AppAlert type="info" variant="tonal" class="mb-4">Foundation only — schedules are defined here but not yet executed or emailed automatically; that belongs to a future automation phase.</AppAlert>

    <MasterDataTable :headers="headers" :items="store.items" :items-length="store.items.length" :loading="store.loading" :page-size="100">
      <template #item.frequency="{ item }"><AppChip size="small" variant="outlined">{{ (item as any).frequency }}</AppChip></template>
      <template #item.isActive="{ item }">
        <AppChip size="small" :color="(item as any).isActive ? 'success' : 'default'">{{ (item as any).isActive ? 'Active' : 'Inactive' }}</AppChip>
      </template>
      <template #item.nextRunAt="{ item }">{{ (item as any).nextRunAt ? new Date((item as any).nextRunAt).toLocaleDateString() : '-' }}</template>
      <template #item.actions="{ item }">
        <AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditDialog(item as any)" />
        <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="onDelete(item as any)" />
      </template>
    </MasterDataTable>

    <MasterFormDialog v-model="dialog" :title="editTarget ? 'Edit Report Schedule' : 'New Report Schedule'" :loading="submitting" @submit="onSubmit">
      <AppTextField v-model="form.name" label="Name" :error-messages="errors.name" class="mb-2" />
      <AppTextField v-if="!editTarget" v-model="form.reportKey" label="Report Key (e.g. trial-balance, profit-and-loss)" :error-messages="errors.reportKey" class="mb-2" />
      <AppTextField v-if="!editTarget" v-model="form.category" label="Category (e.g. financial-reports, gst)" :error-messages="errors.category" class="mb-2" />
      <AppSelect v-model="form.frequency" :items="['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY']" label="Frequency" class="mb-2" />
      <AppSelect v-model="form.format" :items="['PDF', 'EXCEL', 'CSV']" label="Format" class="mb-2" />
      <AppTextField v-model="form.recipientEmails" label="Recipient Emails (comma-separated)" class="mb-2" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useReportScheduleStore } from '@/stores/accounts/financialReporting';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterDataTable from '@/components/masters/MasterDataTable.vue';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppBtn, AppSelect, AppTextField, AppChip, AppAlert } from '@/components/ui';
import type { ReportScheduleDefinition } from '@/types/phase7.types';

const store = useReportScheduleStore();
const { success, error } = useSnackbar();

const headers = [
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Report Key', key: 'reportKey', sortable: false },
  { title: 'Category', key: 'category', sortable: false },
  { title: 'Frequency', key: 'frequency', sortable: false },
  { title: 'Next Run', key: 'nextRunAt', sortable: false },
  { title: 'Status', key: 'isActive', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

async function fetchData() {
  await store.fetchList();
}

const dialog = ref(false);
const submitting = ref(false);
const editTarget = ref<ReportScheduleDefinition | null>(null);
const form = reactive({ name: '', reportKey: '', category: '', frequency: 'MONTHLY', format: 'PDF', recipientEmails: '' });
const errors = reactive({ name: '', reportKey: '', category: '' });

function openCreateDialog() {
  editTarget.value = null;
  Object.assign(form, { name: '', reportKey: '', category: '', frequency: 'MONTHLY', format: 'PDF', recipientEmails: '' });
  Object.assign(errors, { name: '', reportKey: '', category: '' });
  dialog.value = true;
}

function openEditDialog(schedule: ReportScheduleDefinition) {
  editTarget.value = schedule;
  Object.assign(form, { name: schedule.name, reportKey: schedule.reportKey, category: schedule.category, frequency: schedule.frequency, format: schedule.format, recipientEmails: schedule.recipientEmails || '' });
  Object.assign(errors, { name: '', reportKey: '', category: '' });
  dialog.value = true;
}

async function onSubmit() {
  errors.name = form.name ? '' : 'Name is required';
  errors.reportKey = !editTarget.value && !form.reportKey ? 'Report key is required' : '';
  errors.category = !editTarget.value && !form.category ? 'Category is required' : '';
  if (errors.name || errors.reportKey || errors.category) return;

  submitting.value = true;
  try {
    if (editTarget.value) {
      await store.update(editTarget.value.id, { name: form.name, frequency: form.frequency, format: form.format, recipientEmails: form.recipientEmails || undefined });
      success('Report Schedule updated');
    } else {
      await store.create({ name: form.name, reportKey: form.reportKey, category: form.category, frequency: form.frequency, format: form.format, recipientEmails: form.recipientEmails || undefined });
      success('Report Schedule created');
    }
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save report schedule'));
  } finally {
    submitting.value = false;
  }
}

async function onDelete(schedule: ReportScheduleDefinition) {
  try {
    await store.remove(schedule.id);
    success('Report Schedule deleted');
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to delete report schedule'));
  }
}

onMounted(fetchData);
</script>
