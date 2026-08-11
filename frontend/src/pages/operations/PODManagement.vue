<template>
  <div>
    <h2 class="text-h6 mb-4">POD Management</h2>

    <AppCard class="pa-4 mb-4">
      <AppSelect
        v-model="selectedTripId"
        :items="tripOptions"
        item-title="tripNumber"
        item-value="id"
        label="Select Trip"
        style="max-width: 360px"
        @update:model-value="onTripSelected"
      />
    </AppCard>

    <AppCard v-if="selectedTripId" class="pa-4">
      <PODUploader
        :documents="podStore.documents"
        :can-verify="canVerify"
        @upload="onUpload"
        @verify="onVerify"
      />
    </AppCard>
    <AppAlert v-else type="info" variant="tonal">Select a trip to view or upload documents.</AppAlert>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePodStore } from '@/stores/operations';
import { tripApi } from '@/services/operations';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import PODUploader from '@/components/operations/PODUploader.vue';
import { AppCard, AppSelect, AppAlert } from '@/components/ui';
import type { Trip, TripDocument } from '@/types/operations.types';

const podStore = usePodStore();
const authStore = useAuthStore();
const { success, error } = useSnackbar();

const canVerify = authStore.hasPermission('pod.verify');

const tripOptions = ref<Trip[]>([]);
const selectedTripId = ref<string | null>(null);

async function onTripSelected(tripId: string) {
  if (!tripId) return;
  await podStore.fetchList({ tripId });
}

async function onUpload(type: string, file: File) {
  if (!selectedTripId.value) return;
  try {
    await podStore.upload(selectedTripId.value, type, file);
    success('Document uploaded successfully');
    onTripSelected(selectedTripId.value);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload document'));
  }
}

async function onVerify(doc: TripDocument, status: 'VERIFIED' | 'REJECTED') {
  try {
    await podStore.verify(doc.id, status);
    success(`Document ${status === 'VERIFIED' ? 'verified' : 'rejected'}`);
    if (selectedTripId.value) onTripSelected(selectedTripId.value);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update document status'));
  }
}

onMounted(async () => {
  const response = await tripApi.list({ pageSize: 200 });
  tripOptions.value = response.data.data;
});
</script>
