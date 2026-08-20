import { ref, watch } from 'vue';

const isDark = ref(true);
let initialized = false;

function applyTheme(dark: boolean) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  localStorage.setItem('mj_theme', dark ? 'dark' : 'light');
}

function init() {
  if (initialized) return;
  initialized = true;
  const stored = localStorage.getItem('mj_theme');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  isDark.value = stored ? stored === 'dark' : !!prefersDark;
  applyTheme(isDark.value);
  watch(isDark, (value) => applyTheme(value));
}

export function useTheme() {
  init();
  return { isDark };
}
