// Bake selected CC0 Kenney models (kenney.nl) into one compact, vertex-coloured geometry file.
//
//   node tools/bake-props.mjs [sourceDir]      (default: asset-sources/kenney, git-ignored)
//
// Sources are the official Kenney packs, each zip unzipped into its own folder:
// asset-sources/kenney/kenney_{watercraft,pirate,suburban,racing,nature}/ (the zips themselves are
// kept in asset-sources/kenney/zips/; provenance, versions and hashes in docs/ASSET_RIGHTS.md).
// Each model's colour atlas is sampled once per vertex, so every prop shares one plain material
// and a whole venue batches into one draw call.
// Output: public/assets/models/<venue>-props.bin — [u32 header bytes][JSON header][binary body].
import { inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const source = process.argv[2] ?? 'asset-sources/kenney';
const glb = (pack, file) => join(source, pack, 'Models', 'GLB format', `${file}.glb`);
const nature = file => join(source, 'kenney_nature', 'Models', 'GLTF format', `${file}.glb`);
const suburbanVariation = name => join(source, 'kenney_suburban', 'Models', 'Textures', `variation-${name}.png`);

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

// ---- GLB reading ----
function readGlb(path) {
  const buffer = readFileSync(path); let offset = 12, json = null, bin = null;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4), chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8')); else if (type === 0x004e4942) bin = chunk;
    offset += 8 + length;
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
function texture(path) { if (!textures.has(path)) textures.set(path, decodePng(readFileSync(path))); return textures.get(path); }

function bake({ path, texture: override }) {
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
        if (atlas) { const [u, v] = uv[i], px = atlas.pixel(Math.min(atlas.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * atlas.width))), Math.min(atlas.height - 1, Math.max(0, Math.floor((v - Math.floor(v)) * atlas.height)))); rgb = rgb.map((c, k) => Math.round(c * px[k] / 255)); }
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
  for (const root of json.scenes[json.scene ?? 0].nodes) visit(root, mirror);
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

// Positions are quantised to 16 bits within each model's bounds (sub-millimetre at game scale).
mkdirSync('public/assets/models', { recursive: true });
for (const [venue, catalog] of Object.entries(CATALOGS)) {
  const header = { version: 1, source: 'Kenney (kenney.nl), CC0 1.0', models: {} }, parts = { positions: [], normals: [], colors: [], indices: [] };
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
