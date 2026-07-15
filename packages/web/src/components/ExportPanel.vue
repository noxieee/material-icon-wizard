<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import { exportZip, exportToFolder, canWriteToFolder } from '../exporter.js';

const props = defineProps({
  items: { type: Array, required: true },
});

const exportableCount = computed(() => props.items.filter((i) => i.status === 'found').length);
const folderSupported = canWriteToFolder();

function onZip() {
  exportZip(props.items);
}

async function onFolder() {
  try {
    await exportToFolder(props.items);
  } catch (err) {
    // User dismissing the picker throws AbortError — not an error worth showing.
    if (err && err.name !== 'AbortError') {
      window.alert(`Export failed: ${err.message}`);
    }
  }
}
</script>

<template>
  <!-- Multiple roots (no wrapper) so these buttons are direct toolbar flex
       children and share its gap, rather than forming a separate group. -->
  <Button
    v-if="folderSupported"
    label="Save to folder…"
    icon="pi pi-folder-open"
    severity="secondary"
    :disabled="exportableCount === 0"
    @click="onFolder"
  />
  <Button
    label="Download .zip"
    icon="pi pi-download"
    :disabled="exportableCount === 0"
    @click="onZip"
  />
</template>
