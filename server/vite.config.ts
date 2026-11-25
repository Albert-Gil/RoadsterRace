import { defineConfig } from 'vite';
export default defineConfig({
  publicDir: false,
  build: { ssr: 'server/index.ts', target: 'node24', outDir: 'dist-server', emptyOutDir: true },
});
