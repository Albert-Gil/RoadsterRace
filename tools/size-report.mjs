import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]))).flat();
}
const paths = (await files('dist')).filter(p => !p.includes('.vite'));
let raw = 0, gzip = 0;
for (const path of paths) { const body = await readFile(path); raw += body.length; gzip += gzipSync(body).length; }
const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
const entryFiles = new Set(['index.html', 'assets/mark.svg']);
const visit = key => { const item = manifest[key]; if (!item || entryFiles.has(item.file)) return; entryFiles.add(item.file); for (const css of item.css ?? []) entryFiles.add(css); for (const dependency of item.imports ?? []) visit(dependency); };
visit('index.html');
let entryRaw = 0, entryGzip = 0;
for (const file of entryFiles) { const data = await readFile(join('dist', file)); entryRaw += data.length; entryGzip += gzipSync(data).length; }
console.log(JSON.stringify({ distributionFiles: paths.length, distributionBytes: raw, distributionGzipBytes: gzip, entryAndStaticImportsBytes: entryRaw, entryAndStaticImportsGzipBytes: entryGzip, note: 'Gzip estimates require a correctly configured host. Entry figure excludes runtime-loaded shaders and optional models; distribution figure includes all shipped chunks.' }, null, 2));
