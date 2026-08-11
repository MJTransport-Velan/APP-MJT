<template>
  <AppDialog v-model="internalModel" :max-width="maxWidth" persistent>
    <AppCard>
      <AppCardTitle class="text-h6">{{ title }}</AppCardTitle>
      <AppCardText>
        <slot />
      </AppCardText>
      <AppCardActions>
        <div class="spacer"></div>
        <AppBtn variant="text" @click="onCancel">Cancel</AppBtn>
        <AppBtn color="primary" variant="flat" :loading="loading" @click="$emit('submit')">Save</AppBtn>
      </AppCardActions>
    </AppCard>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppDialog, AppCard, AppCardTitle, AppCardText, AppCardActions, AppBtn } from '@/components/ui';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    loading?: boolean;
    maxWidth?: string | number;
  }>(),
  {
    loading: false,
    maxWidth: 560,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [];
  cancel: [];
}>();

const internalModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

function onCancel() {
  emit('cancel');
  internalModel.value = false;
}
</script>
