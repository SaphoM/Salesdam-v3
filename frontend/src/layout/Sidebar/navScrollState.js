/**
 * Persisted scroll offset for the sidebar's nav list.
 *
 * Same root cause as `navGroupState.js`: the page-level `Layout` is rendered by
 * each page rather than as a route-level layout, so navigating remounts the
 * whole `Sidebar` and the nav's scroll offset is lost on every click. Holding it
 * here — in a module-level cache backed by sessionStorage — makes it survive the
 * remount. sessionStorage rather than localStorage because a scroll offset is
 * transient session state, not a preference worth restoring days later.
 */
const STORAGE_KEY = 'salesdam.sidebar.navScroll';

let cache = null;

export const getNavScroll = () => {
  if (cache === null) {
    try {
      const parsed = Number(sessionStorage.getItem(STORAGE_KEY));
      cache = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      // Private-browsing / disabled storage — fall back to in-memory only,
      // which still survives remounts within the session.
      cache = 0;
    }
  }
  return cache;
};

export const setNavScroll = (top) => {
  cache = top > 0 ? top : 0;
  try {
    sessionStorage.setItem(STORAGE_KEY, String(cache));
  } catch {
    // Ignore quota/permission failures; the in-memory cache is still updated.
  }
};
