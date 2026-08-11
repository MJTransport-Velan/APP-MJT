import { reactive } from 'vue';

interface SnackbarState {
  show: boolean;
  text: string;
  color: 'success' | 'error' | 'info' | 'warning';
}

// Single shared reactive instance so any component can trigger the same
// snackbar without prop-drilling or duplicating state per page.
const state = reactive<SnackbarState>({
  show: false,
  text: '',
  color: 'success',
});

function notify(text: string, color: SnackbarState['color'] = 'success') {
  state.text = text;
  state.color = color;
  state.show = true;
}

export function useSnackbar() {
  return {
    snackbar: state,
    success: (text: string) => notify(text, 'success'),
    error: (text: string) => notify(text, 'error'),
    info: (text: string) => notify(text, 'info'),
    warning: (text: string) => notify(text, 'warning'),
  };
}

export function extractErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const anyErr = err as { response?: { data?: { message?: string } } };
  return anyErr?.response?.data?.message || fallback;
}
