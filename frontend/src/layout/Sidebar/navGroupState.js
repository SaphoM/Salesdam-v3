/**
 * Persisted open/closed state for the sidebar's accordion groups.
 *
 * The page-level `Layout` component is rendered by each page rather than as a
 * route-level layout, so navigating remounts the whole `Sidebar`. Any open state
 * held in component state is therefore lost on every click. Keeping it here —
 * in a module-level cache backed by localStorage — makes it survive both the
 * remount and a full page reload.
 */
const STORAGE_KEY = 'salesdam.sidebar.navGroups';

let cache = null;

const load = () => {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // Private-browsing / disabled storage — fall back to in-memory only, which
    // still survives remounts within the session.
    cache = {};
  }
  return cache;
};

/**
 * @param {string} label - group label, used as the key
 * @param {boolean} fallback - used when the group has no stored preference
 */
export const getGroupOpen = (label, fallback) => {
  const state = load();
  return typeof state[label] === 'boolean' ? state[label] : fallback;
};

export const setGroupOpen = (label, open) => {
  const state = load();
  state[label] = open;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota/permission failures; the in-memory cache is still updated.
  }
};
