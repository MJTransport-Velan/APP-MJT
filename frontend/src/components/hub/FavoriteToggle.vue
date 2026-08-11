<template>
  <button
    type="button"
    class="favorite-toggle"
    :class="{ 'favorite-toggle--active': active }"
    :title="active ? 'Remove from favorites' : 'Add to favorites'"
    @click="onClick"
  >
    <AppIcon :icon="active ? 'mdi-star' : 'mdi-star-outline'" size="small" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppIcon } from '@/components/ui';
import { useFavorites } from '@/composables/useFavorites';

const props = defineProps<{ path: string; title: string; icon: string }>();

const { isFavorite, toggleFavorite } = useFavorites();
const active = computed(() => isFavorite(props.path));

function onClick(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  toggleFavorite({ path: props.path, title: props.title, icon: props.icon });
}
</script>

<style scoped>
.favorite-toggle {
  border: none;
  background: transparent;
  color: var(--color-text-disabled);
  cursor: pointer;
  display: flex;
  padding: 4px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}
.favorite-toggle:hover {
  background: var(--color-hover);
  color: var(--color-text-medium);
}
.favorite-toggle--active {
  color: var(--color-secondary);
}
</style>
