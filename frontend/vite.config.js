import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5200,
    proxy: {
      '/api': 'http://localhost:3005',
      '/tiles': 'http://localhost:3005',
      '/uploads': 'http://localhost:3005',
    },
  },
});
