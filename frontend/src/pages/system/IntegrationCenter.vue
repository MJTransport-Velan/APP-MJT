<template>
  <div>
    <h2 class="text-h6 mb-4">Integration Center</h2>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="settings">Integration Settings</AppTab>
      <AppTab value="webhooks">Webhooks</AppTab>
      <AppTab value="apikeys">API Keys</AppTab>
    </AppTabs>

    <AppWindow v-model="activeTab">
      <AppWindowItem value="settings">
        <p class="text-body-2 text-medium-emphasis mb-3">
          External system configuration (Payment Gateway, Bank API, GPS Tracking, FastTag, E-Way Bill, E-Invoice, Govt Portal, Email/SMS/WhatsApp, Document Storage) — stored as key/value settings rather than a dedicated connector table, since every one of these is just a name and a JSON config today. Add one entry per external system you're integrating with.
        </p>
        <div class="d-flex justify-end mb-3"><AppBtn color="primary" prepend-icon="mdi-plus" @click="openSettingDialog">Add Integration Setting</AppBtn></div>
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Key</th><th>Value</th><th>Description</th><th>Updated</th></tr></thead>
              <tbody>
                <tr v-for="s in integrationSettings" :key="s.id">
                  <td>{{ s.key }}</td><td>{{ s.value }}</td><td>{{ s.description || '-' }}</td>
                  <td>{{ new Date(s.updatedAt).toLocaleString() }}</td>
                </tr>
                <tr v-if="!integrationSettings.length"><td colspan="4" class="text-center text-medium-emphasis py-4">No integrations configured yet</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="webhooks">
        <div class="d-flex justify-end mb-3"><AppBtn color="primary" prepend-icon="mdi-plus" @click="openWebhookDialog">New Webhook</AppBtn></div>
        <AppCard class="mb-4">
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Name</th><th>URL</th><th>Events</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
              <tbody>
                <tr v-for="w in webhookStore.items" :key="w.id">
                  <td>{{ w.name }}</td><td>{{ w.url }}</td><td>{{ w.eventTypes }}</td>
                  <td><AppChip size="x-small" :color="w.isActive ? 'success' : 'default'">{{ w.isActive ? 'Active' : 'Inactive' }}</AppChip></td>
                  <td class="text-right">
                    <AppBtn icon="mdi-send-outline" variant="text" size="small" title="Send Test" @click="onTestWebhook(w.id)" />
                    <AppBtn icon="mdi-delete-outline" variant="text" size="small" @click="onRemoveWebhook(w.id)" />
                  </td>
                </tr>
                <tr v-if="!webhookStore.items.length"><td colspan="5" class="text-center text-medium-emphasis py-4">No webhook subscriptions</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
        <div class="text-subtitle-2 mb-2">Recent Deliveries</div>
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Event</th><th>Status</th><th>Attempts</th><th>Response</th><th>At</th></tr></thead>
              <tbody>
                <tr v-for="d in deliveries" :key="d.id">
                  <td>{{ d.eventType }}</td>
                  <td><AppChip size="x-small" :color="d.status === 'SUCCESS' ? 'success' : d.status === 'FAILED' ? 'error' : 'warning'">{{ d.status }}</AppChip></td>
                  <td>{{ d.attempts }}</td><td>{{ d.responseStatus ?? '-' }}</td><td>{{ new Date(d.createdAt).toLocaleString() }}</td>
                </tr>
                <tr v-if="!deliveries.length"><td colspan="5" class="text-center text-medium-emphasis py-4">No deliveries yet</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="apikeys">
        <div class="d-flex justify-end mb-3"><AppBtn color="primary" prepend-icon="mdi-plus" @click="openApiKeyDialog">New API Key</AppBtn></div>
        <AppAlert v-if="newRawKey" type="warning" class="mb-4">
          Copy this key now — it will not be shown again: <strong>{{ newRawKey }}</strong>
        </AppAlert>
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Rate Limit</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
              <tbody>
                <tr v-for="k in apiKeyStore.items" :key="k.id">
                  <td>{{ k.name }}</td><td><code>{{ k.keyPrefix }}...</code></td><td>{{ k.scopes }}</td>
                  <td>{{ k.rateLimitPerMinute }}/min</td>
                  <td><AppChip size="x-small" :color="k.isActive ? 'success' : 'default'">{{ k.isActive ? 'Active' : 'Revoked' }}</AppChip></td>
                  <td class="text-right"><AppBtn v-if="k.isActive" icon="mdi-close-circle-outline" variant="text" size="small" @click="onRevokeKey(k.id)" /></td>
                </tr>
                <tr v-if="!apiKeyStore.items.length"><td colspan="6" class="text-center text-medium-emphasis py-4">No API keys</td></tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>
    </AppWindow>

    <MasterFormDialog v-model="settingDialog" title="Add Integration Setting" :loading="settingSubmitting" @submit="onSubmitSetting" max-width="500">
      <AppTextField v-model="settingForm.key" label="Key" placeholder="e.g. PAYMENT_GATEWAY, GPS_TRACKING" class="mb-2" />
      <AppTextarea v-model="settingForm.value" label="Value (JSON config)" rows="3" hint='e.g. {"testUrl":"https://api.example.com/health"}' persistent-hint class="mb-2" />
      <AppTextField v-model="settingForm.description" label="Description" />
    </MasterFormDialog>

    <MasterFormDialog v-model="webhookDialog" title="New Webhook Subscription" :loading="webhookSubmitting" @submit="onSubmitWebhook" max-width="600">
      <AppTextField v-model="webhookForm.name" label="Name" class="mb-2" />
      <AppTextField v-model="webhookForm.url" label="Target URL" class="mb-2" />
      <AppTextField v-model="webhookForm.eventTypesCsv" label="Event Types (comma-separated)" hint="e.g. voucher.approved, exception.created" persistent-hint />
    </MasterFormDialog>

    <MasterFormDialog v-model="apiKeyDialog" title="New API Key" :loading="apiKeySubmitting" @submit="onSubmitApiKey" max-width="500">
      <AppTextField v-model="apiKeyForm.name" label="Name" class="mb-2" />
      <AppTextField v-model="apiKeyForm.scopesCsv" label="Scopes (comma-separated)" class="mb-2" />
      <AppTextField v-model.number="apiKeyForm.rateLimitPerMinute" type="number" label="Rate Limit (per minute)" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useWebhookSubscriptionStore, useApiKeyStore } from '@/stores/system/phase8';
import { webhookApi, systemSettingApi } from '@/services/system/phase8';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppTabs, AppTab, AppWindow, AppWindowItem, AppCard, AppTable, AppChip, AppBtn, AppTextField, AppTextarea, AppAlert } from '@/components/ui';
import type { WebhookDelivery, SystemSetting } from '@/types/phase8.types';

const { success, error } = useSnackbar();
const activeTab = ref('settings');

// Integration Settings — folded into the generic SystemSetting store
// (category INTEGRATION) rather than a dedicated IntegrationConnector
// model/service/UI, per the architecture optimization pass.
const integrationSettings = ref<SystemSetting[]>([]);
const settingDialog = ref(false);
const settingSubmitting = ref(false);
const settingForm = reactive({ key: '', value: '', description: '' });
async function fetchIntegrationSettings() {
  integrationSettings.value = (await systemSettingApi.list('INTEGRATION')).data.data;
}
function openSettingDialog() {
  Object.assign(settingForm, { key: '', value: '', description: '' });
  settingDialog.value = true;
}
async function onSubmitSetting() {
  settingSubmitting.value = true;
  try {
    await systemSettingApi.set({ category: 'INTEGRATION', key: settingForm.key, value: settingForm.value, description: settingForm.description });
    success('Integration setting saved');
    settingDialog.value = false;
    fetchIntegrationSettings();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to save integration setting'));
  } finally {
    settingSubmitting.value = false;
  }
}

const webhookStore = useWebhookSubscriptionStore();
const deliveries = ref<WebhookDelivery[]>([]);
const webhookDialog = ref(false);
const webhookSubmitting = ref(false);
const webhookForm = reactive({ name: '', url: '', eventTypesCsv: '' });
function openWebhookDialog() {
  Object.assign(webhookForm, { name: '', url: '', eventTypesCsv: '' });
  webhookDialog.value = true;
}
async function onSubmitWebhook() {
  webhookSubmitting.value = true;
  try {
    await webhookStore.create({ name: webhookForm.name, url: webhookForm.url, eventTypes: webhookForm.eventTypesCsv.split(',').map((s) => s.trim()).filter(Boolean) });
    success('Webhook subscription created');
    webhookDialog.value = false;
    webhookStore.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create webhook'));
  } finally {
    webhookSubmitting.value = false;
  }
}
async function onTestWebhook(id: string) {
  try {
    await webhookStore.test(id);
    success('Test webhook sent');
    fetchDeliveries();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to send test webhook'));
  }
}
async function onRemoveWebhook(id: string) {
  try {
    await webhookStore.remove(id);
    success('Webhook removed');
    webhookStore.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to remove webhook'));
  }
}
async function fetchDeliveries() {
  deliveries.value = (await webhookApi.deliveries({ pageSize: 30 })).data.data;
}

const apiKeyStore = useApiKeyStore();
const newRawKey = ref('');
const apiKeyDialog = ref(false);
const apiKeySubmitting = ref(false);
const apiKeyForm = reactive({ name: '', scopesCsv: '', rateLimitPerMinute: 60 });
function openApiKeyDialog() {
  Object.assign(apiKeyForm, { name: '', scopesCsv: '', rateLimitPerMinute: 60 });
  apiKeyDialog.value = true;
}
async function onSubmitApiKey() {
  apiKeySubmitting.value = true;
  try {
    const created = await apiKeyStore.create({ name: apiKeyForm.name, scopes: apiKeyForm.scopesCsv.split(',').map((s) => s.trim()).filter(Boolean), rateLimitPerMinute: apiKeyForm.rateLimitPerMinute });
    newRawKey.value = created.rawKey || '';
    success('API key created');
    apiKeyDialog.value = false;
    apiKeyStore.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create API key'));
  } finally {
    apiKeySubmitting.value = false;
  }
}
async function onRevokeKey(id: string) {
  try {
    await apiKeyStore.revoke(id);
    success('API key revoked');
    apiKeyStore.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to revoke API key'));
  }
}

onMounted(() => {
  fetchIntegrationSettings();
  webhookStore.fetchList();
  apiKeyStore.fetchList();
  fetchDeliveries();
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
