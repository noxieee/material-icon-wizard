<script setup>
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import { computeDiffHtml } from '../diffHtml.js';

const props = defineProps({
  item: { type: Object, default: null },
});
const emit = defineEmits(['close']);

const diff = computed(() =>
  props.item ? computeDiffHtml(props.item.rawSvg, props.item.transformedSvg) : null,
);

function onVisibility(visible) {
  if (!visible) emit('close');
}
</script>

<template>
  <Dialog
    :visible="!!item"
    modal
    :header="item ? item.name : ''"
    :style="{ width: '90vw', maxWidth: '900px' }"
    @update:visible="onVisibility"
  >
    <div v-if="item" class="inspector">
      <p v-if="diff" class="legend">
        <span class="chip del">removed</span>
        <span class="chip ins">added</span>
      </p>
      <div class="cols">
        <div class="col">
          <h4>Raw</h4>
          <!-- eslint-disable vue/no-v-html -->
          <!-- content is HTML-escaped in computeDiffHtml; only span tags added -->
          <pre v-if="diff" class="code" v-html="diff.raw"></pre>
          <!-- eslint-enable vue/no-v-html -->
          <pre v-else class="code">{{ item.rawSvg ?? '(none)' }}</pre>
        </div>
        <div class="col">
          <h4>Transformed</h4>
          <!-- eslint-disable vue/no-v-html -->
          <pre v-if="diff" class="code" v-html="diff.transformed"></pre>
          <!-- eslint-enable vue/no-v-html -->
          <pre v-else class="code">{{ item.transformedSvg ?? '(none)' }}</pre>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.legend {
  display: flex;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
}
.chip {
  font-size: 0.7rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
}
.cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 640px) {
  .cols {
    grid-template-columns: 1fr;
  }
}
h4 {
  margin: 0 0 0.5rem;
}
.code {
  margin: 0;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--p-surface-100, #f1f5f9);
  overflow-x: auto;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-all;
}
/* Diff spans are injected via v-html (unscoped), so reach them with :deep. */
.code :deep(.del),
.chip.del {
  background: #fee2e2;
  color: #991b1b;
  border-radius: 3px;
}
.code :deep(.ins),
.chip.ins {
  background: #dcfce7;
  color: #166534;
  border-radius: 3px;
}
</style>
