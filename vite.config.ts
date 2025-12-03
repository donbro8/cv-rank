import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext', // Needed for top-level await support in some libraries
    outDir: 'dist',
  },
  resolve: {
    alias: {
      // Polyfill buffer for Firebase/Protobufjs
      buffer: 'buffer',
    }
  },
  optimizeDeps: {
    exclude: ['@xenova/transformers'], // Often better to exclude from optimization due to dynamic imports
    include: ['long'] // Explicitly include 'long' to prevent "module not found" errors in some CommonJS contexts
  },
  define: {
    // Some libraries expect 'global' to exist
    global: 'window',
  }
});