<script setup>
import { ref } from 'vue';
import AutoComplete from 'primevue/autocomplete';
import { searchIcons, getIconUrl } from '@material-icon-wizard/core';
import { ICON_VERSION, ICON_STYLE } from '../config.js';

const props = defineProps({
  manifest: { type: Object, default: null }, // Set<string> | null
});
const emit = defineEmits(['add']);

const query = ref('');
const suggestions = ref([]);

// Local, in-memory ranked match against the cached manifest — no network for
// the matching itself. AutoComplete debounces via :delay.
function onComplete(event) {
  suggestions.value = props.manifest ? searchIcons(event.query, props.manifest, 20) : [];
}

function onSelect(event) {
  emit('add', event.value);
  query.value = '';
  suggestions.value = [];
}

// Thumbnails come straight from the CDN as <img> — no fetch/parse needed just
// to preview a suggestion.
function thumbUrl(name) {
  return getIconUrl(name, ICON_VERSION, ICON_STYLE);
}
</script>

<template>
  <AutoComplete
    v-model="query"
    :suggestions="suggestions"
    :delay="200"
    :disabled="!manifest"
    dropdown
    placeholder="Search Material icons…"
    class="search"
    @complete="onComplete"
    @option-select="onSelect"
  >
    <template #option="{ option }">
      <div class="suggestion">
        <img :src="thumbUrl(option)" :alt="option" width="24" height="24" loading="lazy" />
        <span>{{ option }}</span>
      </div>
    </template>
  </AutoComplete>
</template>

<style scoped>
.search {
  width: 100%;
}
.suggestion {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.suggestion img {
  flex: none;
}
</style>
