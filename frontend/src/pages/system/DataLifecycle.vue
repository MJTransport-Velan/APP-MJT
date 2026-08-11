<template>
  <div>
    <h2 class="text-h6 mb-4">Data Lifecycle</h2>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="backup">Backup &amp; Recovery</AppTab>
      <AppTab value="archive">Data Archiving</AppTab>
      <AppTab value="import">Import Framework</AppTab>
    </AppTabs>

    <AppWindow v-model="activeTab">
      <AppWindowItem value="backup">
        <div class="d-flex justify-end mb-3">
          <AppBtn color="primary" prepend-icon="mdi-database-export-outline" :loading="backingUp" @click="onRunBackup">Run Backup Now</AppBtn>
        </div>
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Type</th><th>Status</th><th>File</th><th>Size</th><th>Started</th><th>Verified</th><th class="text-right">Actions</th></tr></thead>
              <tbody>
                <tr v-for="b in backupStore.items" :key="b.id">
                  <td>{{ b.type }} / {{ b.triggeredBy }}</td>
                  <td><AppChip size="x-small" :color="b.status === 'SUCCESS' ? 'success' : b.status === 'FAILED' ? 'error' : 'warning'">{{ b.status }}</AppChip></td>
                  <td>{{ b.fileName || '-' }}</td>
                  <td>{{ b.sizeBytes ? formatBytes(b.sizeBytes) : '-' }}</td>
                  <td>{{ new Date(b.startedAt).toLocaleString() }}</td>
                  <td>{{ b.verifiedAt ? new Date(b.verifiedAt).toLocaleString() : '-' }}</td>
                  <td class="text-right">
                    <AppBtn v-if="b.status === 'SUCCESS' && !b.verifiedAt" size="small" variant="text" @click="onVerify(b.id)">Verify</AppBtn>
                  </td>
                </tr>
                <tr v-if="!backupStore.items.length"><td colspan="7" class="text-center text-medium-emphasis py-4">No backups yet</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="archive">
        <AppCard class="pa-4 mb-4">
          <div class="row row-dense align-end">
            <div class="col-6 col-sm-3"><AppSelect v-model="archiveForm.scope" :items="archiveScopes" label="Scope" density="compact" hide-details /></div>
            <div class="col-6 col-sm-3"><AppTextField v-model.number="archiveForm.cutoffDays" type="number" label="Older than (days)" density="compact" hide-details /></div>
            <div class="col-6 col-sm-3"><AppBtn color="primary" variant="flat" block :loading="archiving" @click="onRunArchive">Run Archive</AppBtn></div>
          </div>
        </AppCard>
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Scope</th><th>Cutoff</th><th>Records Archived</th><th>Status</th><th>Started</th></tr></thead>
              <tbody>
                <tr v-for="a in archiveStore.items" :key="a.id">
                  <td>{{ a.scope }}</td><td>{{ new Date(a.cutoffDate).toLocaleDateString() }}</td>
                  <td>{{ a.recordsArchived }}</td>
                  <td><AppChip size="x-small" :color="a.status === 'SUCCESS' ? 'success' : a.status === 'FAILED' ? 'error' : 'warning'">{{ a.status }}</AppChip></td>
                  <td>{{ new Date(a.startedAt).toLocaleString() }}</td>
                </tr>
                <tr v-if="!archiveStore.items.length"><td colspan="5" class="text-center text-medium-emphasis py-4">No archive runs yet</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="import">
        <AppCard class="pa-4 mb-4">
          <div class="row row-dense align-end">
            <div class="col-6 col-sm-3"><AppSelect v-model="importEntityType" :items="importEntityTypes" label="Entity Type" density="compact" hide-details /></div>
            <div class="col-6 col-sm-4"><AppFileInput v-model="importFile" label="Excel File" accept=".xlsx,.xls" /></div>
            <div class="col-6 col-sm-3"><AppBtn color="primary" variant="flat" block :loading="importing" :disabled="!importFile" @click="onRunImport">Upload &amp; Import</AppBtn></div>
          </div>
        </AppCard>
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Entity</th><th>File</th><th>Rows</th><th>Success</th><th>Failed</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="batch in importBatches" :key="batch.id" class="clickable" @click="openBatchErrors(batch)">
                  <td>{{ batch.entityType }}</td><td>{{ batch.fileName }}</td><td>{{ batch.totalRows }}</td>
                  <td class="text-success">{{ batch.successRows }}</td><td :class="batch.failedRows ? 'text-error' : ''">{{ batch.failedRows }}</td>
                  <td><AppChip size="x-small" :color="batch.status === 'COMPLETED' ? 'success' : batch.status === 'FAILED' ? 'error' : 'warning'">{{ batch.status }}</AppChip></td>
                </tr>
                <tr v-if="!importBatches.length"><td colspan="6" class="text-center text-medium-emphasis py-4">No imports yet</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>
    </AppWindow>

    <AppDialog v-model="errorsDialog" max-width="600">
      <AppCard v-if="selectedBatch">
        <AppCardTitle class="d-flex justify-space-between align-center">
          <span class="text-h6">Import Errors — {{ selectedBatch.fileName }}</span>
          <AppBtn icon="mdi-close" variant="text" size="small" @click="errorsDialog = false" />
        </AppCardTitle>
        <AppCardText>
          <div v-for="e in selectedBatch.errors" :key="e.row" class="mb-2">
            <span class="font-weight-medium">Row {{ e.row }}:</span> {{ e.error }}
          </div>
          <div v-if="!selectedBatch.errors.length" class="text-medium-emphasis">No errors — every row imported successfully.</div>
        </AppCardText>
      </AppCard>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useBackupStore, useArchiveRunStore } from '@/stores/system/phase8';
import { importApi } from '@/services/system/phase8';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import {
  AppTabs, AppTab, AppWindow, AppWindowItem, AppCard, AppCardTitle, AppCardText, AppTable, AppChip, AppBtn,
  AppSelect, AppTextField, AppFileInput, AppDialog,
} from '@/components/ui';
import type { ImportBatch } from '@/types/phase8.types';

const { success, error } = useSnackbar();
const activeTab = ref('backup');

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const backupStore = useBackupStore();
const backingUp = ref(false);
async function onRunBackup() {
  backingUp.value = true;
  try {
    const result = await backupStore.runManual();
    if (result.status === 'SUCCESS') success('Backup completed');
    else error(result.errorMessage || 'Backup failed');
    backupStore.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to run backup'));
  } finally {
    backingUp.value = false;
  }
}
async function onVerify(id: string) {
  try {
    const result = await backupStore.verify(id);
    if (result.verificationPassed) success(`Restore validation passed: ${result.verificationDetail}`);
    else error(`Restore validation failed: ${result.verificationDetail}`);
    backupStore.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to verify backup'));
  }
}

const archiveStore = useArchiveRunStore();
const archiveScopes = ['AUDIT_LOG', 'API_REQUEST_LOG', 'WEBHOOK_DELIVERY'];
const archiveForm = reactive({ scope: 'AUDIT_LOG', cutoffDays: 365 });
const archiving = ref(false);
async function onRunArchive() {
  archiving.value = true;
  try {
    const result = await archiveStore.run(archiveForm.scope, archiveForm.cutoffDays);
    if (result.status === 'SUCCESS') success(`Archived ${result.recordsArchived} record(s)`);
    else error(result.errorMessage || 'Archive failed');
    archiveStore.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to run archive'));
  } finally {
    archiving.value = false;
  }
}

const importEntityTypes = ['SUPPLIER', 'EMPLOYEE', 'DRIVER'];
const importEntityType = ref('SUPPLIER');
const importFile = ref<File | null>(null);
const importing = ref(false);
const importBatches = ref<ImportBatch[]>([]);
async function fetchImportBatches() {
  importBatches.value = (await importApi.list({ pageSize: 30 })).data.data;
}
async function onRunImport() {
  if (!importFile.value) return;
  importing.value = true;
  try {
    const result = await importApi.run(importEntityType.value, importFile.value);
    success(`Import ${result.data.data.status}: ${result.data.data.successRows}/${result.data.data.totalRows} rows succeeded`);
    importFile.value = null;
    fetchImportBatches();
  } catch (err) {
    error(extractErrorMessage(err, 'Import failed'));
  } finally {
    importing.value = false;
  }
}

const errorsDialog = ref(false);
const selectedBatch = ref<ImportBatch | null>(null);
async function openBatchErrors(batch: ImportBatch) {
  selectedBatch.value = (await importApi.getById(batch.id)).data.data;
  errorsDialog.value = true;
}

onMounted(() => {
  backupStore.fetchList();
  archiveStore.fetchList();
  fetchImportBatches();
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
.clickable {
  cursor: pointer;
}
</style>
