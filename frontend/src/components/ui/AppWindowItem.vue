<template>
  <div v-if="isActive" class="app-window-item">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { inject, computed, type WritableComputedRef } from 'vue';

const props = defineProps<{ value: string | number }>();
const active = inject<WritableComputedRef<string | number | undefined>>('app-window');
const isActive = computed(() => active?.value === props.value);
</script>
