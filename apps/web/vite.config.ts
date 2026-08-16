import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@agro/tipos': path.resolve(__dirname, '../../packages/tipos/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
