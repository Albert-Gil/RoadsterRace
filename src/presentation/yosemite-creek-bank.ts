import type { Point, TrackDefinition } from '../core/types';
import { terrainElevation } from '../core/elevation';
import { yosemiteCreek, yosemiteRivers } from '../core/tracks/yosemite-terrain';
import { yosemiteLakes } from '../core/tracks/yosemite-water';
import { edgeDistance, insidePolygon } from './landscape/mesh';
import { smoothstep } from './landscape/noise';

/**
 * The waterways' rendered banks (presentation only). The core heightfield carves water beds per 4 m
 * grid node, so a rendered grid that copied it showed the water's edge as square steps. Near the
 * creek the rendered ground instead follows the signed distance to the authoritative banks: a
 * straight slope from meadow level `meadowFrom` metres out to the bed `bedIn` metres inside the
 * water, blending back into the core terrain by `blendTo` metres. Support, physics and the water opening
 * are unchanged; ground farther than `blendTo` from the banks is exactly the core terrain.
 */
export const CREEK_BANK = { bed: -3, meadowFrom: 6, bedIn: 1, blendFrom: 6, blendTo: 9 };
const xs = yosemiteCreek.map(p => p.x), zs = yosemiteCreek.map(p => p.z);
const box = { minX: Math.min(...xs) - CREEK_BANK.blendTo, maxX: Math.max(...xs) + CREEK_BANK.blendTo, minZ: Math.min(...zs) - CREEK_BANK.blendTo, maxZ: Math.max(...zs) + CREEK_BANK.blendTo };

/** Signed distance to the creek's banks: negative in the water, Infinity well away from it. */
type RiverBank={footprint:Point[];level:number;box:{minX:number;maxX:number;minZ:number;maxZ:number}};
const riverCache=new WeakMap<TrackDefinition,RiverBank[]>();
function rivers(track:TrackDefinition){let rs=riverCache.get(track);if(!rs){rs=[...yosemiteRivers(track),...yosemiteLakes(track)].map(r=>({footprint:r.footprint,level:r.level,box:{minX:Math.min(...r.footprint.map(p=>p.x))-9,maxX:Math.max(...r.footprint.map(p=>p.x))+9,minZ:Math.min(...r.footprint.map(p=>p.z))-9,maxZ:Math.max(...r.footprint.map(p=>p.z))+9}}));riverCache.set(track,rs);}return rs;}
const nearby=(p:Point,r:RiverBank)=>p.x>=r.box.minX&&p.x<=r.box.maxX&&p.z>=r.box.minZ&&p.z<=r.box.maxZ;
export function creekSide(p: Point,track?:TrackDefinition) {
  if(track)return Math.min(...rivers(track).map(r=>{if(!nearby(p,r))return Infinity;const d=edgeDistance(p,r.footprint);return insidePolygon(p,r.footprint)?-d:d;}));
  if (p.x < box.minX || p.x > box.maxX || p.z < box.minZ || p.z > box.maxZ) return Infinity;
  const d = edgeDistance(p, yosemiteCreek); return insidePolygon(p, yosemiteCreek) ? -d : d;
}

/**
 * The valley floor as if uncarved: the core grid with each carved water-bed node filled from its
 * uncarved neighbours, sampled bilinearly like the core. Smooth across the creek and its rocks.
 */
function uncarvedFloor(track: TrackDefinition) {
  const t = track.terrain!, filled = Float32Array.from(t.heights), known = new Uint8Array(filled.length);
  for (let z = 0; z < t.rows; z++) for (let x = 0; x < t.cols; x++){const p={ x: t.minX + x * t.cell, z: t.minZ + z * t.cell };known[z * t.cols + x] = rivers(track).some(r=>nearby(p,r)&&insidePolygon(p,r.footprint)) ? 0 : 1;}
  for (let pass = 0; pass < 8; pass++) {
    const next = known.slice();
    for (let z = 0; z < t.rows; z++) for (let x = 0; x < t.cols; x++) {
      const i = z * t.cols + x; if (known[i]) continue;
      let sum = 0, count = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz, j = nz * t.cols + nx; if (nx >= 0 && nz >= 0 && nx < t.cols && nz < t.rows && known[j]) { sum += filled[j]; count++; } }
      if (count) { filled[i] = sum / count; next[i] = 1; }
    }
    known.set(next);
  }
  return (x: number, z: number) => {
    const fx = Math.min(t.cols - 1.000001, Math.max(0, (x - t.minX) / t.cell)), fz = Math.min(t.rows - 1.000001, Math.max(0, (z - t.minZ) / t.cell));
    const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz, i = iz * t.cols + ix;
    const top = filled[i] + (filled[i + 1] - filled[i]) * u, bottom = filled[i + t.cols] + (filled[i + t.cols + 1] - filled[i + t.cols]) * u;
    return top + (bottom - top) * v;
  };
}

/** Rendered ground height at (x, z) for the Yosemite valley (before the land's road dip). */
export function yosemiteBankGround(track: TrackDefinition) {
  const core = (x: number, z: number) => terrainElevation({ x, z }, track), floor = uncarvedFloor(track);
  return (x: number, z: number) => {
    const p={x,z},original=core(x,z);let result=Infinity;
    // Blend each shoreline before taking the union: nearest-body selection
    // would step abruptly between a raised plunge pool and a lower creek.
    for(const r of rivers(track)){
      if(!nearby(p,r))continue;
      const side=edgeDistance(p,r.footprint)*(insidePolygon(p,r.footprint)?-1:1);
      if(side>=CREEK_BANK.blendTo)continue;
      const meadow=floor(x,z),slope=Math.min(1,Math.max(0,(CREEK_BANK.meadowFrom-side)/(CREEK_BANK.meadowFrom+CREEK_BANK.bedIn)));
      const bank=meadow+(r.level-.6-meadow)*slope;
      result=Math.min(result,side<=CREEK_BANK.blendFrom?bank:bank+(original-bank)*smoothstep(CREEK_BANK.blendFrom,CREEK_BANK.blendTo,side));
    }
    return Number.isFinite(result)?result:original;
  };
}
