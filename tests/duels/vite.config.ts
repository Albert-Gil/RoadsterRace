import { defineConfig } from 'vite';
// Private browser harness: expose the existing drawing projection only in this
// isolated build. Neither Pages nor Capacitor packages this output directory.
export default defineConfig({
  define:{ 'import.meta.env.DEV':'true', __BUILD_ID__:JSON.stringify('duel-test') },
  build:{outDir:'artifacts/duel-test-site',target:['safari15','chrome100'],chunkSizeWarningLimit:2700},
});
