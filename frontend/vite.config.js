import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));
const hash = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; } })();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(`${version}+${hash}`),
  },
  server: {
    port: 5200,
    proxy: {
      '/api': 'http://localhost:3005',
      '/tiles': 'http://localhost:3005',
      '/uploads': 'http://localhost:3005',
    },
  },
});
