<template>
  <div class="row mb-4">
    <div v-for="s in stats" :key="s.label" class="col-12 col-sm-6 col-md-3">
      <StatCard :label="s.label" :value="s.value" :icon="s.icon" :icon-color="s.iconColor" :icon-bg="s.iconBg" />
    </div>
  </div>
</template>

<script setup lang="ts">
import StatCard from '@/components/StatCard.vue';

defineProps<{
  stats: { label: string; value: string | number; icon: string; iconColor?: string; iconBg?: string }[];
}>();
</script>
