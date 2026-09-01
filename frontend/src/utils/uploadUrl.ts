import { useAuthStore } from '@/stores/auth.store';

/**
 * Origin of the API host, without the trailing /api — uploaded files are
 * served from /uploads, which sits beside the API rather than under it.
 */
export const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

/**
 * Absolute URL for a stored file, carrying the access token.
 *
 * /uploads is no longer world-readable — it holds vehicle papers, driver
 * licences, PODs and bank statements. The browser cannot attach an
 * Authorization header to an `<img src>` or a `target="_blank"` link, so the
 * token rides as a query parameter for exactly those two cases; the server
 * accepts either form.
 *
 * Returns an empty string when there is no stored path, so a caller can bind
 * it straight to `src` behind a `v-if` without emitting a request to the
 * page's own URL.
 */
export function uploadUrl(storedPath: string | null | undefined): string {
  if (!storedPath) return '';
  const auth = useAuthStore();
  const base = `${apiOrigin}${storedPath.startsWith('/') ? '' : '/'}${storedPath}`;
  if (!auth.accessToken) return base;
  return `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(auth.accessToken)}`;
}
