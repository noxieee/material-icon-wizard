<script setup>
import { ref } from 'vue';
import Button from 'primevue/button';

const emit = defineEmits(['upload']);
const fileInput = ref(null);

function pick() {
  fileInput.value?.click();
}

function onChange(event) {
  const files = Array.from(event.target.files ?? []);
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = () => {
      emit('upload', {
        name: file.name.replace(/\.svg$/i, ''),
        rawSvg: String(reader.result),
      });
    };
    reader.readAsText(file);
  }
  event.target.value = ''; // let the same file be picked again later
}
</script>

<template>
  <Button label="Upload SVG…" icon="pi pi-upload" severity="secondary" @click="pick" />
  <input
    ref="fileInput"
    type="file"
    accept=".svg,image/svg+xml"
    multiple
    style="display: none"
    @change="onChange"
  />
</template>
