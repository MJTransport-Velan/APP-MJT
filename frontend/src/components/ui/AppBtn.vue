<template>
  <component
    :is="tag"
    class="app-btn"
    :class="[
      `app-btn--${variant}`,
      `app-btn--${color || 'default'}`,
      `app-btn--${size}`,
      { 'app-btn--icon': isIconOnly, 'app-btn--block': block, 'app-btn--disabled': disabled || loading },
    ]"
    :to="to"
    :href="href"
    :type="!to && !href ? type : undefined"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <span v-if="loading" class="app-btn__spinner" aria-hidden="true"></span>
    <template v-else>
      <AppIcon v-if="prependIcon" :icon="prependIcon" class="app-btn__icon app-btn__icon--prepend" />
      <AppIcon v-else-if="isIconOnly && typeof icon === 'string' && icon" :icon="icon" class="app-btn__icon" />
      <span v-if="!isIconOnly || (!prependIcon && !icon)" class="app-btn__content"><slot /></span>
      <AppIcon v-if="appendIcon" :icon="appendIcon" class="app-btn__icon app-btn__icon--append" />
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import AppIcon from './AppIcon.vue';

const props = withDefaults(
  defineProps<{
    color?: string;
    variant?: 'flat' | 'elevated' | 'outlined' | 'text' | 'tonal' | 'plain';
    size?: 'x-small' | 'small' | 'default' | 'large' | 'x-large';
    icon?: string | boolean;
    block?: boolean;
    disabled?: boolean;
    loading?: boolean;
    to?: string | Record<string, unknown>;
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    prependIcon?: string;
    appendIcon?: string;
  }>(),
  {
    variant: 'flat',
    size: 'default',
    icon: false,
    block: false,
    disabled: false,
    loading: false,
    type: 'button',
  }
);

defineOptions({ inheritAttrs: false });

const isIconOnly = computed(() => props.icon === true || typeof props.icon === 'string');
const tag = computed(() => (props.to ? RouterLink : props.href ? 'a' : 'button'));
</script>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  padding: 0 16px;
  height: 40px;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  text-decoration: none;
  background: transparent;
  color: var(--color-text);
  transition: background-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  user-select: none;
}
.app-btn:hover:not(.app-btn--disabled) {
  filter: brightness(0.96);
}
.app-btn--disabled {
  cursor: default;
  opacity: 0.5;
  pointer-events: none;
}
.app-btn--block { display: flex; width: 100%; }

.app-btn--x-small { height: 26px; padding: 0 10px; font-size: 0.75rem; }
.app-btn--small { height: 32px; padding: 0 12px; font-size: 0.8125rem; }
.app-btn--large { height: 48px; padding: 0 22px; font-size: 1rem; }
.app-btn--x-large { height: 56px; padding: 0 28px; font-size: 1.0625rem; }

.app-btn--icon {
  padding: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.app-btn--icon.app-btn--x-small { width: 28px; height: 28px; }
.app-btn--icon.app-btn--small { width: 34px; height: 34px; }
.app-btn--icon.app-btn--large { width: 48px; height: 48px; }

/* color + variant combinations */
.app-btn--flat.app-btn--default,
.app-btn--elevated.app-btn--default {
  background: #0a274e;
  color: var(--color-on-primary);
}
.app-btn--elevated { box-shadow: var(--shadow-1); }

.app-btn--text.app-btn--default,
.app-btn--tonal.app-btn--default,
.app-btn--outlined.app-btn--default,
.app-btn--plain.app-btn--default {
  color: var(--color-text);
}
.app-btn--outlined.app-btn--default { border-color: var(--color-border); }
.app-btn--tonal.app-btn--default { background: rgba(0, 0, 0, 0.06); }

.app-btn--flat.app-btn--white,
.app-btn--elevated.app-btn--white {
  background: #fff;
  color: var(--color-primary);
}
.app-btn--text.app-btn--white,
.app-btn--outlined.app-btn--white,
.app-btn--plain.app-btn--white,
.app-btn--tonal.app-btn--white {
  color: #fff;
}
.app-btn--outlined.app-btn--white { border-color: rgba(255, 255, 255, 0.6); }
.app-btn--tonal.app-btn--white { background: rgba(255, 255, 255, 0.16); }

</style>

<style>
/* color variants generated for theme palette colors: primary, secondary, error, success, warning, info */
.app-btn--flat.app-btn--primary, .app-btn--elevated.app-btn--primary { background: var(--color-primary); color: var(--color-on-primary); }
.app-btn--text.app-btn--primary, .app-btn--outlined.app-btn--primary, .app-btn--plain.app-btn--primary { color: var(--color-primary); }
.app-btn--tonal.app-btn--primary { background: rgba(var(--color-primary-rgb), 0.12); color: var(--color-primary); }
.app-btn--outlined.app-btn--primary { border-color: var(--color-primary); }

.app-btn--flat.app-btn--secondary, .app-btn--elevated.app-btn--secondary { background: var(--color-secondary); color: var(--color-on-secondary); }
.app-btn--text.app-btn--secondary, .app-btn--outlined.app-btn--secondary, .app-btn--plain.app-btn--secondary { color: var(--color-secondary); }
.app-btn--tonal.app-btn--secondary { background: rgba(var(--color-secondary-rgb), 0.14); color: var(--color-secondary); }
.app-btn--outlined.app-btn--secondary { border-color: var(--color-secondary); }

.app-btn--flat.app-btn--error, .app-btn--elevated.app-btn--error { background: var(--color-error); color: #fff; }
.app-btn--text.app-btn--error, .app-btn--outlined.app-btn--error, .app-btn--plain.app-btn--error { color: var(--color-error); }
.app-btn--tonal.app-btn--error { background: color-mix(in srgb, var(--color-error) 14%, transparent); color: var(--color-error); }
.app-btn--outlined.app-btn--error { border-color: var(--color-error); }

.app-btn--flat.app-btn--success, .app-btn--elevated.app-btn--success { background: var(--color-success); color: #fff; }
.app-btn--text.app-btn--success, .app-btn--outlined.app-btn--success, .app-btn--plain.app-btn--success { color: var(--color-success); }
.app-btn--tonal.app-btn--success { background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success); }
.app-btn--outlined.app-btn--success { border-color: var(--color-success); }

.app-btn--flat.app-btn--warning, .app-btn--elevated.app-btn--warning { background: var(--color-warning); color: #fff; }
.app-btn--text.app-btn--warning, .app-btn--outlined.app-btn--warning, .app-btn--plain.app-btn--warning { color: var(--color-warning); }
.app-btn--tonal.app-btn--warning { background: color-mix(in srgb, var(--color-warning) 14%, transparent); color: var(--color-warning); }
.app-btn--outlined.app-btn--warning { border-color: var(--color-warning); }

.app-btn--flat.app-btn--info, .app-btn--elevated.app-btn--info { background: var(--color-info); color: #fff; }
.app-btn--text.app-btn--info, .app-btn--outlined.app-btn--info, .app-btn--plain.app-btn--info { color: var(--color-info); }
.app-btn--tonal.app-btn--info { background: color-mix(in srgb, var(--color-info) 14%, transparent); color: var(--color-info); }
.app-btn--outlined.app-btn--info { border-color: var(--color-info); }

.app-btn__spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: app-btn-spin 0.6s linear infinite;
}
@keyframes app-btn-spin {
  to { transform: rotate(360deg); }
}
</style>
