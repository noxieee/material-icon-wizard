import { reactive } from 'vue';
import { prepareIcon } from '@material-icon-wizard/core';
import { ICON_VERSION, ICON_STYLE } from './config.js';

// App-wide gallery state. A single shared reactive array so any component can
// read/mutate the same list of icons.
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

export function useIconStore() {
  return { items, addMaterial, addCustom, retransform, remove };
}
