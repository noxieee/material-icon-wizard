// Material Icons (classic fixed-weight set) as static SVGs from the
// @material-icons/svg npm package, served over jsDelivr (CORS-open, so this
// works from browser JS and Node alike). Everything here uses the global
// `fetch` so the module stays isomorphic.

const CDN_BASE = 'https://cdn.jsdelivr.net/npm';
const DATA_API_BASE = 'https://data.jsdelivr.com/v1/packages/npm';
const PACKAGE = '@material-icons/svg';

const DEFAULT_STYLE = 'round';

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build the CDN URL for one icon SVG.
 * @param {string} name snake_case icon name, e.g. "lock_open"
 * @param {string} version pinned package version, e.g. "1.0.33"
 * @param {string} [style="round"]
 * @returns {string}
 */
export function getIconUrl(name, version, style = DEFAULT_STYLE) {
  return `${CDN_BASE}/${PACKAGE}@${version}/svg/${name}/${style}.svg`;
}

/**
 * Fetch the package's flat file listing once and reduce it to the set of icon
 * names available in the given style. Callers cache the result themselves
 * (localStorage in the web app, an OS cache dir in the CLI), keyed by version
 * so a version bump invalidates a stale manifest.
 *
 * @param {string} version pinned package version
 * @param {string} [style="round"]
 * @returns {Promise<Set<string>>}
 */
export async function getIconManifest(version, style = DEFAULT_STYLE) {
  const url = `${DATA_API_BASE}/${PACKAGE}@${version}?structure=flat`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch icon manifest: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const pattern = new RegExp(`^/svg/([^/]+)/${escapeRegExp(style)}\\.svg$`);
  const names = new Set();
  for (const file of data.files ?? []) {
    const match = pattern.exec(file.name);
    if (match) names.add(match[1]);
  }
  if (names.size === 0) {
    throw new Error(`Manifest for ${PACKAGE}@${version} contained no "${style}" icons`);
  }
  return names;
}

/**
 * @param {string} name
 * @param {Set<string>} manifest from getIconManifest()
 * @returns {boolean}
 */
export function iconExists(name, manifest) {
  return manifest.has(name);
}

/**
 * Download one SVG's source text.
 * @param {string} url from getIconUrl()
 * @returns {Promise<string>}
 */
export async function downloadIconSvg(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download SVG (${res.status} ${res.statusText}): ${url}`);
  }
  return res.text();
}

// Treat _, -, and whitespace as equivalent so "lock open" matches "lock_open".
function normalizeForSearch(str) {
  return str.toLowerCase().replace(/[\s_-]+/g, '_');
}

/**
 * Local, in-memory ranked search over an already-fetched manifest — no network.
 * Prefix matches rank ahead of substring matches; within each, shorter names
 * (closer to an exact hit) rank first, then alphabetical. Case-insensitive and
 * separator-insensitive. Capped since each result needs a preview thumbnail.
 *
 * @param {string} query
 * @param {Set<string>} manifest
 * @param {number} [limit=20]
 * @returns {string[]}
 */
export function searchIcons(query, manifest, limit = 20) {
  const q = normalizeForSearch(query.trim());
  if (q === '') return [];

  const prefix = [];
  const substring = [];
  for (const name of manifest) {
    const idx = normalizeForSearch(name).indexOf(q);
    if (idx === 0) prefix.push(name);
    else if (idx > 0) substring.push(name);
  }

  const byRelevance = (a, b) => a.length - b.length || a.localeCompare(b);
  prefix.sort(byRelevance);
  substring.sort(byRelevance);
  return prefix.concat(substring).slice(0, limit);
}
