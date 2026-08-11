<template>
  <AppDialog v-model="internalModel" :max-width="420" persistent>
    <AppCardTitle class="text-h6">{{ title }}</AppCardTitle>
    <AppCardText>{{ message }}</AppCardText>
    <AppCardActions>
      <div class="spacer"></div>
      <AppBtn variant="text" @click="onCancel">{{ cancelText }}</AppBtn>
      <AppBtn :color="color" variant="flat" :loading="loading" @click="onConfirm">{{ confirmText }}</AppBtn>
    </AppCardActions>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppDialog, AppCardTitle, AppCardText, AppCardActions, AppBtn } from '@/components/ui';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    color?: string;
    loading?: boolean;
  }>(),
  {
    title: 'Are you sure?',
    message: 'This action cannot be undone.',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    color: 'error',
    loading: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [];
  cancel: [];
}>();

const internalModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

function onConfirm() {
  emit('confirm');
}

function onCancel() {
  emit('cancel');
  internalModel.value = false;
}
</script>
