<script setup>
import { computed, ref } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { computeDiffHtml } from '../diffHtml.js';

const props = defineProps({
  item: { type: Object, default: null },
});
const emit = defineEmits(['close']);

const diff = computed(() =>
  props.item ? computeDiffHtml(props.item.rawSvg, props.item.transformedSvg) : null,
);

// Which block was just copied, for transient button feedback.
const copied = ref(null);

async function copy(which) {
  const text = which === 'raw' ? props.item?.rawSvg : props.item?.transformedSvg;
  if (text == null) return;
  try {
    await navigator.clipboard.writeText(text);
    copied.value = which;
    setTimeout(() => {
      if (copied.value === which) copied.value = null;
    }, 1500);
  } catch {
    // Clipboard unavailable (e.g. insecure context) — nothing to do.
  }
}

function onVisibility(visible) {
  if (!visible) emit('close');
}
</script>

<template>
  <Dialog
    :visible="!!item"
    modal
    :style="{ width: '90vw', maxWidth: '900px' }"
    @update:visible="onVisibility"
  >
    <template #header>
      <span v-if="item" class="dialog-title">
        <!-- eslint-disable vue/no-v-html -->
        <!-- transformed (or raw) SVG from the trusted pipeline; sized down as a glyph -->
        <span
          v-if="item.transformedSvg || item.rawSvg"
          class="title-icon"
          v-html="item.transformedSvg ?? item.rawSvg"
        ></span>
        <!-- eslint-enable vue/no-v-html -->
        <span class="title-name">{{ item.name }}</span>
      </span>
    </template>

    <div v-if="item" class="inspector">
      <p v-if="diff" class="legend">
        <span class="chip del">removed</span>
        <span class="chip ins">added</span>
      </p>
      <div class="cols">
        <div class="col">
          <div class="col-head">
            <h4>Raw</h4>
            <Button
              v-tooltip.top="copied === 'raw' ? 'Copied!' : 'Copy'"
              :icon="copied === 'raw' ? 'pi pi-check' : 'pi pi-copy'"
              text
              rounded
              severity="secondary"
              aria-label="Copy raw source"
              :disabled="!item.rawSvg"
              @click="copy('raw')"
            />
          </div>
          <!-- eslint-disable vue/no-v-html -->
          <!-- content is HTML-escaped in computeDiffHtml; only span tags added -->
          <pre v-if="diff" class="code" v-html="diff.raw"></pre>
          <!-- eslint-enable vue/no-v-html -->
          <pre v-else class="code">{{ item.rawSvg ?? '(none)' }}</pre>
        </div>
        <div class="col">
          <div class="col-head">
            <h4>Transformed</h4>
            <Button
              v-tooltip.top="copied === 'transformed' ? 'Copied!' : 'Copy'"
              :icon="copied === 'transformed' ? 'pi pi-check' : 'pi pi-copy'"
              text
              rounded
              severity="secondary"
              aria-label="Copy transformed source"
              :disabled="!item.transformedSvg"
              @click="copy('transformed')"
            />
          </div>
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
.dialog-title {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  font-weight: 600;
  font-size: 1.5rem;
}
.title-icon {
  display: inline-flex;
}
.title-icon :deep(svg) {
  width: 32px;
  height: 32px;
}
.legend {
  display: flex;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
}
.chip {
  font-size: 0.85rem;
  padding: 0.15rem 0.6rem;
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
.col-head {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}
h4 {
  margin: 0;
}
.code {
  margin: 0;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--p-surface-100, #f1f5f9);
  overflow-x: auto;
  font-size: 0.9rem;
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
