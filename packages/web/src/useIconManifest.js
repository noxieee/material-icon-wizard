import { ref, shallowRef } from 'vue';
import { getIconManifest } from '@material-icon-wizard/core';
import { ICON_VERSION, ICON_STYLE } from './config.js';

// Keyed by version + style so bumping the pinned version invalidates a stale
// cache rather than serving old icon names.
const CACHE_KEY = `miw:manifest:${ICON_VERSION}:${ICON_STYLE}`;

/**
 * Load the icon-name manifest, cached in localStorage. After the first load,
 * search/existence become instant local lookups against the in-memory Set.
 */
export function useIconManifest() {
  const manifest = shallowRef(null); // Set<string> | null
  const loading = ref(false);
  const error = ref(null);

  async function load() {
    if (manifest.value) return;
    loading.value = true;
    error.value = null;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        manifest.value = new Set(JSON.parse(cached));
        return;
      }
      const names = await getIconManifest(ICON_VERSION, ICON_STYLE);
      manifest.value = names;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify([...names]));
      } catch {
        // localStorage full / unavailable — the in-memory Set still works.
      }
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  return { manifest, loading, error, load };
}
