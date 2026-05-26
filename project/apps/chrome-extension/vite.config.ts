import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'metadata-extractor': resolve(__dirname, 'src/content/metadata-extractor.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'service-worker') {
            return 'service-worker.js';
          }
          if (chunk.name === 'metadata-extractor') {
            return 'content-scripts/metadata-extractor.js';
          }
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (info.endsWith('.css')) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
