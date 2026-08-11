<template>
  <AppTimeline density="compact" side="end" truncate-line="both">
    <AppTimelineItem
      v-for="(entry, idx) in visibleEntries"
      :key="entry.id"
      :dot-color="colorFor(entry.status)"
      size="small"
    >
      <div class="d-flex justify-space-between align-center ga-2">
        <div>
          <div class="text-body-2 font-weight-medium">{{ entry.status }}</div>
          <div v-if="entry.notes" class="text-caption text-medium-emphasis">{{ entry.notes }}</div>
          <AppChip
            v-if="!(idx === visibleEntries.length - 1 && isTerminalStatus(entry.status))"
            size="x-small"
            :color="idx === longestIndex ? 'warning' : 'grey'"
            class="mt-1"
          >
            {{ idx === visibleEntries.length - 1 ? 'Ongoing · ' : '' }}{{ formatDuration(stageDurations[idx]) }}
            <template v-if="idx === longestIndex"> · Longest</template>
          </AppChip>
        </div>
        <span class="text-caption text-medium-emphasis">{{ new Date(entry.changedAt).toLocaleString() }}</span>
      </div>
    </AppTimelineItem>
  </AppTimeline>
  <p v-if="visibleEntries.length === 0" class="text-caption text-medium-emphasis">No status updates yet.</p>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { AppTimeline, AppTimelineItem, AppChip } from '@/components/ui';
import type { TripStatusHistoryEntry } from '@/types/operations.types';

const props = defineProps<{ entries: TripStatusHistoryEntry[] }>();

// DRAFT/PLANNED are pre-approval bookkeeping states, not part of the physical
// journey — matches TripProgress.vue, whose stepper starts at ASSIGNED.
// The timeline log starts one stage earlier, at APPROVED, since that's the
// first status a user actually acted on.
const visibleEntries = computed(() => props.entries.filter((e) => !['DRAFT', 'PLANNED'].includes(e.status)));

// A trip that has ended has no further stage to be "ongoing" in — the
// elapsed time since COMPLETED/CANCELLED means nothing and shouldn't be shown.
function isTerminalStatus(status: string) {
  return status === 'COMPLETED' || status === 'CANCELLED';
}

// Ticks every second so the ongoing (last) stage's duration counts up live
// instead of freezing at whatever Date.now() was on the last render.
const now = ref(Date.now());
let clockHandle: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  clockHandle = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onUnmounted(() => {
  clearInterval(clockHandle);
});

// How long the trip stayed in each stage — the gap to the next status change,
// or to now for the current (last) stage, which is still ongoing.
const stageDurations = computed(() => {
  const list = visibleEntries.value;
  return list.map((entry, idx) => {
    const start = new Date(entry.changedAt).getTime();
    const end = idx < list.length - 1 ? new Date(list[idx + 1].changedAt).getTime() : now.value;
    return end - start;
  });
});

// Flags the stage the vehicle spent the most time in, so a long halt (e.g.
// stuck at a checkpoint) stands out instead of blending into the log. Excludes
// a terminal last entry, whose duration is hidden and meaningless anyway.
const longestIndex = computed(() => {
  const list = visibleEntries.value;
  const durations = stageDurations.value;
  const lastIdx = list.length - 1;
  const count = lastIdx >= 0 && isTerminalStatus(list[lastIdx].status) ? durations.length - 1 : durations.length;
  if (count < 2) return -1;
  let maxIdx = 0;
  for (let i = 1; i < count; i++) {
    if (durations[i] > durations[maxIdx]) maxIdx = i;
  }
  return maxIdx;
});

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function colorFor(status: string) {
  if (status === 'CANCELLED') return 'error';
  if (status === 'COMPLETED') return 'success';
  if (['STARTED', 'LOADING', 'IN_TRANSIT'].includes(status)) return 'primary';
  return 'info';
}
</script>
