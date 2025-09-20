import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages (project site): https://euge-90.github.io/turnex
  base: '/turnex/',
});