import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  define: { __BUILD_ID__: JSON.stringify(process.env.ROADSTER_BUILD_ID || process.env.GITHUB_SHA?.slice(0, 7) || 'local') },
  build: { target: ['safari15', 'chrome100'], chunkSizeWarningLimit: 1400, manifest: true },
  test: { testTimeout: 30000, maxWorkers: 2, include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
