import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { contractHash } from './contract';

const root = resolve(import.meta.dirname, '..');

/** Writes dist-server/contract.json: the hash of every source module bundled into the server, plus the lockfile. */
function releaseContract(): Plugin {
  return {
    name: 'roadster-release-contract',
    generateBundle() {
      const sources = [...this.getModuleIds()]
        .filter(id => !id.startsWith('\0') && !id.includes('/node_modules/') && id.startsWith(root))
        .map(id => ({ path: relative(root, id.split('?')[0]), content: readFileSync(id.split('?')[0], 'utf8') }));
      sources.push({ path: 'pnpm-lock.yaml', content: readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8') });
      this.emitFile({ type: 'asset', fileName: 'contract.json', source: JSON.stringify({ contract: contractHash(sources), modules: sources.length }) + '\n' });
    },
  };
}

export default defineConfig({
  publicDir: false,
  plugins: [releaseContract()],
  build: { ssr: 'server/index.ts', target: 'node24', outDir: 'dist-server', emptyOutDir: true },
});
