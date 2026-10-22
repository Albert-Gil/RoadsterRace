import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: { target: ['safari15', 'chrome100'], chunkSizeWarningLimit: 1400, manifest: true },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
