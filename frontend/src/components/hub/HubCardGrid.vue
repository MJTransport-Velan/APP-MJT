<template>
  <div class="row hub-card-grid">
    <div v-for="(item, idx) in items" :key="itemKey ? (item as any)[itemKey] : idx" class="col-12 col-sm-6 col-lg-4">
      <slot :item="item" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ items: unknown[]; itemKey?: string }>();
</script>
