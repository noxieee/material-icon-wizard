<script setup>
import Dialog from 'primevue/dialog';

defineProps({
  item: { type: Object, default: null },
});
const emit = defineEmits(['close']);

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
      <div class="col">
        <h4>Raw</h4>
        <pre>{{ item.rawSvg ?? '(none)' }}</pre>
      </div>
      <div class="col">
        <h4>Transformed</h4>
        <pre>{{ item.transformedSvg ?? '(none)' }}</pre>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.inspector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 640px) {
  .inspector {
    grid-template-columns: 1fr;
  }
}
h4 {
  margin: 0 0 0.5rem;
}
pre {
  margin: 0;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--p-surface-100, #f1f5f9);
  overflow-x: auto;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
