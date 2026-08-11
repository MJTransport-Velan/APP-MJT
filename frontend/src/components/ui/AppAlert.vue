<template>
  <div class="app-alert" :class="`app-alert--${type || color || 'info'}`">
    <AppIcon v-if="icon !== false" :icon="resolvedIcon" class="app-alert__icon" />
    <div class="app-alert__content"><slot /></div>
    <button v-if="closable" type="button" class="app-alert__close" @click="$emit('click:close')">
      <AppIcon icon="mdi-close" size="small" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';

const props = withDefaults(
  defineProps<{
    type?: 'success' | 'error' | 'warning' | 'info';
    color?: string;
    icon?: string | boolean;
    closable?: boolean;
    variant?: string;
  }>(),
  { closable: false, icon: undefined }
);

defineEmits<{ 'click:close': [] }>();

const defaultIcons: Record<string, string> = {
  success: 'mdi-check-circle-outline',
  error: 'mdi-alert-circle-outline',
  warning: 'mdi-alert-outline',
  info: 'mdi-information-outline',
};

const resolvedIcon = computed(() => {
  if (typeof props.icon === 'string') return props.icon;
  return defaultIcons[props.type || props.color || 'info'] || defaultIcons.info;
});
</script>

<style scoped>
.app-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}
.app-alert__content { flex: 1 1 auto; }
.app-alert__close { border: none; background: transparent; cursor: pointer; color: inherit; opacity: 0.7; flex-shrink: 0; }
.app-alert__close:hover { opacity: 1; }
.app-alert--success { background: color-mix(in srgb, var(--color-success) 12%, transparent); color: var(--color-success); }
.app-alert--error { background: color-mix(in srgb, var(--color-error) 12%, transparent); color: var(--color-error); }
.app-alert--warning { background: color-mix(in srgb, var(--color-warning) 14%, transparent); color: var(--color-warning); }
.app-alert--info { background: color-mix(in srgb, var(--color-info) 12%, transparent); color: var(--color-info); }
</style>
