<template>
  <div id="app-root">
    <router-view />
    <GlobalSnackbar />
  </div>
</template>

<script setup lang="ts">
import GlobalSnackbar from '@/components/GlobalSnackbar.vue';
</script>
