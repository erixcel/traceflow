import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const studioRoot = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  root: studioRoot,
  plugins: [react(), tailwindcss()],
  envDir: projectRoot,
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4789',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:4789',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist/studio-web',
    emptyOutDir: true,
  },
});
