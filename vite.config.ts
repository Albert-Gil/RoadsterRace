import { defineConfig } from 'vitest/config';

// `--mode app` builds the bundle packaged by the iOS app (Capacitor): relative asset paths,
// served from the app itself, in dist-app/. The default build remains the GitHub Pages site.
export default defineConfig(({ mode }) => ({
  base: mode === 'app' ? './' : process.env.VITE_BASE_PATH || '/',
  define: { __BUILD_ID__: JSON.stringify(process.env.ROADSTER_BUILD_ID || process.env.GITHUB_SHA?.slice(0, 7) || 'local') },
  build: { target: ['safari15', 'chrome100'], chunkSizeWarningLimit: 1400, manifest: true, outDir: mode === 'app' ? 'dist-app' : 'dist' },
  test: { testTimeout: 30000, maxWorkers: 2, include: ['tests/unit/**/*.test.ts'], environment: 'node' },
}));
