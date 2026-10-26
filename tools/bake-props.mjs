// Bake selected CC0 models (Kenney packs and Poly Haven scans) into one compact, vertex-coloured
// geometry file per venue.
//
//   node tools/bake-props.mjs [sourceDir]      (default: asset-sources, git-ignored)
//
// Sources are the official Kenney packs, each zip unzipped into its own folder:
// asset-sources/kenney/kenney_{watercraft,pirate,suburban,racing,nature}/ (the zips themselves are
// kept in asset-sources/kenney/zips/; provenance, versions and hashes in docs/ASSET_RIGHTS.md).
// Each model's colour atlas is sampled once per vertex, so every prop shares one plain material
// and a whole venue batches into one draw call. Photo-scanned rocks (asset-sources/polyhaven/<id>/,
// unpacked from polyhaven-rocks.pack) are welded, coloured from their photo texture and simplified
// with meshoptimizer to a phone-friendly triangle budget.
// Output: public/assets/models/<venue>-props.bin — [u32 header bytes][JSON header][binary body].
import { inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import jpeg from 'jpeg-js';
import { MeshoptSimplifier } from 'meshoptimizer';

const root = process.argv[2] ?? 'asset-sources', source = join(root, 'kenney');
const glb = (pack, file) => join(source, pack, 'Models', 'GLB format', `${file}.glb`);
const suburbanVariation = name => join(source, 'kenney_suburban', 'Models', 'Textures', `variation-${name}.png`);
/** A Poly Haven scan, simplified to about `triangles` triangles (a variant suffix names extra levels of detail). */
const scan = (id, triangles, variant = '') => ({ key: `scan-${id.replaceAll('_', '-')}${variant ? `-${variant}` : ''}`, path: join(root, 'polyhaven', id, `${id}_1k.gltf`), triangles });

/**
 * One file per venue, so a venue only downloads its own props. Keys are stable roles used by the
 * game; add models here and re-run. Houses use the pack's white/grey "variation C" colours (a few
 * also in blue-roofed "variation A").
 */
export const CATALOGS = {
  newport: [
    ...['boat-sail-a', 'boat-sail-b', 'boat-speed-a', 'boat-speed-b', 'boat-speed-c', 'boat-speed-g', 'boat-speed-i', 'boat-fishing-small', 'boat-house-b', 'boat-row-small', 'buoy', 'buoy-flag']
      .map(file => ({ key: file, path: glb('kenney_watercraft', file) })),
    ...['palm-detailed-bend', 'palm-detailed-straight'].map(file => ({ key: file, path: glb('kenney_pirate', file) })),
    ...['a', 'b', 'c', 'd', 'e', 'g', 'h', 'n', 's', 'u'].map(type => ({ key: `house-${type}`, path: glb('kenney_suburban', `building-type-${type}`), texture: suburbanVariation('c') })),
    ...['b', 'd', 'n'].map(type => ({ key: `house-${type}-blue`, path: glb('kenney_suburban', `building-type-${type}`), texture: suburbanVariation('a') })),
    ...['tree-large', 'tree-small'].map(file => ({ key: `suburban-${file}`, path: glb('kenney_suburban', file) })),
  ],
  // Hero boulders sit in the solid formations; cliff faces are open reliefs set into tors and ledges;
  // the "-lo" levels are loose rocks scattered by the hundred.
  launchsite: [
    ...['02', '03', '04', '05'].map(n => scan(`namaqualand_boulder_${n}`, 700)),
    scan('namaqualand_cliff_01', 2600), scan('rock_face_01', 1600),
    ...['02', '03', '05'].map(n => scan(`namaqualand_boulder_${n}`, 220, 'lo')), scan('rock_07', 120, 'lo'), scan('rock_09', 120, 'lo'),
  ],
};

// ---- minimal PNG decoder (8-bit grey/RGB/palette/RGBA, non-interlaced) ----
function decodePng(buffer) {
  let offset = 8, width = 0, height = 0, type = 0, depth = 0, palette = null, alpha = null; const data = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset), kind = buffer.toString('latin1', offset + 4, offset + 8), chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (kind === 'IHDR') { width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4); depth = chunk[8]; type = chunk[9]; if (chunk[12]) throw new Error('interlaced PNG'); }
    else if (kind === 'PLTE') palette = chunk; else if (kind === 'tRNS') alpha = chunk; else if (kind === 'IDAT') data.push(chunk);
    offset += 12 + length;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type], bits = depth * channels, stride = Math.ceil(width * bits / 8), bpp = Math.max(1, bits / 8);
  const raw = inflateSync(Buffer.concat(data)), rows = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? rows[y * stride + x - bpp] : 0, b = y ? rows[(y - 1) * stride + x] : 0, c = x >= bpp && y ? rows[(y - 1) * stride + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      rows[y * stride + x] = (line[x] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter]) & 255;
    }
  }
  return { width, height, pixel(x, y) {
    if (type === 3) { const per = 8 / depth, byte = rows[y * stride + Math.floor(x / per)], index = (byte >> (8 - depth * (x % per + 1))) & ((1 << depth) - 1); return [palette[index * 3], palette[index * 3 + 1], palette[index * 3 + 2], alpha?.[index] ?? 255]; }
    if (depth !== 8) throw new Error(`unsupported PNG depth ${depth}`);
    const i = y * stride + x * channels; return type === 0 ? [rows[i], rows[i], rows[i], 255] : type === 4 ? [rows[i], rows[i], rows[i], rows[i + 1]] : [rows[i], rows[i + 1], rows[i + 2], type === 6 ? rows[i + 3] : 255];
  } };
}

// ---- glTF reading (.glb, or .gltf with one external buffer) ----
function readGlb(path) {
  let json = null, bin = null;
  if (path.endsWith('.gltf')) { json = JSON.parse(readFileSync(path, 'utf8')); bin = readFileSync(join(dirname(path), json.buffers[0].uri)); }
  else {
    const buffer = readFileSync(path); let offset = 12;
    while (offset < buffer.length) {
      const length = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4), chunk = buffer.subarray(offset + 8, offset + 8 + length);
      if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8')); else if (type === 0x004e4942) bin = chunk;
      offset += 8 + length;
    }
  }
  const accessor = index => {
    const a = json.accessors[index], view = json.bufferViews[a.bufferView], size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const Type = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[a.componentType], step = (view.byteStride ?? 0) / Type.BYTES_PER_ELEMENT || size;
    const base = new Type(bin.buffer, bin.byteOffset + (view.byteOffset ?? 0) + (a.byteOffset ?? 0), (a.count - 1) * step + size), out = [];
    for (let i = 0; i < a.count; i++) out.push(Array.from(base.subarray(i * step, i * step + size)));
    return a.normalized && Type !== Float32Array ? out.map(v => v.map(x => x / (Type === Uint8Array ? 255 : 65535))) : out;
  };
  return { json, accessor, dir: dirname(path) };
}
const multiply = (a, b) => { const o = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
function localMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1], [sx, sy, sz] = node.scale ?? [1, 1, 1], [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0, 2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
}
const toSrgb = v => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
const textures = new Map();
function texture(path) {
  if (!textures.has(path)) {
    if (/\.jpe?g$/i.test(path)) { const { width, height, data } = jpeg.decode(readFileSync(path), { useTArray: true, maxMemoryUsageInMB: 1024 }); textures.set(path, { width, height, pixel: (x, y) => { const i = (y * width + x) * 4; return [data[i], data[i + 1], data[i + 2], 255]; } }); }
    else textures.set(path, decodePng(readFileSync(path)));
  }
  return textures.get(path);
}
/** Mean colour of a square around a texel: a scan's colour seen from the game camera, not its grain. */
function blurred(atlas, u, v, radius) {
  const cx = Math.floor((u - Math.floor(u)) * atlas.width), cy = Math.floor((v - Math.floor(v)) * atlas.height), sum = [0, 0, 0]; let n = 0;
  for (let y = cy - radius; y <= cy + radius; y += 2) for (let x = cx - radius; x <= cx + radius; x += 2) {
    const px = atlas.pixel(Math.min(atlas.width - 1, Math.max(0, x)), Math.min(atlas.height - 1, Math.max(0, y))); sum[0] += px[0]; sum[1] += px[1]; sum[2] += px[2]; n++;
  }
  return sum.map(c => Math.round(c / n));
}

function bake({ path, texture: override, triangles }) {
  const { json, accessor, dir } = readGlb(path), positions = [], normals = [], colors = [], indices = [];
  const visit = (index, parent) => {
    const node = json.nodes[index], matrix = multiply(parent, localMatrix(node));
    if (node.mesh !== undefined) for (const primitive of json.meshes[node.mesh].primitives) {
      if ((primitive.mode ?? 4) !== 4) continue;
      const material = json.materials?.[primitive.material] ?? {}, pbr = material.pbrMetallicRoughness ?? {}, factor = pbr.baseColorFactor ?? [1, 1, 1, 1];
      const atlas = pbr.baseColorTexture ? texture(override ?? join(dir, json.images[json.textures[pbr.baseColorTexture.index].source].uri)) : null;
      const p = accessor(primitive.attributes.POSITION), n = accessor(primitive.attributes.NORMAL), uv = atlas ? accessor(primitive.attributes.TEXCOORD_0) : null;
      const vertexColor = primitive.attributes.COLOR_0 !== undefined ? accessor(primitive.attributes.COLOR_0) : null, base = positions.length / 3;
      for (let i = 0; i < p.length; i++) {
        const [x, y, z] = p[i], [nx, ny, nz] = n[i];
        positions.push(matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12], matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13], matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]);
        const tx = matrix[0] * nx + matrix[4] * ny + matrix[8] * nz, ty = matrix[1] * nx + matrix[5] * ny + matrix[9] * nz, tz = matrix[2] * nx + matrix[6] * ny + matrix[10] * nz, l = Math.hypot(tx, ty, tz) || 1;
        normals.push(Math.round(tx / l * 127), Math.round(ty / l * 127), Math.round(tz / l * 127));
        let rgb = factor.slice(0, 3).map(toSrgb);
        if (atlas) { const [u, v] = uv[i], px = triangles ? blurred(atlas, u, v, 6) : atlas.pixel(Math.min(atlas.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * atlas.width))), Math.min(atlas.height - 1, Math.max(0, Math.floor((v - Math.floor(v)) * atlas.height)))); rgb = rgb.map((c, k) => Math.round(c * px[k] / 255)); }
        if (vertexColor) rgb = rgb.map((c, k) => Math.round(c * vertexColor[i][k]));
        colors.push(...rgb);
      }
      const order = primitive.indices !== undefined ? accessor(primitive.indices).map(v => v[0]) : p.map((_, i) => i);
      for (const i of order) indices.push(base + i);
    }
    for (const child of node.children ?? []) visit(child, matrix);
  };
  // glTF is right-handed; the game (Babylon default) is left-handed. Mirroring x converts the
  // geometry, keeps the models' forward axis on +z, and turns glTF's counter-clockwise front faces
  // into the clockwise front faces Babylon expects, so indices keep their order. (Newer Kenney packs
  // draw outlines with an inverted shell, which only works with the correct front faces.)
  const mirror = [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const node of json.scenes[json.scene ?? 0].nodes) visit(node, mirror);
  if (triangles) return simplifyScan(path, positions, colors, indices, triangles);
  // Drop UV seams: merge vertices that share position, normal and colour.
  const unique = new Map(), remap = [], out = { positions: [], normals: [], colors: [] };
  for (let i = 0; i < positions.length / 3; i++) {
    const key = [positions[i * 3].toFixed(4), positions[i * 3 + 1].toFixed(4), positions[i * 3 + 2].toFixed(4), normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2], colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]].join();
    if (!unique.has(key)) { unique.set(key, unique.size); out.positions.push(...positions.slice(i * 3, i * 3 + 3)); out.normals.push(...normals.slice(i * 3, i * 3 + 3)); out.colors.push(...colors.slice(i * 3, i * 3 + 3)); }
    remap.push(unique.get(key));
  }
  if (unique.size > 65535) throw new Error(`${path}: too many vertices`);
  return { ...out, indices: indices.map(i => remap[i]) };
}

/**
 * Photo scans: weld by position (averaging colours across UV seams), simplify with colour as an
 * attribute so lichen and stains keep their place, then rebuild smooth normals and stand the
 * rock on y = 0, centred on x/z.
 */
function simplifyScan(path, positions, colors, indices, triangles) {
  const weld = new Map(), remap = new Uint32Array(positions.length / 3), welded = [], sums = [];
  for (let i = 0; i < positions.length / 3; i++) {
    const key = `${positions[i * 3].toFixed(4)},${positions[i * 3 + 1].toFixed(4)},${positions[i * 3 + 2].toFixed(4)}`;
    let w = weld.get(key); if (w === undefined) { w = welded.length / 3; weld.set(key, w); welded.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]); sums.push(0, 0, 0, 0); }
    remap[i] = w; sums[w * 4] += colors[i * 3]; sums[w * 4 + 1] += colors[i * 3 + 1]; sums[w * 4 + 2] += colors[i * 3 + 2]; sums[w * 4 + 3]++;
  }
  const vertexCount = welded.length / 3, colour = new Float32Array(vertexCount * 3);
  for (let w = 0; w < vertexCount; w++) for (let k = 0; k < 3; k++) colour[w * 3 + k] = sums[w * 4 + k] / sums[w * 4 + 3] / 255;
  const source = new Uint32Array(indices.map(i => remap[i])), pos = new Float32Array(welded);
  const [simplified] = MeshoptSimplifier.simplifyWithAttributes(source, pos, 3, colour, 3, [0.5, 0.5, 0.5], null, triangles * 3, 0.05, []);
  const used = new Map(), out = { positions: [], colors: [], indices: [] };
  for (const i of simplified) { if (!used.has(i)) { used.set(i, used.size); out.positions.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); out.colors.push(...[0, 1, 2].map(k => Math.round(colour[i * 3 + k] * 255))); } out.indices.push(used.get(i)); }
  const n = out.positions.length / 3, min = [0, 1, 2].map(k => Math.min(...out.positions.filter((_, i) => i % 3 === k))), max = [0, 1, 2].map(k => Math.max(...out.positions.filter((_, i) => i % 3 === k)));
  for (let i = 0; i < n; i++) { out.positions[i * 3] -= (min[0] + max[0]) / 2; out.positions[i * 3 + 1] -= min[1]; out.positions[i * 3 + 2] -= (min[2] + max[2]) / 2; }
  const acc = new Float32Array(n * 3);
  for (let t = 0; t < out.indices.length; t += 3) {
    const [a, b, c] = [out.indices[t], out.indices[t + 1], out.indices[t + 2]], P = i => out.positions.slice(i * 3, i * 3 + 3), pa = P(a), pb = P(b), pc = P(c);
    const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]], v = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
    // Clockwise front faces after the mirror: the face normal is v × u.
    const f = [v[1] * u[2] - v[2] * u[1], v[2] * u[0] - v[0] * u[2], v[0] * u[1] - v[1] * u[0]];
    for (const i of [a, b, c]) for (let k = 0; k < 3; k++) acc[i * 3 + k] += f[k];
  }
  const normals = [];
  for (let i = 0; i < n; i++) { const l = Math.hypot(acc[i * 3], acc[i * 3 + 1], acc[i * 3 + 2]) || 1; normals.push(...[0, 1, 2].map(k => Math.round(acc[i * 3 + k] / l * 127))); }
  if (n > 65535) throw new Error(`${path}: too many vertices`);
  return { positions: out.positions, normals, colors: out.colors, indices: out.indices };
}

// Positions are quantised to 16 bits within each model's bounds (sub-millimetre at game scale).
mkdirSync('public/assets/models', { recursive: true });
await MeshoptSimplifier.ready;
const only = process.env.VENUE;
for (const [venue, catalog] of Object.entries(CATALOGS)) {
  if (only && only !== venue) continue;
  const header = { version: 1, source: 'Kenney (kenney.nl) and Poly Haven (polyhaven.com), CC0 1.0', models: {} }, parts = { positions: [], normals: [], colors: [], indices: [] };
  let vertexCount = 0, indexCount = 0;
  for (const entry of catalog) {
    const m = bake(entry), count = m.positions.length / 3;
    const min = [0, 1, 2].map(k => Math.min(...m.positions.filter((_, i) => i % 3 === k))), max = [0, 1, 2].map(k => Math.max(...m.positions.filter((_, i) => i % 3 === k)));
    header.models[entry.key] = { vertexStart: vertexCount, vertexCount: count, indexStart: indexCount, indexCount: m.indices.length, min, max };
    m.positions.forEach((v, i) => { const k = i % 3, span = max[k] - min[k] || 1; parts.positions.push(Math.round((v - min[k]) / span * 65535) - 32768); });
    parts.normals.push(...m.normals); parts.colors.push(...m.colors); parts.indices.push(...m.indices);
    vertexCount += count; indexCount += m.indices.length;
  }
  const positions = Buffer.from(new Int16Array(parts.positions).buffer), indices = Buffer.from(new Uint16Array(parts.indices).buffer);
  const normals = Buffer.from(new Int8Array(parts.normals).buffer), colors = Buffer.from(new Uint8Array(parts.colors));
  header.layout = { positions: [0, positions.length], indices: [positions.length, indices.length], normals: [positions.length + indices.length, normals.length], colors: [positions.length + indices.length + normals.length, colors.length] };
  let json = Buffer.from(JSON.stringify(header)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const size = Buffer.alloc(4); size.writeUInt32LE(json.length);
  const file = Buffer.concat([size, json, positions, indices, normals, colors]);
  writeFileSync(`public/assets/models/${venue}-props.bin`, file);
  console.log(`${venue}: ${catalog.length} props, ${vertexCount} vertices, ${indexCount / 3} triangles, ${(file.length / 1024).toFixed(0)} KB`);
  for (const [key, m] of Object.entries(header.models)) console.log(' ', key.padEnd(24), String(m.vertexCount).padStart(5), 'v', String(m.indexCount / 3).padStart(5), 't  size', m.max.map((v, k) => (v - m.min[k]).toFixed(2)).join(' x '));
}
