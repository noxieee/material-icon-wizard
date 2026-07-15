<script setup>
// One shared preview color for every card. Changing it drives each preview
// wrapper's CSS `color`; currentColor in the SVGs follows it, proving the
// transform works across all selected icons at once.
const SWATCHES = ['#1e293b', '#2563eb', '#dc2626', '#16a34a', '#d97706'];

const model = defineModel({ type: String, required: true });
</script>

<template>
  <div class="color-tester">
    <span class="label">Test current color</span>
    <div class="swatches">
      <button
        v-for="s in SWATCHES"
        :key="s"
        class="swatch"
        :class="{ active: model === s }"
        :style="{ background: s }"
        :aria-label="`Preview in ${s}`"
        @click="model = s"
      ></button>
      <input v-model="model" type="color" aria-label="Custom preview color" />
    </div>
  </div>
</template>

<style scoped>
.color-tester {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.label {
  font-size: 0.9rem;
  font-weight: 600;
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
</style>
