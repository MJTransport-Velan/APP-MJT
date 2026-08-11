<template>
  <div v-if="favorites.length || recent.length" class="row mt-2 hub-favorites-recents">
    <div v-if="favorites.length" class="col-12 col-md-6">
      <h3 class="hub-favorites-recents__title">Favorite Modules</h3>
      <AppList density="compact">
        <AppListItem v-for="f in favorites" :key="f.path" :to="f.path" :prepend-icon="f.icon" :title="f.title" />
      </AppList>
    </div>
    <div v-if="recent.length" class="col-12 col-md-6">
      <h3 class="hub-favorites-recents__title">Recently Opened</h3>
      <AppList density="compact">
        <AppListItem v-for="r in recent" :key="r.path" :to="r.path" prepend-icon="mdi-history" :title="r.title" />
      </AppList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AppList, AppListItem } from '@/components/ui';
import { useFavorites } from '@/composables/useFavorites';
import { useRecentlyVisited } from '@/composables/useRecentlyVisited';

const { favorites } = useFavorites();
const { recent } = useRecentlyVisited();
</script>

<style scoped>
.hub-favorites-recents__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 8px;
}
</style>
