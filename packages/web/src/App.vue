<script setup>
import { onMounted, ref } from 'vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import IconSearchBar from './components/IconSearchBar.vue';
import CustomUpload from './components/CustomUpload.vue';
import IconGallery from './components/IconGallery.vue';
import CodeInspector from './components/CodeInspector.vue';
import ExportPanel from './components/ExportPanel.vue';
import ColorTester from './components/ColorTester.vue';
import { useIconManifest } from './useIconManifest.js';
import { useIconStore } from './store.js';

const { manifest, loading, error, load } = useIconManifest();
const store = useIconStore();
const inspected = ref(null);
const previewColor = ref('#1e293b');

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
    <section class="block">
      <header>
        <h1>Material Icon Wizard</h1>
        <p class="tagline">
          Search, normalize to <code>currentColor</code>, verify, and export — Material icons and
          your own SVGs.
        </p>
      </header>

      <div class="controls">
        <IconSearchBar :manifest="manifest" @add="store.addMaterial" />
        <CustomUpload @upload="onUpload" />
      </div>

      <Message v-if="loading" severity="info" :closable="false" class="manifest-msg">
        Loading icon manifest…
      </Message>
      <Message v-else-if="error" severity="error" :closable="false" class="manifest-msg">
        Could not load the icon manifest: {{ error }}
      </Message>
    </section>

    <section class="block">
      <div v-if="store.items.length" class="toolbar">
        <span class="count">{{ store.items.length }} selected icon(s)</span>
        <span class="spacer"></span>
        <Button label="Re-transform all" icon="pi pi-refresh" text @click="retransformAll" />
        <Button label="Remove all" icon="pi pi-trash" severity="danger" @click="store.clear" />
        <span class="toolbar-divider" aria-hidden="true"></span>
        <ExportPanel :items="store.items" />
      </div>

      <ColorTester v-if="store.items.length" v-model="previewColor" class="color-tester-row" />

      <IconGallery
        :items="store.items"
        :preview-color="previewColor"
        @remove="store.remove"
        @retransform="store.retransform"
        @inspect="inspected = $event"
      />
    </section>

    <CodeInspector :item="inspected" @close="inspected = null" />
  </div>
</template>

<style scoped>
.app {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}
.block {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}
.block + .block {
  margin-top: 1.5rem;
}
header h1 {
  margin: 0;
}
.tagline {
  margin: 0.75rem 0 1.5rem;
  color: #475569;
}
.controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.controls > :first-child {
  flex: 1;
}
.manifest-msg {
  margin-top: 1rem;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 1.25rem;
  flex-wrap: wrap;
}
.color-tester-row {
  margin-bottom: 1.25rem;
}
/* A 1px separator that stretches to the toolbar row height (i.e. the buttons). */
.toolbar-divider {
  align-self: stretch;
  width: 1px;
  background: var(--p-content-border-color, #cbd5e1);
  margin: 0 0.25rem;
}
.spacer {
  flex: 1;
}
.count {
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.9rem;
}
</style>
