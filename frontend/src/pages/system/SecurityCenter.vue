<template>
  <div>
    <h2 class="text-h6 mb-4">Security Center</h2>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="mfa">Multi-Factor Authentication</AppTab>
      <AppTab value="delegation">Approval Delegation</AppTab>
    </AppTabs>

    <AppWindow v-model="activeTab">
      <AppWindowItem value="mfa">
        <AppCard class="pa-4" style="max-width: 480px">
          <div v-if="mfaEnabled">
            <AppAlert type="success" class="mb-4">MFA is enabled on your account.</AppAlert>
            <AppBtn color="error" variant="outlined" @click="onDisableMfa">Disable MFA</AppBtn>
          </div>
          <div v-else-if="!setupResult">
            <p class="text-body-2 text-medium-emphasis mb-4">Protect your account with a TOTP authenticator app (Google Authenticator, Authy, etc.).</p>
            <AppBtn color="primary" @click="onBeginSetup">Set Up MFA</AppBtn>
          </div>
          <div v-else>
            <p class="text-body-2 mb-2">Scan this in your authenticator app, or enter the secret manually:</p>
            <AppTextField :model-value="setupResult.secret" label="Secret" readonly class="mb-2" />
            <AppTextField :model-value="setupResult.otpauthUrl" label="otpauth URL" readonly class="mb-4" />
            <AppTextField v-model="verifyToken" label="Enter 6-digit code to confirm" class="mb-2" />
            <AppBtn color="primary" @click="onVerify">Verify &amp; Enable</AppBtn>
          </div>
          <div v-if="backupCodes.length" class="mt-4">
            <AppAlert type="warning" class="mb-2">Save these backup codes — each can be used once if you lose access to your authenticator.</AppAlert>
            <div class="d-flex flex-wrap ga-2">
              <AppChip v-for="code in backupCodes" :key="code" variant="outlined">{{ code }}</AppChip>
            </div>
          </div>
        </AppCard>
      </AppWindowItem>

      <AppWindowItem value="delegation">
        <div class="d-flex justify-end mb-3">
          <AppBtn color="primary" prepend-icon="mdi-plus" @click="openDelegationDialog">New Delegation</AppBtn>
        </div>
        <AppCard>
          <div class="tblwrap">
            <AppTable density="compact">
              <thead><tr><th>From User</th><th>To User</th><th>Period</th><th>Reason</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
              <tbody>
                <tr v-for="d in delegationStore.items" :key="d.id">
                  <td>{{ d.fromUserId }}</td><td>{{ d.toUserId }}</td>
                  <td>{{ new Date(d.fromDate).toLocaleDateString() }} — {{ new Date(d.toDate).toLocaleDateString() }}</td>
                  <td>{{ d.reason || '-' }}</td>
                  <td><AppChip size="x-small" :color="d.isActive ? 'success' : 'default'">{{ d.isActive ? 'Active' : 'Revoked' }}</AppChip></td>
                  <td class="text-right"><AppBtn v-if="d.isActive" icon="mdi-close-circle-outline" variant="text" size="small" @click="onRevoke(d.id)" /></td>
                </tr>
              </tbody>
            </AppTable>
          </div>
        </AppCard>
      </AppWindowItem>
    </AppWindow>

    <MasterFormDialog v-model="delegationDialog" title="New Approval Delegation" :loading="delegationSubmitting" @submit="onSubmitDelegation" max-width="500">
      <AppTextField v-model="delegationForm.fromUserId" label="From User ID" class="mb-2" />
      <AppTextField v-model="delegationForm.toUserId" label="To User ID (substitute)" class="mb-2" />
      <div class="row row-dense mb-2">
        <div class="col-6"><AppTextField v-model="delegationForm.fromDate" type="date" label="From Date" density="compact" /></div>
        <div class="col-6"><AppTextField v-model="delegationForm.toDate" type="date" label="To Date" density="compact" /></div>
      </div>
      <AppTextField v-model="delegationForm.reason" label="Reason" />
    </MasterFormDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useApprovalDelegationStore } from '@/stores/system/phase8';
import { mfaApi } from '@/services/system/phase8';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import MasterFormDialog from '@/components/masters/MasterFormDialog.vue';
import { AppTabs, AppTab, AppWindow, AppWindowItem, AppCard, AppTable, AppChip, AppBtn, AppTextField, AppAlert } from '@/components/ui';
import type { MfaSetupResult } from '@/types/phase8.types';

const { success, error } = useSnackbar();
const activeTab = ref('mfa');

const delegationStore = useApprovalDelegationStore();

const mfaEnabled = ref(false);
const setupResult = ref<MfaSetupResult | null>(null);
const verifyToken = ref('');
const backupCodes = ref<string[]>([]);

async function onBeginSetup() {
  try {
    setupResult.value = (await mfaApi.beginSetup()).data.data;
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to start MFA setup'));
  }
}
async function onVerify() {
  try {
    const result = await mfaApi.verifyAndEnable(verifyToken.value);
    backupCodes.value = result.data.data.backupCodes;
    mfaEnabled.value = true;
    setupResult.value = null;
    success('MFA enabled');
  } catch (err) {
    error(extractErrorMessage(err, 'Invalid code'));
  }
}
async function onDisableMfa() {
  try {
    await mfaApi.disable();
    mfaEnabled.value = false;
    success('MFA disabled');
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to disable MFA'));
  }
}

const delegationDialog = ref(false);
const delegationSubmitting = ref(false);
const delegationForm = reactive({ fromUserId: '', toUserId: '', fromDate: '', toDate: '', reason: '' });
function openDelegationDialog() {
  Object.assign(delegationForm, { fromUserId: '', toUserId: '', fromDate: '', toDate: '', reason: '' });
  delegationDialog.value = true;
}
async function onSubmitDelegation() {
  delegationSubmitting.value = true;
  try {
    await delegationStore.create(delegationForm);
    success('Delegation created');
    delegationDialog.value = false;
    delegationStore.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to create delegation'));
  } finally {
    delegationSubmitting.value = false;
  }
}
async function onRevoke(id: string) {
  try {
    await delegationStore.revoke(id);
    success('Delegation revoked');
    delegationStore.fetchList();
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to revoke delegation'));
  }
}

onMounted(async () => {
  try {
    mfaEnabled.value = (await mfaApi.status()).data.data.mfaEnabled;
  } catch {
    /* best-effort */
  }
  delegationStore.fetchList();
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
