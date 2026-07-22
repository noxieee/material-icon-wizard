<script setup>
import IconCard from './IconCard.vue';

defineProps({
  items: { type: Array, required: true },
  previewColor: { type: String, default: '#1e293b' },
});
const emit = defineEmits(['remove', 'inspect']);
</script>

<template>
  <div v-if="items.length === 0" class="empty">
    No icons yet — search above or upload an SVG to get started.
  </div>
  <div v-else class="gallery">
    <IconCard
      v-for="item in items"
      :key="item.id"
      :item="item"
      :preview-color="previewColor"
      @remove="emit('remove', $event)"
      @inspect="emit('inspect', $event)"
    />
  </div>
</template>

<style scoped>
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
.empty {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--p-text-muted-color, #64748b);
}
</style>
