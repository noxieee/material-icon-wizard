<script setup>
import { ref } from 'vue';
import Button from 'primevue/button';
import Badge from 'primevue/badge';

defineProps({
  item: { type: Object, required: true },
});
const emit = defineEmits(['remove', 'retransform', 'inspect']);

const SWATCHES = ['#1e293b', '#2563eb', '#dc2626', '#16a34a', '#d97706'];
// The wrapper's CSS `color` — currentColor in the SVG inherits it, so changing
// this instantly proves the transform works, for filled and outlined icons.
const color = ref(SWATCHES[0]);
</script>

<template>
  <div class="card">
    <div class="preview" :style="{ color }">
      <!-- Trusted CDN output / the user's own uploaded file; rendered inline so
           currentColor resolves against the wrapper color above. -->
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="item.status === 'found' && item.transformedSvg"
        class="svg-holder"
        v-html="item.transformedSvg"
      ></div>
      <!-- eslint-enable vue/no-v-html -->
      <i v-else-if="item.status === 'pending'" class="pi pi-spin pi-spinner big"></i>
      <i v-else class="pi pi-exclamation-triangle big err"></i>
    </div>

    <div class="meta">
      <span class="name" :title="item.name">{{ item.name }}</span>
      <span class="badges">
        <Badge v-if="item.source === 'custom'" value="custom" severity="info" />
        <Badge v-if="item.status === 'error'" value="error" severity="danger" />
        <span v-if="item.warnings.length" :title="item.warnings.join('\n')">
          <Badge :value="`⚠ ${item.warnings.length}`" severity="warn" />
        </span>
      </span>
    </div>

    <p v-if="item.status === 'error'" class="err-msg">{{ item.errorMessage }}</p>

    <div class="swatches">
      <button
        v-for="s in SWATCHES"
        :key="s"
        class="swatch"
        :class="{ active: color === s }"
        :style="{ background: s }"
        :aria-label="`Preview in ${s}`"
        @click="color = s"
      ></button>
      <input v-model="color" type="color" aria-label="Custom preview color" />
    </div>

    <div class="actions">
      <Button
        icon="pi pi-code"
        text
        rounded
        severity="secondary"
        aria-label="Inspect source"
        @click="emit('inspect', item)"
      />
      <Button
        icon="pi pi-refresh"
        text
        rounded
        severity="secondary"
        aria-label="Re-run transform"
        @click="emit('retransform', item)"
      />
      <Button
        icon="pi pi-trash"
        text
        rounded
        severity="danger"
        aria-label="Remove"
        @click="emit('remove', item.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--p-content-border-color, #e2e8f0);
  border-radius: 12px;
  background: var(--p-content-background, #fff);
}
.preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96px;
  border-radius: 8px;
  background: var(--p-surface-100, #f1f5f9);
}
.preview :deep(svg) {
  width: 48px;
  height: 48px;
}
.big {
  font-size: 2rem;
}
.err {
  color: var(--p-red-500, #ef4444);
}
.meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: space-between;
}
.name {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.badges {
  display: flex;
  gap: 0.25rem;
  flex: none;
}
.err-msg {
  margin: 0;
  font-size: 0.75rem;
  color: var(--p-red-500, #ef4444);
}
.swatches {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}
.swatch.active {
  border-color: var(--p-primary-color, #3b82f6);
}
.swatches input[type='color'] {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.15rem;
}
</style>
