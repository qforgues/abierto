import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));
const hash = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; } })();
// Auto-versioning: keep major.minor from package.json, auto-increment the patch
// from the git commit count so every deploy bumps without a manual edit.
const commitCount = (() => { try { return execSync('git rev-list --count HEAD').toString().trim(); } catch { return '0'; } })();
const [major = '0', minor = '0'] = version.split('.');
const autoVersion = `${major}.${minor}.${commitCount}`;

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(`${autoVersion}+${hash}`),
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
