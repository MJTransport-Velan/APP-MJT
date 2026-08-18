<template>
  <AppCard class="hub-card" :to="to">
    <div class="hub-card__bg" :style="{ backgroundImage: `url(${backgroundImage})` }"></div>
    <div class="hub-card__content">
      <div class="hub-card__header">
        <div class="hub-card__icon" :style="{ background: iconBg || 'rgba(30,58,138,0.1)' }">
          <AppIcon :icon="icon" size="28" :color="iconColor" />
        </div>
        <FavoriteToggle v-if="favoritable" :path="to" :title="title" :icon="icon" />
      </div>
      <div class="hub-card__body">
      <div>
      <h3 class="hub-card__title">{{ title }}</h3>
      <p v-if="description" class="hub-card__description">{{ description }}</p>
</div>
<div v-if="stats?.length" class="hub-card__stats">
        <div v-for="s in stats" :key="s.label" class="hub-card__stat">
          <span class="hub-card__stat-value" :style="{ color: s.color }">{{ s.value }}</span>
          <span class="hub-card__stat-label">{{ s.label }}</span>
        </div>
      </div>
</div>

      

      <div class="hub-card__footer">
        <span class="hub-card__open">{{ openLabel || 'Open' }}</span>
        <AppIcon icon="mdi-arrow-right" size="small" />
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppCard, AppIcon } from '@/components/ui';
import FavoriteToggle from './FavoriteToggle.vue';
import bg1 from '@/assets/card-background/image_1.png';
import bg2 from '@/assets/card-background/image_2.png';
import bg3 from '@/assets/card-background/image_3.png';
import bg4 from '@/assets/card-background/image_4.png';
import bg5 from '@/assets/card-background/image_5.png';
import bg6 from '@/assets/card-background/image_6.png';
import bg7 from '@/assets/card-background/image_7.png';
import bg8 from '@/assets/card-background/image_8.png';

const CARD_BACKGROUNDS = [bg1, bg2, bg3, bg4, bg5, bg6, bg7, bg8];

const props = withDefaults(
  defineProps<{
    icon: string;
    iconColor?: string;
    iconBg?: string;
    title: string;
    description?: string;
    stats?: { label: string; value: string | number; color?: string }[];
    to: string;
    openLabel?: string;
    favoritable?: boolean;
    backgroundImages?: string[];
  }>(),
  { favoritable: true }
);

// Deterministic pick so a given card always shows the same background across renders/reloads.
const backgroundImage = computed(() => {
  const palette = props.backgroundImages?.length ? props.backgroundImages : CARD_BACKGROUNDS;
  let hash = 0;
  for (let i = 0; i < props.title.length; i++) hash = (hash * 31 + props.title.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
});
</script>

<style scoped>
.hub-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 5px 5px 10px 3px #d1d3db78;
}
.hub-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-3);
}

.hub-card__bg {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 96px;
  background-repeat: no-repeat;
  background-position: bottom center;
  background-size: 100% auto;
  mix-blend-mode: multiply;
  opacity: 0.3;
  -webkit-mask-image: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.85) 40%, #000 100%);
  mask-image: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.85) 40%, #000 100%);
  pointer-events: none;
  z-index: 0;
} 

.hub-card__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.hub-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}
.hub-card__icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hub-card__body {
      display: grid;
    grid-template-columns: 80% 20%;
}

.hub-card__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 6px;
}
.hub-card__description {
  font-size: 13px;
  color: var(--color-text-medium);
  margin: 0 0 14px;
  flex: 1 1 auto;
    font-weight: 500;
}

.hub-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}
.hub-card__stat {
  display: flex;
  flex-direction: column;
}
.hub-card__stat-value {
      font-size: 25px;
    font-weight: 900;
    color: var(--color-text); 
}
.hub-card__stat-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-medium);
}

.hub-card__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--color-divider);
  color: #0a1431;
  font-size: 13px;
  font-weight: 600;
  justify-content: end;
}
</style>
