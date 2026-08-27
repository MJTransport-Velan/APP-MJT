import { onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * Escape goes back one page, everywhere in the app.
 *
 * Wired once from AdminLayout, which wraps every authenticated module, so
 * individual pages need to do nothing to opt in. A route that needs the key
 * for something else can opt out with `meta: { escBack: false }`.
 */

/**
 * A dropdown or menu on screen already owns Escape: the press collapses it.
 * Shared with AppDialog so neither that dialog nor this handler also acts on
 * the same press and yanks the page out from under an open popup.
 */
const POPUP_SELECTORS = ['.app-menu__content', '.app-select__panel'];

export function isPopupOpen(): boolean {
  return POPUP_SELECTORS.some((selector) => document.querySelector(selector) !== null);
}

/** Escape inside a field means "abandon what I'm typing", never "leave the page". */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
}

export function useEscapeBack() {
  const router = useRouter();
  const route = useRoute();

  /**
   * Where Escape lands when there is no in-app history to go back to — a
   * bookmarked deep link, a refresh, a page opened in a new tab. Detail
   * routes name their parent via meta.parentBreadcrumb; for everything else
   * the enclosing path is the natural step up, unless nothing is routed
   * there.
   */
  function fallbackTarget(): string {
    const parent = route.meta.parentBreadcrumb as { to?: string } | undefined;
    if (parent?.to) return parent.to;

    const segments = route.path.split('/').filter(Boolean);
    if (segments.length <= 1) return '/dashboard';
    const candidate = `/${segments.slice(0, -1).join('/')}`;
    return router.resolve(candidate).name === 'not-found' ? '/dashboard' : candidate;
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (route.meta.escBack === false) return;
    if (isTypingTarget(event.target)) return;
    // An open dialog owns Escape too — it closes itself, and the page behind
    // it must stay put.
    if (document.querySelector('.app-dialog-overlay') || isPopupOpen()) return;

    // vue-router parks the previous in-app entry in history.state.back. It is
    // null when this page was entered directly, where router.back() would walk
    // out of the app into whatever the browser was showing before.
    const previous = (window.history.state as { back?: string | null } | null)?.back;
    if (typeof previous === 'string' && previous && previous !== '/login') {
      router.back();
    } else {
      router.replace(fallbackTarget());
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
}
