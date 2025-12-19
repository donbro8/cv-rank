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
    // exclude: ['@xenova/transformers', 'onnxruntime-web'], // Removed exclusion to fix registerBackend error
    include: ['long'] // Explicitly include 'long' to prevent "module not found" errors in some CommonJS contexts
  },
  define: {
    // Some libraries expect 'global' to exist
    global: 'globalThis',
    'process.env': {},
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify('dummy'),
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify('dummy'),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify('dummy'),
    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify('dummy'),
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify('dummy'),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify('dummy'),
  }
});