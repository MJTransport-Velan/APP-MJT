<template>
  <!--
    Microsoft Excel mark, drawn inline rather than as an mdi glyph so it keeps
    its brand colours on any button variant. Deliberately id-free (no clipPath
    or gradient) so many copies can sit on one page without colliding.
  -->
  <svg
    class="excel-icon"
    :style="{ width: `${size}px`, height: `${size}px` }"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Excel"
    focusable="false"
  >
    <!-- Sheet, banded light-to-dark from the top down. -->
    <rect x="12" y="3" width="20" height="6.5" fill="#21A366" />
    <rect x="22" y="3" width="10" height="6.5" fill="#33C481" />
    <rect x="12" y="9.5" width="20" height="6.5" fill="#21A366" />
    <rect x="12" y="16" width="20" height="6.5" fill="#107C41" />
    <rect x="12" y="22.5" width="20" height="6.5" fill="#185C37" />
    <!-- Badge overlapping the sheet, carrying the X. -->
    <rect x="1" y="7" width="17" height="18" rx="2.5" fill="#107C41" />
    <path
      d="M5.7 11.4 13.3 20.6 M13.3 11.4 5.7 20.6"
      stroke="#ffffff"
      stroke-width="2.6"
      stroke-linecap="round"
      fill="none"
    />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 18 });
</script>

<style scoped>
.excel-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
