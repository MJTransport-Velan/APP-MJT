<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">System Configuration</h2>
      <AppBtn color="primary" prepend-icon="mdi-plus" @click="openDialog">Add Setting</AppBtn>
    </div>

    <div v-for="category in categories" :key="category" class="mb-6">
      <div class="text-subtitle-2 mb-2">{{ category }}</div>
      <AppCard>
        <div class="tblwrap">
          <AppTable density="compact">
            <thead><tr><th>Key</th><th>Value</th><th>Description</th><th>Updated</th><th class="text-right">Actions</th></tr></thead>
            <tbody>
              <tr v-for="s in byCategory(category)" :key="s.id">
                <td>{{ s.key }}</td><td>{{ s.value }}</td><td>{{ s.description || '-' }}</td>
                <td>{{ new Date(s.updatedAt).toLocaleString() }}</td>
                <td class="text-right"><AppBtn icon="mdi-pencil-outline" variant="text" size="small" @click="openEdit(s)" /></td>
              </tr>
              <tr v-if="!byCategory(category).length"><td colspan="5" class="text-center text-medium-emphasis py-4">No settings in this category yet</td></tr>
            </tbody>
          </AppTable>
        </div>
      </AppCard>
    </div>

    <MasterFormDialog v-model="dialog" :title="editing ? 'Edit Setting' : 'Add Setting'" :loading="submitting" @submit="onSubmit" max-width="500">
      <AppSelect v-model="form.category" :items="categories" label="Category" density="compact" class="mb-2" :disabled="editing" />
      <AppTextField v-model="form.key" label="Key" class="mb-2" :disabled="editing" />
      <AppTextField v-model="form.value" label="Value" class="mb-2" />
      <AppTextField v-model="form.description" label="Description" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { systemSettingApi } from '@/services/system/phase8';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppCard, AppTable, AppBtn, AppSelect, AppTextField } from '@/components/ui';
import type { SystemSetting } from '@/types/phase8.types';

const { success, error } = useSnackbar();
const categories = ['GENERAL', 'ACCOUNTING', 'NOTIFICATION', 'WORKFLOW', 'BACKUP', 'SECURITY', 'API', 'INTEGRATION'];
const settings = ref<SystemSetting[]>([]);

function byCategory(category: string) {
  return settings.value.filter((s) => s.category === category);
}

async function fetchData() {
  settings.value = (await systemSettingApi.list()).data.data;
}

const dialog = ref(false);
const submitting = ref(false);
const editing = ref(false);
const form = reactive({ category: 'GENERAL', key: '', value: '', description: '' });

function openDialog() {
  Object.assign(form, { category: 'GENERAL', key: '', value: '', description: '' });
  editing.value = false;
  dialog.value = true;
}
function openEdit(s: SystemSetting) {
  Object.assign(form, { category: s.category, key: s.key, value: s.value, description: s.description || '' });
  editing.value = true;
  dialog.value = true;
}

async function onSubmit() {
  submitting.value = true;
  try {
    await systemSettingApi.set(form);
    success('Setting saved');
    dialog.value = false;
    fetchData();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save setting'));
  } finally {
    submitting.value = false;
  }
}

onMounted(fetchData);
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
