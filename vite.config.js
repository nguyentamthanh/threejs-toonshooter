import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Two pages: landing (/) and the game (/toonshooter/). Static files live in public/.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        toonshooter: resolve(import.meta.dirname, 'toonshooter/index.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
