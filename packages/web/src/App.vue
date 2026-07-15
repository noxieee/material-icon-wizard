<script setup>
import { onMounted, ref } from 'vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import IconSearchBar from './components/IconSearchBar.vue';
import CustomUpload from './components/CustomUpload.vue';
import IconGallery from './components/IconGallery.vue';
import CodeInspector from './components/CodeInspector.vue';
import ExportPanel from './components/ExportPanel.vue';
import { useIconManifest } from './useIconManifest.js';
import { useIconStore } from './store.js';

const { manifest, loading, error, load } = useIconManifest();
const store = useIconStore();
const inspected = ref(null);

onMounted(load);

function onUpload({ name, rawSvg }) {
  store.addCustom(name, rawSvg);
}

function retransformAll() {
  store.items.forEach((item) => store.retransform(item));
}
</script>

<template>
  <div class="app">
    <header>
      <h1>Material Icon Wizard</h1>
      <p class="tagline">
        Search, normalize to <code>currentColor</code>, verify, and export — Material icons and your
        own SVGs.
      </p>
    </header>

    <section class="controls">
      <IconSearchBar :manifest="manifest" @add="store.addMaterial" />
      <CustomUpload @upload="onUpload" />
    </section>

    <Message v-if="loading" severity="info" :closable="false">Loading icon manifest…</Message>
    <Message v-else-if="error" severity="error" :closable="false">
      Could not load the icon manifest: {{ error }}
    </Message>

    <section v-if="store.items.length" class="toolbar">
      <span class="count">{{ store.items.length }} icon(s)</span>
      <span class="spacer"></span>
      <Button label="Re-transform all" icon="pi pi-refresh" text @click="retransformAll" />
      <ExportPanel :items="store.items" />
    </section>

    <IconGallery
      :items="store.items"
      @remove="store.remove"
      @retransform="store.retransform"
      @inspect="inspected = $event"
    />

    <CodeInspector :item="inspected" @close="inspected = null" />
  </div>
</template>

<style scoped>
.app {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}
header h1 {
  margin: 0;
}
.tagline {
  margin: 0.25rem 0 1.5rem;
  color: #475569;
}
.controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}
.controls > :first-child {
  flex: 1;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.25rem 0;
  flex-wrap: wrap;
}
.spacer {
  flex: 1;
}
.count {
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.9rem;
}
</style>
