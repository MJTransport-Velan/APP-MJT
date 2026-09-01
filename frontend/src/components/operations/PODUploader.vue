<template>
  <div>
    <div class="row row-dense">
      <div class="col-12 col-sm-5">
        <AppSelect v-model="docType" :items="typeOptions" label="Document Type" />
      </div>
      <div class="col-12 col-sm-5">
        <AppFileInput v-model="file" label="Select File" accept="image/*,application/pdf" multiple />
      </div>
      <div class="col-12 col-sm-2 d-flex align-center">
        <AppBtn color="primary" block :loading="uploading" :disabled="!file[0]" @click="onUpload">Upload</AppBtn>
      </div>
    </div>

    <AppList class="mt-3">
      <AppListItem v-for="doc in documents" :key="doc.id">
        <template #prepend>
          <AppIcon icon="mdi-file-document-outline" />
        </template>
        <AppListItemTitle>{{ doc.type }}</AppListItemTitle>
        <AppListItemSubtitle>{{ new Date(doc.createdAt).toLocaleString() }}</AppListItemSubtitle>
        <template #append>
          <AppChip size="x-small" :color="statusColor(doc.status)" variant="flat" class="mr-2">{{ doc.status }}</AppChip>
          <AppBtn icon="mdi-eye-outline" variant="text" size="small" :href="uploadUrl(doc.fileUrl)" target="_blank" />
          <AppBtn
            v-if="doc.status === 'PENDING' && canVerify"
            icon="mdi-check-circle-outline"
            variant="text"
            size="small"
            @click="$emit('verify', doc, 'VERIFIED')"
          />
          <AppBtn
            v-if="doc.status === 'PENDING' && canVerify"
            icon="mdi-close-circle-outline"
            variant="text"
            size="small"
            @click="$emit('verify', doc, 'REJECTED')"
          />
        </template>
      </AppListItem>
    </AppList>
    <p v-if="documents.length === 0" class="text-caption text-medium-emphasis">No documents uploaded yet.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  AppSelect,
  AppFileInput,
  AppBtn,
  AppList,
  AppListItem,
  AppIcon,
  AppListItemTitle,
  AppListItemSubtitle,
  AppChip,
} from '@/components/ui';
import type { TripDocument } from '@/types/operations.types';

const props = withDefaults(
  defineProps<{
    documents: TripDocument[];
    canVerify?: boolean;
  }>(),
  { canVerify: false }
);

const emit = defineEmits<{
  upload: [type: string, file: File];
  verify: [doc: TripDocument, status: 'VERIFIED' | 'REJECTED'];
}>();

import { uploadUrl } from '@/utils/uploadUrl';

const docType = ref('POD');
const file = ref<File[]>([]);
const uploading = ref(false);

const typeOptions = [
  { title: 'POD', value: 'POD' },
  { title: 'LR Copy', value: 'LR_COPY' },
  { title: 'Invoice Copy', value: 'INVOICE_COPY' },
  { title: 'Delivery Proof', value: 'DELIVERY_PROOF' },
  { title: 'Other', value: 'OTHER' },
];

function statusColor(status: string) {
  if (status === 'VERIFIED') return 'success';
  if (status === 'REJECTED') return 'error';
  return 'warning';
}

async function onUpload() {
  if (!file.value[0]) return;
  uploading.value = true;
  try {
    emit('upload', docType.value, file.value[0]);
  } finally {
    file.value = [];
    uploading.value = false;
  }
}

defineExpose({ reset: () => { file.value = []; } });
</script>
