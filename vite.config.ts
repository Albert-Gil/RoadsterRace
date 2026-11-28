import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Home appears before the 3D scene, which loads on demand (src/main.ts). Hint the browser to fetch the scene
 * chunk and its imports right away at low priority, so it downloads while the entry script runs.
 */
function preloadScene(): Plugin {
  let base = '/';
  return {
    name: 'roadster-preload-scene', apply: 'build',
    configResolved(config) { base = config.base; },
    transformIndexHtml: { order: 'post', handler(html, ctx) {
      const chunks = Object.values(ctx.bundle ?? {}).filter(c => c.type === 'chunk');
      const scene = chunks.find(c => c.facadeModuleId?.replace(/\\/g, '/').endsWith('/src/presentation/scene.ts'));
      const entry = chunks.find(c => c.isEntry);
      if (!scene || !entry) return html;
      const files = new Set<string>(), visit = (file: string) => { if (files.has(file)) return; files.add(file); chunks.find(c => c.fileName === file)?.imports.forEach(visit); };
      visit(scene.fileName);
      const loaded = new Set([entry.fileName, ...entry.imports]);
      return { html, tags: [...files].filter(f => !loaded.has(f)).map(f => ({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: base + f, fetchpriority: 'low' }, injectTo: 'head' as const })) };
    } },
  };
}

// `--mode app` builds the bundle packaged by the iOS app (Capacitor): relative asset paths,
// served from the app itself, in dist-app/. The default build remains the GitHub Pages site.
export default defineConfig(({ mode }) => ({
  plugins: [preloadScene()],
  base: mode === 'app' ? './' : process.env.VITE_BASE_PATH || '/',
  define: { __BUILD_ID__: JSON.stringify(process.env.ROADSTER_BUILD_ID || process.env.GITHUB_SHA?.slice(0, 7) || 'local') },
  build: { target: ['safari15', 'chrome100'], chunkSizeWarningLimit: 1400, manifest: true, outDir: mode === 'app' ? 'dist-app' : 'dist' },
  test: { testTimeout: 30000, maxWorkers: 2, include: ['tests/unit/**/*.test.ts'], environment: 'node' },
}));
