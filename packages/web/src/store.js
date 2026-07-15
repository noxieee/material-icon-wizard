import { reactive, watch } from 'vue';
import { prepareIcon } from '@material-icon-wizard/core';
import { ICON_VERSION, ICON_STYLE } from './config.js';

// App-wide gallery state. A single shared reactive array so any component can
// read/mutate the same list of icons.
const STORAGE_KEY = 'miw:selected-icons:v1';

let nextId = 1;
const items = reactive([]);

// Reactive so that mutating the entry in place (via Object.assign in
// runPrepare) goes through the proxy and triggers re-renders — mutating a plain
// object held by reference would update the data silently but never re-render.
function blankEntry(name, source) {
  return reactive({
    id: nextId++,
    name,
    source,
    status: 'pending',
    rawSvg: null,
    transformedSvg: null,
    warnings: [],
    errorMessage: null,
  });
}

// Run (or re-run) the core pipeline for one entry, merging the result in place
// so the card updates reactively. Keeps the entry's stable id.
async function runPrepare(entry) {
  entry.status = 'pending';
  const input =
    entry.source === 'custom' ? { name: entry.name, rawSvg: entry.rawSvg } : { name: entry.name };
  const opts = entry.source === 'custom' ? {} : { version: ICON_VERSION, style: ICON_STYLE };
  const result = await prepareIcon(input, opts);
  Object.assign(entry, result);
}

function addMaterial(name) {
  if (items.some((i) => i.source === 'material' && i.name === name)) return;
  const entry = blankEntry(name, 'material');
  items.push(entry);
  runPrepare(entry);
}

function addCustom(name, rawSvg) {
  const entry = blankEntry(name, 'custom');
  entry.rawSvg = rawSvg;
  items.push(entry);
  runPrepare(entry);
}

function retransform(entry) {
  runPrepare(entry);
}

function remove(id) {
  const idx = items.findIndex((i) => i.id === id);
  if (idx !== -1) items.splice(idx, 1);
}

function clear() {
  items.splice(0, items.length);
}

// --- Persistence: keep the selection across reloads / browser restarts. ---
// We store the full successful items (including the SVG source) so custom
// uploads survive too and nothing needs re-fetching on load. Pending/errored
// items are skipped — only what the user has successfully added is saved.
function persist() {
  try {
    const data = items
      .filter((i) => i.status === 'found')
      .map((i) => ({
        name: i.name,
        source: i.source,
        rawSvg: i.rawSvg,
        transformedSvg: i.transformedSvg,
        warnings: i.warnings,
      }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable/full — persistence is best-effort, not fatal.
  }
}

function hydrate() {
  let data;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    data = JSON.parse(raw);
  } catch {
    return;
  }
  if (!Array.isArray(data)) return;
  for (const saved of data) {
    if (!saved || typeof saved.name !== 'string') continue;
    const entry = blankEntry(saved.name, saved.source === 'custom' ? 'custom' : 'material');
    entry.rawSvg = saved.rawSvg ?? null;
    entry.transformedSvg = saved.transformedSvg ?? null;
    entry.warnings = Array.isArray(saved.warnings) ? saved.warnings : [];
    entry.status = 'found';
    items.push(entry);
  }
}

// Restore first (before the watcher is attached, so this doesn't re-persist),
// then persist on any subsequent change.
hydrate();
watch(items, persist, { deep: true });

export function useIconStore() {
  return { items, addMaterial, addCustom, retransform, remove, clear };
}
