<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { searchIcons, getIconUrl } from '@material-icon-wizard/core';
import { ICON_VERSION, ICON_STYLE } from '../config.js';

const props = defineProps({
  manifest: { type: Object, default: null }, // Set<string> | null
  selected: { type: Object, default: () => new Set() }, // Set<string> of already-added icon names
});
const emit = defineEmits(['add']);

const query = ref('');
const open = ref(false);
const activeIndex = ref(-1);
const inputEl = ref(null);
const itemEls = ref([]);

// Local, in-memory ranked match against the cached manifest — no network for
// the matching itself, so it can re-run on every keystroke without debouncing.
// Matches already in `selected` are split off into their own disabled group
// instead of being mixed into the pickable list.
const suggestions = computed(() => {
  if (!props.manifest || !query.value.trim()) return { available: [], selected: [] };
  const available = [];
  const selected = [];
  for (const name of searchIcons(query.value, props.manifest, 20)) {
    (props.selected.has(name) ? selected : available).push(name);
  }
  return { available, selected };
});
const showPanel = computed(() => open.value && !!props.manifest);

// Reset to the top match whenever the candidate list changes, so Enter alone
// (no arrow keys) adds the best match — arrows only needed to reach others.
watch(
  () => suggestions.value.available,
  (list) => {
    activeIndex.value = list.length ? 0 : -1;
    itemEls.value = [];
  },
);

function thumbUrl(name) {
  return getIconUrl(name, ICON_VERSION, ICON_STYLE);
}

function toggleOpen() {
  if (open.value) {
    open.value = false;
    return;
  }
  open.value = true;
  inputEl.value?.focus();
}

function move(delta) {
  const count = suggestions.value.available.length;
  if (!count) return;
  open.value = true;
  activeIndex.value = (activeIndex.value + delta + count) % count;
  nextTick(() => itemEls.value[activeIndex.value]?.scrollIntoView({ block: 'nearest' }));
}

function selectIcon(name) {
  emit('add', name);
  // Deliberately keep the query and suggestion list open: picking one match
  // (e.g. "left" from an "arrow" search) shouldn't stop you adding another
  // (e.g. "right") from the same search.
  inputEl.value?.focus();
}

function onKeydown(event) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      move(1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      move(-1);
      break;
    case 'Enter':
      if (activeIndex.value >= 0 && suggestions.value.available[activeIndex.value]) {
        event.preventDefault();
        selectIcon(suggestions.value.available[activeIndex.value]);
      }
      break;
    case 'Escape':
      if (open.value) {
        event.preventDefault();
        open.value = false;
      }
      break;
  }
}

function onFocusOut(event) {
  // Clicking a suggestion uses @mousedown.prevent, so focus never actually
  // leaves the input for that case — this only fires for real "click away".
  if (!event.currentTarget.contains(event.relatedTarget)) {
    open.value = false;
  }
}
</script>

<template>
  <div class="search-bar" @focusout="onFocusOut">
    <div class="input-row">
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="showPanel"
        :aria-activedescendant="activeIndex >= 0 ? `icon-option-${activeIndex}` : undefined"
        :disabled="!manifest"
        placeholder="Search Material icons…"
        class="search-input"
        autocomplete="off"
        @focus="open = true"
        @keydown="onKeydown"
      />
      <button
        type="button"
        class="toggle-btn"
        :disabled="!manifest"
        aria-label="Browse Material icons"
        @click="toggleOpen"
      >
        <i class="pi pi-chevron-down"></i>
      </button>
    </div>

    <ul v-if="showPanel" class="suggestions" role="listbox">
      <li v-if="!query.trim()" class="empty-message" role="status">
        Type to search Material icons…
      </li>
      <li
        v-else-if="!suggestions.available.length && !suggestions.selected.length"
        class="empty-message"
        role="status"
      >
        No matching icons found.
      </li>
      <template v-else>
        <li
          v-for="(option, index) in suggestions.available"
          :id="`icon-option-${index}`"
          :key="option"
          :ref="(el) => (itemEls[index] = el)"
          role="option"
          :aria-selected="index === activeIndex"
          class="suggestion"
          :class="{ active: index === activeIndex }"
          @mousemove="activeIndex = index"
          @mousedown.prevent="selectIcon(option)"
        >
          <img :src="thumbUrl(option)" :alt="option" width="48" height="48" loading="lazy" />
          <span>{{ option }}</span>
        </li>

        <template v-if="suggestions.selected.length">
          <li class="section-label" role="presentation">Selected</li>
          <li
            v-for="option in suggestions.selected"
            :key="option"
            role="option"
            aria-disabled="true"
            class="suggestion is-selected"
          >
            <img :src="thumbUrl(option)" :alt="option" width="48" height="48" loading="lazy" />
            <span>{{ option }}</span>
          </li>
        </template>
      </template>
    </ul>
  </div>
</template>

<style scoped>
.search-bar {
  position: relative;
  width: 100%;
}
.input-row {
  display: flex;
  align-items: stretch;
}
.search-input {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 0.55rem 0.75rem;
  font-size: 1rem;
  border: 1px solid var(--p-content-border-color, #cbd5e1);
  border-right: none;
  border-radius: 8px 0 0 8px;
  background: var(--p-content-background, #fff);
  color: inherit;
}
.search-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.search-input:focus {
  outline: none;
}
.toggle-btn {
  flex: none;
  width: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--p-content-border-color, #cbd5e1);
  border-radius: 0 8px 8px 0;
  background: var(--p-content-background, #fff);
  color: var(--p-text-muted-color, #64748b);
  cursor: pointer;
}
.toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.toggle-btn:hover:not(:disabled) {
  background: var(--p-surface-100, #f1f5f9);
}
/* The input and button are two elements but should read as one control, so
   the focus ring is driven by the row rather than either child's own :focus. */
.input-row:focus-within .search-input,
.input-row:focus-within .toggle-btn {
  border-color: var(--p-primary-color, #10b981);
}
.suggestions {
  position: absolute;
  z-index: 10;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  max-height: 420px;
  overflow-y: auto;
  background: var(--p-content-background, #fff);
  border: 1px solid var(--p-content-border-color, #e2e8f0);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
}
.suggestion {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.05rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
}
.suggestion.active {
  background: var(--p-surface-100, #f1f5f9);
}
.suggestion img {
  flex: none;
}
.suggestion.is-selected {
  opacity: 0.5;
  cursor: not-allowed;
}
.section-label {
  margin-top: 1.5rem;
  padding: 0.35rem 0.6rem 0.15rem;
  font-size: 1rem;
  font-weight: 700;
  color: #047857;
}
.empty-message {
  padding: 0.6rem;
  text-align: center;
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.95rem;
}
</style>
