import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  build: {
    target: 'es2020',
    rollupOptions: { input: { v2: fileURLToPath(new URL('./v2.html', import.meta.url)) } },
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});

