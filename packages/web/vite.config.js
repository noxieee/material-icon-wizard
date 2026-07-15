import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// base must match the GitHub Pages project-site subpath (repo name), so built
// asset URLs resolve under https://<user>.github.io/material-icon-wizard/.
export default defineConfig({
  base: '/material-icon-wizard/',
  plugins: [vue()],
});
