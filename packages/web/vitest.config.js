import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// The vue plugin lets Vitest transform .vue SFCs; jsdom gives components a DOM.
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
  },
});
