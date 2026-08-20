<template>
  <!--
    The single Excel download control. Everything that produces an .xlsx uses
    this, so the mark and wording stay identical across the app — AppBtn's
    prepend-icon only accepts an mdi glyph name, hence the icon goes in the slot.
  -->
  <AppBtn
    class="excel-btn"
    :variant="variant"
    :size="size"
    :loading="loading"
    :disabled="disabled"
    :block="block"
    @click="$emit('click', $event)"
  >
    <span class="excel-btn__inner">
      <ExcelIcon :size="iconSize" />
      <span>{{ label }}</span>
    </span>
  </AppBtn>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppBtn from './AppBtn.vue';
import ExcelIcon from './ExcelIcon.vue';

const props = withDefaults(
  defineProps<{
    label?: string;
    variant?: 'flat' | 'elevated' | 'outlined' | 'text' | 'tonal' | 'plain';
    size?: 'x-small' | 'small' | 'default' | 'large' | 'x-large';
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
  }>(),
  {
    label: 'Excel',
    variant: 'outlined',
    size: 'default',
    loading: false,
    disabled: false,
    block: false,
  }
);

defineEmits<{ click: [event: MouseEvent] }>();

const iconSize = computed(() => (props.size === 'x-small' || props.size === 'small' ? 16 : 18));
</script>

<style scoped>
/* AppBtn wraps slot content in a block span, so the row is rebuilt here. */
.excel-btn__inner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
