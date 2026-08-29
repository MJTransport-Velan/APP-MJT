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

/** "freightAmount" -> "Freight Amount", so a toast names the field the way the form labels it. */
function humanizeField(segment: string): string {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * A Zod issue path arrives as ["body", "freightAmount"] — or
 * ["body", "charges", 0, "amount"] for a nested list. The leading request
 * section is noise to the person reading the toast; array indices are not.
 */
function describePath(path: unknown[]): string {
  const segments = path.filter((p) => typeof p === 'string' || typeof p === 'number');
  const trimmed = ['body', 'query', 'params'].includes(String(segments[0])) ? segments.slice(1) : segments;
  return trimmed
    .map((segment) => (typeof segment === 'number' ? `#${segment + 1}` : humanizeField(String(segment))))
    .join(' ');
}

type ApiIssue = { path?: unknown[]; message?: string };

/**
 * Turns the `errors` array the API sends alongside a 422 into something worth
 * reading. Without this every failed validation surfaced as the bare
 * "Validation failed", which tells the user nothing about which field to fix.
 */
function describeIssues(errors: unknown): string {
  if (!Array.isArray(errors) || errors.length === 0) return '';

  const described = errors
    .map((issue) => {
      if (typeof issue === 'string') return issue;
      const { path, message } = (issue ?? {}) as ApiIssue;
      if (!message) return '';
      const field = Array.isArray(path) ? describePath(path) : '';
      return field ? `${field}: ${message}` : message;
    })
    .filter(Boolean);

  if (described.length === 0) return '';
  // A toast is one line — name the first couple of offending fields and count
  // the rest rather than pushing a wall of text off screen.
  const shown = described.slice(0, 2).join('; ');
  return described.length > 2 ? `${shown} (+${described.length - 2} more)` : shown;
}

export function extractErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const anyErr = err as { response?: { data?: { message?: string; errors?: unknown } } };
  const data = anyErr?.response?.data;

  const issues = describeIssues(data?.errors);
  if (issues) return issues;

  return data?.message || fallback;
}
