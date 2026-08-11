<template>
  <i class="mdi app-icon" :class="[iconName, sizeClass]" :style="colorStyle"></i>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    icon?: string;
    size?: string | number;
    color?: string;
  }>(),
  { icon: '' }
);

const iconName = computed(() => props.icon || '');

const sizeClass = computed(() => {
  if (typeof props.size === 'string' && ['x-small', 'small', 'large', 'x-large'].includes(props.size)) {
    return `app-icon--${props.size}`;
  }
  return '';
});

const colorStyle = computed(() => {
  const style: Record<string, string> = {};
  if (typeof props.size === 'number' || (typeof props.size === 'string' && /^\d+$/.test(props.size))) {
    style.fontSize = `${props.size}px`;
  }
  if (props.color) {
    style.color = `var(--color-${props.color}, ${props.color})`;
  }
  return style;
});
</script>

<style scoped>
.app-icon {
  font-size: 24px;
  line-height: 1;
  display: inline-block;
}
.app-icon--x-small { font-size: 14px; }
.app-icon--small { font-size: 18px; }
.app-icon--large { font-size: 30px; }
.app-icon--x-large { font-size: 38px; }
</style>
