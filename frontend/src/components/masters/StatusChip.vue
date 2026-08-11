<template>
  <AppChip :color="isActive ? 'success' : 'default'" size="small" variant="flat">
    {{ isActive ? 'Active' : 'Inactive' }}
  </AppChip>
</template>

<script setup lang="ts">
import { AppChip } from '@/components/ui';

defineProps<{ isActive: boolean }>();
</script>
