<script setup>
import Button from 'primevue/button';
import Badge from 'primevue/badge';

defineProps({
  item: { type: Object, required: true },
  // Shared across all cards; the wrapper's CSS `color` that currentColor follows.
  previewColor: { type: String, default: '#1e293b' },
});
const emit = defineEmits(['remove', 'retransform', 'inspect']);
</script>

<template>
  <div class="card">
    <div class="preview" :style="{ color: previewColor }">
      <Badge v-if="item.source === 'custom'" value="custom" severity="info" class="corner-badge" />
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
        <Badge v-if="item.status === 'error'" value="error" severity="danger" />
        <span v-if="item.warnings.length" :title="item.warnings.join('\n')">
          <Badge :value="`⚠ ${item.warnings.length}`" severity="warn" />
        </span>
      </span>
    </div>

    <p v-if="item.status === 'error'" class="err-msg">{{ item.errorMessage }}</p>

    <div class="actions">
      <Button
        v-tooltip.top="'Inspect source'"
        icon="pi pi-code"
        text
        rounded
        severity="secondary"
        aria-label="Inspect source"
        @click="emit('inspect', item)"
      />
      <Button
        v-tooltip.top="'Re-run transform'"
        icon="pi pi-refresh"
        text
        rounded
        severity="secondary"
        aria-label="Re-run transform"
        @click="emit('retransform', item)"
      />
      <Button
        v-tooltip.top="'Remove'"
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 128px;
  border-radius: 8px;
  background: var(--p-surface-100, #f1f5f9);
}
.preview .corner-badge {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  font-size: 0.72rem;
  min-width: auto;
  height: auto;
  padding: 0.08rem 0.45rem;
  line-height: 1.4;
}
.preview :deep(svg) {
  width: 64px;
  height: 64px;
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
  font-size: 1rem;
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
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.15rem;
}
</style>
