import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { Point, TrackDefinition } from '../core/types';
import { cumulative, projectToPolyline } from '../core/geometry';
import { insideBarrier } from '../core/barriers';
import { jumpCoordinates } from '../core/support';
import { gateCoordinates, startGate } from '../core/start-finish';
import { santaBeachStructures, type SantaBeachStructure } from '../core/tracks/santa-monica-beach';
import { Geometry, edgeDistance, hex, insidePolygon, type Rgb } from './landscape/mesh';
import { random } from './landscape/noise';
import { SANTA, type SantaLayout } from './santa-monica-landscape';
import { santaBeachLifeAppearance } from './themes';

/**
 * Santa Monica's beach life (presentation only, world space, one opaque vertex-coloured batch):
 * - the v4 solid beach structures (track/santa-monica-beach.ts) with the people on them, every
 *   vertex inside its collision rectangle and below its barrier height;
 * - crowds, a ticket booth and a snack cart inside the protected amusement deck, and lamp posts
 *   standing inside the pier-rail footprints;
 * - boats, kayaks, paddle boarders, surfers, swimmers and a buoyed swim zone in open water, clear
 *   of every deck, the jump's loop and the groyne;
 * - flat towels beside the road (no height, like painted wear), and sunbathers, volleyball players,
 *   promenade walkers and cyclists at least 24 m from the course, as loose scatter is.
 * Anything standing within 24 m of the course is inside an authoritative collision footprint.
 */
const A = santaBeachLifeAppearance;
type Palette = Rgb[];
const tones = (list: readonly string[]): Palette => list.map(hex);
const C = {
  skin: tones(A.skin), hair: tones(A.hair), clothes: tones(A.clothes), swim: tones(A.swimwear), towels: tones(A.towels),
  umbrellas: tones(A.umbrellas), boards: tones(A.boards), huts: tones(A.huts), tier: tones(A.tier), fence: tones(A.fence),
  truck: tones(A.truck), cafe: tones(A.cafe), hull: tones(A.hull), sail: tones(A.sail), kayak: tones(A.kayak), buoy: tones(A.buoy), bike: tones(A.bike),
  trim: hex(A.trim), timber: hex(A.timber), deck: hex(A.deck), concrete: hex(A.concrete), steel: hex(A.steel), glass: hex(A.glass), dark: hex(A.dark),
  rope: hex(A.rope), ropeAccent: hex(A.ropeAccent), rescue: hex(A.rescue), yellow: hex(A.yellow), seat: hex(A.seat), stripe: hex(A.truckStripe),
  foam: hex(A.foam), plant: hex(A.plant), pot: hex(A.pot),
};

export type BeachLifeKind = 'structure' | 'amusement' | 'lamp' | 'water' | 'towel' | 'beach';
/** A run of vertices [start, end) placed for one thing, with the footprint it must stay inside (if any). */
export interface BeachLifeGroup { id: string; kind: BeachLifeKind; start: number; end: number; x: number; z: number; footprint?: Point[]; height?: number }
type Pose = 'stand' | 'cheer' | 'sit' | 'sitGround' | 'lie' | 'swim';
interface Look { skin: Rgb; hair: Rgb; top: Rgb; bottom: Rgb }

/** The deterministic batch (no rendering). `track` is the physical (world) Santa Monica track. */
export function santaBeachLife(track: TrackDefinition, layout: SantaLayout) {
  const g = new Geometry(), rnd = random(4127), groups: BeachLifeGroup[] = [];
  let people = 0;
  const pick = <T>(list: readonly T[]) => list[Math.floor(rnd() * list.length) % list.length];
  const shade = (c: Rgb, k: number): Rgb => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)];
  const vary = (c: Rgb, amount = 0.08) => shade(c, 1 - amount / 2 + rnd() * amount);
  const W = SANTA.water, ground = SANTA.level;

  // ---- Primitives. Box faces wind clockwise seen from outside (Geometry's convention).
  type V3 = [number, number, number];
  const quad = (p: V3[], c: Rgb) => { const v = p.map(q => g.vertex(q[0], q[1], q[2], c)); g.triangle(v[0], v[1], v[2]); g.triangle(v[0], v[2], v[3]); };
  /** A box with its base at y, centred on (x, z): w across and d along the heading (0 = +z). */
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, c: Rgb, heading = 0) => {
    const ch = Math.cos(heading), sh = Math.sin(heading), a = -w / 2, b = w / 2, e = -d / 2, f = d / 2, lo = y, hi = y + h;
    const at = (u: number, yy: number, v: number): V3 => [x + u * ch + v * sh, yy, z - u * sh + v * ch];
    const side = shade(c, 0.9);
    quad([at(a, lo, e), at(b, lo, e), at(b, hi, e), at(a, hi, e)], side); quad([at(b, lo, f), at(a, lo, f), at(a, hi, f), at(b, hi, f)], c);
    quad([at(a, lo, f), at(a, lo, e), at(a, hi, e), at(a, hi, f)], side); quad([at(b, lo, e), at(b, lo, f), at(b, hi, f), at(b, hi, e)], c);
    quad([at(a, hi, e), at(b, hi, e), at(b, hi, f), at(a, hi, f)], shade(c, 1.05));
  };
  /** An umbrella canopy: a low cone of alternating panels (and its underside) over (x, z). */
  const canopy = (x: number, y: number, z: number, r: number, h: number, colors: Rgb[], sides = 8) => {
    const ring = Array.from({ length: sides }, (_, i) => { const t = (i + 0.5) / sides * Math.PI * 2; return [x + Math.cos(t) * r, y, z + Math.sin(t) * r] as V3; });
    for (let i = 0; i < sides; i++) {
      const a = ring[i], b = ring[(i + 1) % sides], c = colors[i % colors.length];
      const top = [g.vertex(a[0], a[1], a[2], c), g.vertex(b[0], b[1], b[2], c), g.vertex(x, y + h, z, c)]; g.triangle(top[0], top[1], top[2]);
      const under = shade(c, 0.75), low = [g.vertex(x, y, z, under), g.vertex(b[0], b[1], b[2], under), g.vertex(a[0], a[1], a[2], under)]; g.triangle(low[0], low[1], low[2]);
    }
  };
  /** A local frame on (x, z) facing `heading`: u across (right), v forward. */
  const frame = (x: number, z: number, heading: number) => {
    const ch = Math.cos(heading), sh = Math.sin(heading), to = (u: number, v: number): [number, number] => [x + u * ch + v * sh, z - u * sh + v * ch];
    return {
      to, heading,
      box: (u: number, y: number, v: number, w: number, h: number, d: number, c: Rgb, turn = 0) => { const [px, pz] = to(u, v); box(px, y, pz, w, h, d, c, heading + turn); },
      canopy: (u: number, y: number, v: number, r: number, h: number, colors: Rgb[]) => { const [px, pz] = to(u, v); canopy(px, y, pz, r, h, colors); },
      person: (u: number, y: number, v: number, turn: number, pose: Pose, look = beachLook(), s?: number) => { const [px, pz] = to(u, v); person(px, y, pz, heading + turn, pose, look, s); },
      triangle: (p: [number, number, number][], c: Rgb) => { const v = p.map(([u, y, w]) => { const [px, pz] = to(u, w); return g.vertex(px, y, pz, c); }); g.triangle(v[0], v[1], v[2]); },
    };
  };

  // ---- People: a few boxes each, readable as colourful figures at the overview camera's scale.
  const casualLook = (): Look => ({ skin: pick(C.skin), hair: pick(C.hair), top: vary(pick(C.clothes)), bottom: vary(pick(rnd() < 0.5 ? C.clothes : C.swim)) });
  const beachLook = (): Look => { const skin = pick(C.skin), swim = vary(pick(C.swim)); return { skin, hair: pick(C.hair), top: rnd() < 0.45 ? skin : rnd() < 0.5 ? swim : vary(pick(C.clothes)), bottom: swim }; };
  const person = (x: number, y: number, z: number, heading: number, pose: Pose, look: Look, s = 0.93 + rnd() * 0.12) => {
    const f = frame(x, z, heading), b = f.box; people++;
    if (pose === 'stand' || pose === 'cheer') {
      b(0, y, 0, 0.32 * s, 0.44 * s, 0.2 * s, look.skin); b(0, y + 0.44 * s, 0, 0.36 * s, 0.36 * s, 0.22 * s, look.bottom);
      b(0, y + 0.8 * s, 0, 0.42 * s, 0.56 * s, 0.24 * s, look.top);
      for (const side of [-1, 1]) b(side * 0.27 * s, y + (pose === 'cheer' ? 1.26 : 0.82) * s, 0, 0.1 * s, 0.54 * s, 0.12 * s, look.skin);
      b(0, y + 1.38 * s, 0, 0.2 * s, 0.24 * s, 0.22 * s, look.skin); b(0, y + 1.6 * s, -0.01 * s, 0.22 * s, 0.07 * s, 0.24 * s, look.hair);
    } else if (pose === 'sit') { // On a seat at y, knees forward over its front edge.
      b(0, y, 0.2 * s, 0.34 * s, 0.15 * s, 0.44 * s, look.bottom); b(0, y - 0.4 * s, 0.4 * s, 0.3 * s, 0.4 * s, 0.14 * s, look.skin);
      b(0, y, -0.02 * s, 0.42 * s, 0.58 * s, 0.24 * s, look.top);
      b(0, y + 0.6 * s, 0, 0.2 * s, 0.24 * s, 0.22 * s, look.skin); b(0, y + 0.82 * s, -0.01 * s, 0.22 * s, 0.07 * s, 0.24 * s, look.hair);
    } else if (pose === 'sitGround') { // On the sand or a towel, legs out in front.
      b(0, y, 0.45 * s, 0.32 * s, 0.14 * s, 0.8 * s, look.skin); b(0, y, 0.02 * s, 0.36 * s, 0.17 * s, 0.32 * s, look.bottom);
      b(0, y + 0.1 * s, -0.08 * s, 0.42 * s, 0.56 * s, 0.24 * s, look.top);
      b(0, y + 0.68 * s, -0.08 * s, 0.2 * s, 0.24 * s, 0.22 * s, look.skin); b(0, y + 0.9 * s, -0.09 * s, 0.22 * s, 0.07 * s, 0.24 * s, look.hair);
    } else if (pose === 'lie') { // Face up along the heading: head at the back.
      b(0, y, -0.3 * s, 0.42 * s, 0.2 * s, 0.66 * s, look.top); b(0, y, 0.43 * s, 0.32 * s, 0.15 * s, 0.8 * s, look.skin);
      b(0, y, -0.76 * s, 0.2 * s, 0.2 * s, 0.24 * s, look.skin); b(0, y, -0.91 * s, 0.22 * s, 0.18 * s, 0.06 * s, look.hair);
    } else { // Swimming: head and shoulders at the water line, a ring of foam.
      b(0, y - 0.12, 0, 0.46 * s, 0.14, 0.24 * s, look.skin); b(0, y, 0, 0.2 * s, 0.24 * s, 0.22 * s, look.skin);
      b(0, y + 0.22 * s, -0.01, 0.22 * s, 0.07 * s, 0.24 * s, look.hair);
      for (const turn of [0.5, 1.9]) b(0, y + 0.004, 0, 0.75, 0.02, 0.2, C.foam, turn);
    }
  };
  const umbrella = (x: number, y: number, z: number, r = 1.1, pole = 2.0) => {
    box(x, y, z, 0.06, pole, 0.06, C.trim); const a = pick(C.umbrellas), b = rnd() < 0.5 ? C.umbrellas[1] : pick(C.umbrellas);
    canopy(x, y + pole - 0.15, z, r, 0.42, [a, b]);
  };
  const group = (id: string, kind: BeachLifeKind, x: number, z: number, build: () => void, footprint?: Point[], height?: number) => {
    const start = g.vertexCount; build(); groups.push({ id, kind, start, end: g.vertexCount, x, z, footprint, height });
  };

  // ---- Places: the course, its gate and jump, decks, water and what the camera can see.
  const paths = [{ p: track.centerline, d: track.distances }, ...(track.jumps ?? []).map(j => ({ p: j.branch, d: cumulative(j.branch) }))];
  const gap = (p: Point) => Math.min(...paths.map(path => projectToPolyline(p, path.p, path.d).distance));
  const gate = startGate(track), jump = track.jumps![0];
  const clearOfGate = (p: Point, margin: number) => { const q = gateCoordinates(p, track); return !(q.along > -gate.leadIn - margin && q.along < 8 + margin && Math.abs(q.across) < gate.width / 2 + 8 + margin); };
  const clearOfJump = (p: Point, margin: number) => { const q = jumpCoordinates(p, jump); return !(q.along > -12 - margin && q.along < jump.corridorLength + 12 + margin && Math.abs(q.across) < jump.width / 2 + 6 + margin); };
  const visible = (p: Point) => SANTA.views.some(v => p.x >= v.minX && p.x <= v.maxX && p.z >= v.minZ && p.z <= v.maxZ);
  // Bounding boxes let distance checks skip the far majority of decks and footprints.
  const bounded = <T extends { footprint: Point[] }>(list: T[]) => list.map(item => { const xs = item.footprint.map(p => p.x), zs = item.footprint.map(p => p.z); return { item, minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }; });
  const near = <T>(list: { item: T; minX: number; maxX: number; minZ: number; maxZ: number }[], p: Point, d: number) => list.filter(b => p.x > b.minX - d && p.x < b.maxX + d && p.z > b.minZ - d && p.z < b.maxZ + d).map(b => b.item);
  const decks = bounded(track.supports!.filter(s => s.id !== 'beach-land')), solids = bounded(track.barriers);
  const clearOfDecks = (p: Point, d: number) => near(decks, p, d).every(s => !insidePolygon(p, s.footprint) && edgeDistance(p, s.footprint) > d);
  const clearOfSolids = (p: Point, d: number) => near(solids, p, d).every(b => !insideBarrier(p, b) && edgeDistance(p, b.footprint) >= d);
  // The jump's loop on the pier (the main road between its two ends): no boats in or beside it.
  const loop = track.centerline.filter((_, i) => track.distances[i] >= jump.entryProgress && track.distances[i] <= jump.exitProgress);
  const loopBox = { minX: Math.min(...loop.map(p => p.x)) - 10, maxX: Math.max(...loop.map(p => p.x)) + 10, minZ: Math.min(...loop.map(p => p.z)) - 10, maxZ: Math.max(...loop.map(p => p.z)) + 10 };
  const segment = (p: Point, a: Point, b: Point) => { const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz))); return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t); };
  /** Open water a boat of radius r may float in. */
  const openWater = (p: Point, r: number) => p.x - layout.shoreX(p.z) > 9 + r && visible(p)
    && clearOfDecks(p, 6 + r)
    && (track.waterOpenings ?? []).every(s => !insidePolygon(p, s.footprint) && edgeDistance(p, s.footprint) > 6 + r)
    && !(p.x > loopBox.minX && p.x < loopBox.maxX && p.z > loopBox.minZ && p.z < loopBox.maxZ)
    && segment(p, SANTA.groyne.from, SANTA.groyne.to) > 8 + r && clearOfJump(p, r);
  /** Beach land at least 24 m (plus clearance) from the course, clear of footprints, paths and courts. */
  const farSand = (p: Point, r: number, courts = false) => visible(p) && layout.onLand(p) && p.x < layout.shoreX(p.z) - 5 - r
    && layout.D.exact(p.x, p.z) >= SANTA.corridor + 2 + r && (courts || layout.flatness(p.x, p.z) > 2 + r)
    && clearOfSolids(p, r + 1);

  // ---- Solid beach structures (the v4 barriers): drawn in a frame facing the road.
  const structureFrame = (s: SantaBeachStructure) => {
    const cx = s.x, cz = -s.z, near = projectToPolyline({ x: cx, z: cz }, track.centerline, track.distances).point;
    const dx = near.x - cx, dz = near.z - cz;
    const facing = Math.abs(dx) > Math.abs(dz) ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) };
    const across = facing.x ? s.depth : s.width, along = facing.x ? s.width : s.depth;
    return { cx, cz, f: frame(cx, cz, Math.atan2(facing.x, facing.z)), Ls: across, Lf: along };
  };
  const palms = SANTA.palms.map(p => ({ x: p.x, z: p.z }));

  const terrace = (s: SantaBeachStructure) => {
    const { f, Ls, Lf } = structureFrame(s), pad = 0.12, base = ground + pad, tiers = 3, rise = 0.45, depth = (Lf - 0.9) / tiers;
    f.box(0, ground, 0, Ls - 0.06, pad, Lf - 0.06, C.concrete);
    // Sponsor-free fence boards along the front, in alternating venue colours.
    const panels = Math.max(2, Math.round((Ls - 0.3) / 2));
    for (let i = 0; i < panels; i++) f.box(-(Ls - 0.3) / 2 + (i + 0.5) * (Ls - 0.3) / panels, base, Lf / 2 - 0.2, (Ls - 0.3) / panels - 0.04, 0.72, 0.1, C.fence[i % C.fence.length]);
    let back = Lf / 2;
    for (let k = 0; k < tiers; k++) {
      const front = Lf / 2 - 0.45 - k * depth, top = base + (k + 1) * rise; back = front - depth;
      f.box(0, base, front - depth / 2, Ls - 0.3, (k + 1) * rise, depth, C.tier[k % 2]);
      f.box(0, top, front - 0.26, Ls - 0.3, 0.05, 0.42, C.seat);
      for (let u = -Ls / 2 + 0.55; u <= Ls / 2 - 0.55; u += 0.6 + rnd() * 0.12) {
        if (rnd() < 0.14) continue;
        if (k === 0 && rnd() < 0.18) f.person(u, top, front - 0.4, 0, rnd() < 0.5 ? 'cheer' : 'stand', casualLook());
        else f.person(u, top + 0.05, front - 0.36, 0, 'sit', casualLook());
      }
    }
    // Shade canopy over the back two tiers on four posts; striped panels.
    const canopyFront = Lf / 2 - 0.45 - depth + 0.1, canopyBack = -Lf / 2 + 0.08, roof = 2.72;
    for (const u of [-Ls / 2 + 0.2, -Ls / 6, Ls / 6, Ls / 2 - 0.2]) f.box(u, ground + pad, back + 0.12, 0.1, roof - pad - ground, 0.1, C.steel);
    const strips = Math.round(Ls / 1.2);
    for (let i = 0; i < strips; i++) f.box(-(Ls - 0.1) / 2 + (i + 0.5) * (Ls - 0.1) / strips, roof, (canopyFront + canopyBack) / 2, (Ls - 0.1) / strips, 0.08, canopyFront - canopyBack, i % 2 ? C.trim : C.umbrellas[0]);
  };

  const lifeguardTower = (s: SantaBeachStructure, index: number) => {
    const { f, Ls, Lf } = structureFrame(s), deck = 1.6, hut = C.huts[index % C.huts.length];
    f.box(0, ground, 0, Ls - 0.06, 0.1, Lf - 0.06, C.concrete);
    const top = ground + 0.1, u0 = 1.35;
    f.box(u0, deck - 0.12, 0, 3.6, 0.12, 3.5, C.deck);
    for (const u of [u0 - 1.65, u0 + 1.65]) for (const v of [-1.6, 1.6]) f.box(u, top, v, 0.16, deck - 0.12 - top, 0.16, C.trim);
    for (const v of [-1.6, 1.6]) f.box(u0, top + 0.55, v, 3.3, 0.08, 0.08, C.trim);
    f.box(u0 + 0.1, deck, -0.2, 2.8, 1.85, 2.5, hut);
    f.box(u0 + 0.1, deck + 0.95, 1.06, 2.4, 0.62, 0.04, C.glass);
    for (const u of [u0 - 1.31, u0 + 1.51]) f.box(u, deck + 0.95, -0.2, 0.04, 0.62, 2.0, C.glass);
    f.box(u0 + 0.1, deck + 1.85, -0.2, 3.2, 0.16, 2.9, C.trim);
    f.box(u0 + 0.1, deck + 1.72, 1.2, 3.0, 0.1, 0.04, C.rescue);
    // Front rail, a rescue buoy hung on it, the flag on the roof and the lifeguard on watch.
    for (let u = u0 - 1.7; u <= u0 + 1.71; u += 0.85) f.box(u, deck, 1.65, 0.07, 0.95, 0.07, C.trim);
    f.box(u0, deck + 0.9, 1.65, 3.5, 0.06, 0.07, C.trim);
    f.box(u0 - 1.0, deck + 0.3, 1.7, 0.55, 0.22, 0.06, C.rescue);
    f.box(u0 + 1.45, deck + 2.01, -1.45, 0.05, 0.28, 0.05, C.steel);
    f.box(u0 + 1.45, deck + 2.08, -1.7, 0.02, 0.18, 0.42, C.rescue);
    f.person(u0 + 0.4, deck, 1.25, 0, 'stand', { skin: pick(C.skin), hair: pick(C.hair), top: C.rescue, bottom: C.rescue });
    // Stepped ramp down the back corner to the sand, and a rescue board lying beside the stilts.
    for (let i = 0; i < 6; i++) f.box(u0 - 2.0 - i * 0.5, top, -1.05, 0.5, (deck - top) * (1 - (i + 1) / 7), 1.0, C.deck);
    f.box(-1.95, top, 1.45, 2.6, 0.07, 0.5, C.yellow); f.box(-1.95, top + 0.07, 1.45, 2.6, 0.01, 0.1, C.rescue);
  };

  const club = (s: SantaBeachStructure) => {
    const { f, Ls, Lf, cx, cz } = structureFrame(s), deck = ground + 0.14;
    f.box(0, ground, 0, Ls - 0.06, 0.14, Lf - 0.06, C.timber);
    // Rope fence on short posts, open at the back.
    const posts: [number, number][] = [], u1 = Ls / 2 - 0.15, v1 = Lf / 2 - 0.15;
    const edge = (a: [number, number], b: [number, number], gapAt?: number) => {
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.8));
      for (let i = 0; i <= n; i++) { const t = i / n, p: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; if (gapAt === undefined || Math.abs(p[0] - gapAt) > 0.7) posts.push(p); }
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, m: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], len = Math.hypot(b[0] - a[0], b[1] - a[1]) / n;
        if (gapAt !== undefined && Math.abs(m[0] - gapAt) < 1.1) continue;
        f.box(m[0], deck + 0.68, m[1], a[1] === b[1] ? len : 0.04, 0.04, a[1] === b[1] ? 0.04 : len, i % 2 ? C.rope : C.ropeAccent);
      }
    };
    edge([-u1, v1], [u1, v1]); edge([-u1, -v1], [u1, -v1], 0); edge([-u1, -v1], [-u1, v1]); edge([u1, -v1], [u1, v1]);
    for (const [u, v] of posts) { f.box(u, deck, v, 0.1, 0.78, 0.1, C.trim); f.box(u, deck + 0.78, v, 0.13, 0.06, 0.13, C.ropeAccent); }
    // A palm already rooted here gets a ring bench and a few people in its shade.
    const local = palms.map(p => { const dx = p.x - cx, dz = p.z - cz, h = f.heading; return { u: dx * Math.cos(h) - dz * Math.sin(h), v: dx * Math.sin(h) + dz * Math.cos(h) }; })
      .filter(p => Math.abs(p.u) < Ls / 2 && Math.abs(p.v) < Lf / 2);
    for (const p of local) {
      for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; f.box(p.u + Math.cos(t) * 0.75, deck, p.v + Math.sin(t) * 0.75, 0.62, 0.42, 0.3, C.timber, -t); }
      for (let i = 0; i < 2; i++) { const t = 0.6 + i * 2.6; f.person(p.u + Math.cos(t) * 0.85, deck + 0.42, p.v + Math.sin(t) * 0.85, Math.PI / 2 - t, 'sit', beachLook()); }
    }
    const units = Math.floor((Ls - 2.4) / 3) + 1, spacing = (Ls - 3.2) / Math.max(1, units - 1);
    for (let i = 0; i < units; i++) {
      // The palm shades a unit instead of its umbrella; loungers never cut into the ring bench.
      const u = units === 1 ? 0 : -Ls / 2 + 1.6 + i * spacing, v = -0.35;
      if (local.every(p => Math.hypot(p.u - u, p.v - v) > 2.3)) { const [ux, uz] = f.to(u, v); umbrella(ux, deck, uz, 1.1, 1.92); }
      for (const side of [-1, 1]) {
        const lu = u + side * 0.55, cushion = pick(C.towels);
        if (local.some(p => Math.hypot(Math.max(0, Math.abs(p.u - lu) - 0.3), Math.max(0, Math.abs(p.v - 0.1) - 0.9)) < 1.15)) continue;
        f.box(lu, deck, 0.1, 0.6, 0.25, 1.8, C.trim); f.box(lu, deck + 0.25, 0.25, 0.56, 0.05, 1.5, cushion); f.box(lu, deck + 0.25, -0.62, 0.56, 0.32, 0.34, cushion);
        if (rnd() < 0.75) f.person(lu, deck + 0.3, 0.2, 0, 'lie', beachLook());
      }
    }
    // Drinks cooler and a couple chatting at the front rope.
    f.box(Ls / 2 - 1.2, deck, Lf / 2 - 0.85, 0.6, 0.4, 0.4, C.rescue); f.box(Ls / 2 - 1.2, deck + 0.4, Lf / 2 - 0.85, 0.62, 0.06, 0.42, C.trim);
    f.person(-Ls / 2 + 1.3, deck, Lf / 2 - 0.8, Math.PI / 2, 'stand', beachLook()); f.person(-Ls / 2 + 1.9, deck, Lf / 2 - 0.75, -Math.PI / 2, 'stand', beachLook());
  };

  const surfRental = (s: SantaBeachStructure) => {
    const { f, Ls, Lf } = structureFrame(s), top = ground + 0.1, wall = C.huts[1];
    f.box(0, ground, 0, Ls - 0.06, 0.1, Lf - 0.06, C.timber);
    const su = -Ls / 2 + 2.05, sv = -Lf / 2 + 1.2;
    f.box(su, top, sv, 3.7, 2.4, 2.2, wall);
    f.box(su, top + 2.4, sv + 0.3, 3.9, 0.14, 2.8, C.trim);
    f.box(su, top + 2.54, sv + 1.53, 3.4, 0.46, 0.07, C.boards[5]); f.box(su, top + 2.66, sv + 1.575, 3.0, 0.12, 0.02, C.trim);
    f.box(su, top + 1.0, sv + 1.11, 2.6, 0.9, 0.04, C.glass); f.box(su, top + 0.95, sv + 1.25, 2.8, 0.07, 0.3, C.trim);
    for (const u of [0.6, Ls / 2 - 0.35]) f.box(u, top, -1.2, 0.1, 1.7, 0.1, C.timber);
    f.box((0.6 + Ls / 2 - 0.35) / 2, top + 1.6, -1.2, Ls / 2 - 0.85, 0.08, 0.1, C.timber);
    for (let i = 0; i < 6 && 0.85 + i * 0.55 < Ls / 2 - 0.3; i++) f.box(0.85 + i * 0.55, top + 0.05, -1.02, 0.46, 2.2, 0.07, C.boards[i % C.boards.length]);
    f.box(-Ls / 2 + 1.9, top, 1.25, 2.6, 0.07, 0.55, pick(C.boards)); f.box(-Ls / 2 + 2.1, top, 1.95, 2.4, 0.07, 0.5, pick(C.boards));
    f.box(Ls / 2 - 1.8, top, 1.8, 2.7, 0.28, 0.62, pick(C.kayak)); f.box(Ls / 2 - 1.8, top + 0.28, 1.8, 0.7, 0.03, 0.4, C.dark);
    f.person(su + 0.6, top, 0.55, Math.PI, 'stand', beachLook()); f.person(su - 0.7, top, 0.7, Math.PI, 'stand', beachLook());
    f.person(0.95, top, 0.65, Math.PI / 2, 'stand', beachLook()); f.box(0.95, top, 0.95, 0.07, 2.0, 0.48, pick(C.boards), Math.PI / 2);
  };

  const cafe = (s: SantaBeachStructure) => {
    const { f, Ls, Lf } = structureFrame(s), top = ground + 0.39;
    f.box(0, ground, 0, Ls - 0.06, 0.39, Lf - 0.06, C.timber);
    f.box(0, ground, 0, Ls - 0.04, 0.08, Lf - 0.04, C.deck);
    for (let u = -Ls / 2 + 0.1; u <= Ls / 2 - 0.09; u += (Ls - 0.2) / 6) if (Math.abs(u) > 0.5) f.box(u, top, Lf / 2 - 0.1, 0.07, 0.9, 0.07, C.trim);
    for (const side of [-1, 1]) {
      f.box(side * (Ls / 4 + 0.25), top + 0.86, Lf / 2 - 0.1, Ls / 2 - 1.1, 0.06, 0.07, C.trim);
      for (let v = -Lf / 2 + 0.1; v <= Lf / 2 - 0.09; v += (Lf - 0.2) / 4) f.box(side * (Ls / 2 - 0.1), top, v, 0.07, 0.9, 0.07, C.trim);
      f.box(side * (Ls / 2 - 0.1), top + 0.86, 0, 0.07, 0.06, Lf - 0.2, C.trim);
    }
    const ku = -Ls / 2 + 1.65, kv = -Lf / 2 + 1.05;
    f.box(ku, top, kv, 3.0, 2.15, 1.9, C.cafe[0]); f.box(ku, top + 2.15, kv + 0.1, 3.2, 0.12, 2.2, C.cafe[2]);
    f.box(ku, top + 0.95, kv + 0.97, 2.4, 0.85, 0.04, C.glass); f.box(ku, top + 0.9, kv + 1.1, 2.6, 0.06, 0.25, C.trim);
    for (let i = 0; i < 5; i++) f.box(ku - 1.2 + i * 0.6, top + 1.85, kv + 1.2, 0.6, 0.07, 0.5, i % 2 ? C.trim : C.cafe[1]);
    f.person(ku - 0.6, top, kv + 1.45, Math.PI, 'stand', casualLook()); f.person(ku + 0.5, top, kv + 1.5, Math.PI, 'stand', casualLook());
    for (const [u, v] of [[0.5, 1.2], [Ls / 2 - 1.4, -0.4], [-Ls / 2 + 2.1, 1.35]] as const) {
      f.box(u, top, v, 0.08, 0.72, 0.08, C.steel); f.box(u, top + 0.72, v, 0.8, 0.05, 0.8, C.trim);
      f.box(u, top + 0.77, v, 0.05, 1.1, 0.05, C.trim); f.canopy(u, top + 1.85, v, 1.0, 0.42, [C.cafe[1], C.trim]);
      const seats = 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < seats; k++) {
        const t = k / seats * Math.PI * 2 + 0.4, su = u + Math.cos(t) * 0.78, sv = v + Math.sin(t) * 0.78;
        f.box(su, top, sv, 0.32, 0.45, 0.32, C.steel); f.person(su, top + 0.45, sv, Math.atan2(-Math.cos(t), -Math.sin(t)), 'sit', casualLook());
      }
    }
    for (const side of [-1, 1]) { f.box(side * (Ls / 2 - 0.45), top, Lf / 2 - 0.45, 0.42, 0.4, 0.42, C.pot); f.box(side * (Ls / 2 - 0.45), top + 0.4, Lf / 2 - 0.45, 0.5, 0.4, 0.5, C.plant); }
  };

  const foodTruck = (s: SantaBeachStructure) => {
    const { f, Ls, Lf } = structureFrame(s), top = ground + 0.06, body = C.truck[0];
    f.box(0, ground, 0, Ls - 0.06, 0.06, Lf - 0.06, C.concrete);
    const bu = -0.7, bv = -0.65;
    f.box(bu, top + 0.55, bv, 5.2, 2.2, 2.1, body); f.box(bu, top + 0.95, bv, 5.22, 0.18, 2.12, C.stripe);
    f.box(2.65, top + 0.55, bv, 1.5, 1.85, 2.0, C.truck[1]); f.box(3.41, top + 1.5, bv, 0.04, 0.7, 1.7, C.glass);
    f.box(2.75, top + 1.55, bv + 1.01, 0.9, 0.6, 0.04, C.glass); f.box(3.43, top + 0.35, bv, 0.12, 0.3, 2.0, C.steel);
    for (const u of [-2.4, 2.6]) for (const v of [bv - 0.98, bv + 0.98]) f.box(u, top, v, 0.75, 0.75, 0.28, C.dark);
    f.box(bu - 0.3, top + 1.35, bv + 1.06, 3.2, 0.85, 0.04, C.glass); f.box(bu - 0.3, top + 1.3, bv + 1.2, 3.3, 0.06, 0.3, C.steel);
    f.box(bu - 0.3, top + 2.3, bv + 1.5, 3.4, 0.06, 0.9, C.cafe[1]);
    f.box(bu - 0.9, top + 2.75, bv - 0.05, 1.0, 0.2, 0.9, C.steel);
    for (let i = 0; i < 4; i++) f.person(-3.0 + i * 1.0 + rnd() * 0.2, top, 1.6 - rnd() * 0.15, Math.PI + (rnd() - 0.5) * 0.6, 'stand', casualLook());
    f.person(2.3, top, 1.4, -Math.PI / 2, 'stand', casualLook()); f.box(Ls / 2 - 0.45, top, Lf / 2 - 0.4, 0.45, 0.8, 0.45, C.plant);
  };

  santaBeachStructures.forEach((s, index) => {
    const world = { x: s.x, z: -s.z }, barrier = track.barriers.find(b => b.id === s.id)!;
    group(s.id, 'structure', world.x, world.z, () => {
      if (s.kind === 'spectator-terrace') terrace(s); else if (s.kind === 'lifeguard-tower') lifeguardTower(s, index);
      else if (s.kind === 'beach-club') club(s); else if (s.kind === 'surf-rental') surfRental(s);
      else if (s.kind === 'beach-cafe') cafe(s); else foodTruck(s);
    }, barrier.footprint, s.height);
  });

  // ---- The amusement deck's protected area: queues, strollers, a ticket booth and a snack cart.
  const fun = track.barriers.find(b => b.id === 'amusement-protected')!;
  group('amusement-crowd', 'amusement', 95, -31, () => {
    // People stand on the protected plaza's top (its solid footprint is drawn as a raised slab).
    const at = (x: number, z: number) => ({ x, z: -z }), y = (fun.baseHeight ?? 0) + fun.height + 0.003; // Authored pier coordinates, reflected.
    const booth = at(79, 26.6); box(booth.x, y, booth.z, 1.6, 2.2, 1.3, C.cafe[1]); box(booth.x, y + 2.2, booth.z, 1.9, 0.12, 1.6, C.trim);
    box(booth.x, y + 0.97, booth.z - 0.66, 1.0, 0.7, 0.04, C.glass);
    const cart = at(95.5, 36.4); box(cart.x, y, cart.z, 1.6, 1.0, 0.9, C.trim); box(cart.x, y + 1.0, cart.z, 1.7, 0.08, 1.0, C.cafe[1]); umbrella(cart.x, y, cart.z, 0.75, 1.9);
    for (let i = 0; i < 9; i++) { const p = at(81.2 + i * 1.05, 27.6 + (rnd() - 0.5) * 0.3); person(p.x, y, p.z, -Math.PI / 2 + (rnd() - 0.5) * 0.5, 'stand', casualLook()); }
    for (const x of [78.5, 84.5, 90.5]) { const p = at(x, 37.25); box(p.x, y, p.z, 1.6, 0.45, 0.45, C.timber); for (const dx of [-0.4, 0.4]) if (rnd() < 0.8) person(p.x + dx, y + 0.45, p.z + 0.05, 0, 'sit', casualLook()); }
    const zones = [[77, 95, 34.4, 36.5], [91, 96, 24.8, 27.2], [99, 114, 24.7, 25.3], [99, 114, 36.7, 37.3]] as const;
    const placed: Point[] = [], kept = [{ ...booth, r: 1.4 }, { ...cart, r: 1.3 }];
    for (const [x0, x1, z0, z1] of zones) for (let k = 0, made = 0; k < 60 && made < Math.ceil((x1 - x0) * 0.75); k++) {
      const p = at(x0 + rnd() * (x1 - x0), z0 + rnd() * (z1 - z0));
      if (placed.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 0.8) || kept.some(q => Math.hypot(q.x - p.x, q.z - p.z) < q.r) || edgeDistance(p, fun.footprint) < 0.45 || !insidePolygon(p, fun.footprint)) continue;
      placed.push(p); made++; person(p.x, y, p.z, rnd() * Math.PI * 2, rnd() < 0.15 ? 'cheer' : 'stand', casualLook(), 0.8 + rnd() * 0.3);
    }
  }, fun.footprint);

  // ---- Lamp posts inside the pier-rail footprints (every few rail pieces) and the amusement corners.
  const rails = track.barriers.filter(b => b.kind === 'pier-rail' && /^(outbound|return|jump|inbound)-/.test(b.id));
  rails.forEach((b, i) => {
    if (i % 4) return;
    const xs = b.footprint.map(p => p.x), zs = b.footprint.map(p => p.z), x = xs.reduce((s, v) => s + v, 0) / xs.length, z = zs.reduce((s, v) => s + v, 0) / zs.length;
    const a = b.footprint[0], c = b.footprint[1], heading = Math.atan2(c.x - a.x, c.z - a.z);
    if (!clearOfJump({ x, z }, -6)) return;
    group(b.id + '-lamp', 'lamp', x, z, () => {
      box(x, 0.05, z, 0.12, 3.3, 0.12, C.steel, heading); box(x, 3.35, z, 0.28, 0.36, 0.28, C.trim, heading); box(x, 3.71, z, 0.32, 0.06, 0.32, hex('#eec575'), heading);
    }, b.footprint);
  });

  // ---- Open water: sailboats and motor boats offshore, kayaks and paddle boarders in the calm
  // water inside the pier, surfers beyond a buoyed swim zone south of the pier.
  const floating: { x: number; z: number; r: number }[] = [];
  const float = (id: string, x: number, z: number, r: number, build: () => void, spaced = true) => {
    const p = { x, z }; if (!openWater(p, r) || spaced && floating.some(q => Math.hypot(q.x - x, q.z - z) < q.r + r + 2)) return;
    floating.push({ x, z, r }); group(id, 'water', x, z, build);
  };
  const sailboat = (x: number, z: number, h: number) => float('sailboat', x, z, 4, () => {
    const f = frame(x, z, h), hull = pick(C.hull);
    f.box(0, W - 0.45, -0.2, 1.9, 0.85, 5.0, hull); f.box(0, W - 0.35, 2.75, 1.2, 0.75, 1.0, hull); f.box(0, W + 0.38, 0, 1.7, 0.05, 5.4, C.timber);
    f.box(0, W + 0.43, -0.7, 1.1, 0.5, 1.8, C.trim); f.box(0, W + 0.6, 0.21, 1.0, 0.25, 0.04, C.glass);
    f.box(0, W + 0.43, 0.6, 0.1, 6.0, 0.1, C.trim); f.box(0, W + 1.1, -0.45, 0.07, 0.07, 2.0, C.trim);
    const sail = pick(C.sail);
    f.triangle([[0, W + 1.16, 0.55], [0, W + 6.2, 0.58], [0, W + 1.16, -1.42]], sail); f.triangle([[0, W + 1.16, 0.55], [0, W + 1.16, -1.42], [0, W + 6.2, 0.58]], sail);
    f.triangle([[0, W + 0.5, 3.15], [0, W + 0.5, 0.75], [0, W + 5.5, 0.68]], sail); f.triangle([[0, W + 0.5, 3.15], [0, W + 5.5, 0.68], [0, W + 0.5, 0.75]], sail);
  });
  const motorboat = (x: number, z: number, h: number, rescue = false) => float(rescue ? 'rescue-boat' : 'motorboat', x, z, 5, () => {
    const f = frame(x, z, h), hull = rescue ? C.rescue : pick(C.hull);
    f.box(0, W - 0.4, -0.2, 2.0, 0.85, 4.6, hull); f.box(0, W - 0.3, 2.45, 1.3, 0.7, 0.9, hull); f.box(0, W + 0.15, -0.2, 2.02, 0.12, 4.62, rescue ? C.yellow : C.ropeAccent);
    f.box(0, W + 0.45, 0.3, 1.5, 0.55, 1.6, C.trim); f.box(0, W + 0.65, 1.12, 1.4, 0.4, 0.04, C.glass);
    if (rescue) f.person(0, W + 0.45, -1.2, 0, 'sit', { skin: pick(C.skin), hair: pick(C.hair), top: C.yellow, bottom: C.rescue });
    for (const side of [-1, 1]) { f.box(side * 1.0, W + 0.006, -3.9, 0.3, 0.015, 3.2, C.foam, side * 0.25); f.box(side * 0.35, W + 0.005, -3.2, 0.22, 0.015, 1.6, C.foam, side * 0.1); }
  });
  const kayak = (x: number, z: number, h: number) => float('kayak', x, z, 2, () => {
    const f = frame(x, z, h); f.box(0, W - 0.12, 0, 0.62, 0.3, 3.0, pick(C.kayak)); f.box(0, W + 0.18, 0, 0.6, 0.02, 0.6, C.dark);
    f.person(0, W + 0.12, -0.1, 0, 'sitGround', beachLook()); f.box(0, W + 0.6, 0.15, 2.1, 0.04, 0.1, C.dark, 0.35);
  });
  const paddleboard = (x: number, z: number, h: number) => float('paddleboard', x, z, 2, () => {
    const f = frame(x, z, h); f.box(0, W - 0.03, 0, 0.75, 0.09, 3.0, pick(C.boards)); f.person(0, W + 0.06, 0, 0, 'stand', beachLook());
    f.box(0.36, W + 0.1, 0.35, 0.04, 1.85, 0.06, C.dark);
  });
  const surfer = (x: number, z: number, h: number, standing: boolean) => float('surfer', x, z, 1.5, () => {
    const f = frame(x, z, h); f.box(0, W - 0.03, 0, 0.55, 0.07, 2.2, pick(C.boards));
    if (standing) { f.person(0, W + 0.04, 0, Math.PI / 2, 'stand', beachLook(), 0.9); for (const side of [-1, 1]) f.box(side * 0.35, W + 0.003, -1.9, 0.18, 0.015, 1.8, C.foam, side * 0.3); }
    else f.person(0, W + 0.05, 0.25, Math.PI, 'lie', beachLook());
  });
  for (const [x, z, h] of [[205, 46, 0.3], [224, -34, 1.9], [150, 86, 2.6], [96, 92, 0.9], [232, 88, -0.4], [190, -66, 2.2]] as const) sailboat(x, z, h);
  for (const [x, z, h] of [[178, 64, -2.4], [214, 6, 0.4], [120, 70, 1.2]] as const) motorboat(x, z, h);
  motorboat(78, 67, 1.6, true);
  for (const [x, z, h] of [[52, -24, 0.4], [60, -33, 2.1], [134, -18, 1.0], [140, -30, -0.8]] as const) kayak(x, z, h);
  for (const [x, z, h] of [[47, -12, 2.8], [62, -9, -0.6], [55, -37, 1.4], [128, -34, 0.2], [96, 76, 1.9]] as const) paddleboard(x, z, h);
  for (const [x, z, h, standing] of [[66, 62, -1.6, false], [70, 71, -1.5, true], [64, 75, -1.7, false]] as const) surfer(x, z, h, standing);
  // The swim zone: a buoy line parallel to the shore, swimmers between it and the beach.
  const swimX = 57;
  for (let i = 0; i < 8; i++) { const z = 61 + i * 1.85; float('swim-buoy', swimX, z, 0.3, () => box(swimX, W - 0.2, z, 0.38, 0.5, 0.38, C.buoy[i % 2]), false); }
  for (const z of [59.5, 76]) float('swim-marker', swimX + 0.5, z, 0.6, () => { box(swimX + 0.5, W - 0.3, z, 0.7, 1.1, 0.7, C.buoy[1]); box(swimX + 0.5, W + 0.8, z, 0.5, 0.3, 0.5, C.buoy[2]); }, false);
  for (let k = 0, made = 0; k < 80 && made < 9; k++) {
    const z = 60 + rnd() * 15, x = layout.shoreX(z) + 10 + rnd() * (swimX - 1.5 - layout.shoreX(z) - 10);
    float('swimmer', x, z, 0.5, () => { person(x, W, z, rnd() * 6.28, 'swim', beachLook()); made++; });
  }

  // ---- Flat towels on the beach side of the road (2+ m beyond the edge): no height, like the painted wear.
  for (let i = 1, next = 0, made = 0; i < track.centerline.length && made < 30; i++) {
    if (track.distances[i] < next) continue; next = track.distances[i] + 4 + rnd() * 4;
    const p = track.centerline[i], a = track.centerline[i - 1], dx = p.x - a.x, dz = p.z - a.z, l = Math.hypot(dx, dz) || 1;
    const off = track.roadWidth / 2 + 5 + rnd() * 6, at = (side: number) => ({ x: p.x - dz / l * side * off, z: p.z + dx / l * side * off });
    const q = insidePolygon(at(1), track.centerline) ? at(-1) : at(1);
    if (insidePolygon(q, track.centerline) || !layout.onLand(q) || q.x > layout.shoreX(q.z) - 4 || gap(q) < track.roadWidth / 2 + 3 || !clearOfGate(q, 3) || !clearOfJump(q, 4) || layout.flatness(q.x, q.z) < 1.5) continue;
    if (!clearOfSolids(q, 1.6) || !clearOfDecks(q, 3)) continue;
    const heading = Math.atan2(dx, dz) + (rnd() - 0.5) * 1.2, color = pick(C.towels);
    group('roadside-towel', 'towel', q.x, q.z, () => { box(q.x, ground + 0.02, q.z, 0.95, 0.035, 1.8, color, heading); if (rnd() < 0.5) box(q.x, ground + 0.055, q.z, 0.95, 0.004, 0.18, C.trim, heading); });
    made++;
  }

  // ---- Far beach (24+ m from the course): umbrella groups, volleyball, promenade and bike path.
  for (let k = 0, made = 0; k < 900 && made < 18; k++) {
    const z = SANTA.visible.minZ + 20 + rnd() * (SANTA.visible.maxZ - SANTA.visible.minZ - 40), x = layout.shoreX(z) - 8 - rnd() * 55, p = { x, z };
    if (!farSand(p, 3) || layout.height(x, z) > ground + 0.3 || groups.some(q => q.kind === 'beach' && Math.hypot(q.x - x, q.z - z) < 9)) continue;
    made++;
    const heading = (rnd() - 0.5) * 1.4 + Math.PI / 2, f = frame(x, z, heading), y = layout.height(x, z);
    group('sunbathers', 'beach', x, z, () => {
      umbrella(x, y, z, 1.15, 2.05);
      const towels = 1 + Math.floor(rnd() * 2);
      for (let t = 0; t < towels; t++) {
        const u = (t - (towels - 1) / 2) * 1.15;
        f.box(u, y + 0.01, 0.35, 0.95, 0.03, 1.8, pick(C.towels));
        if (rnd() < 0.8) f.person(u, y + 0.04, 0.4, 0, rnd() < 0.65 ? 'lie' : 'sitGround', beachLook());
      }
      if (rnd() < 0.5) f.box(towels * 0.7 + 0.2, y, -0.6, 0.5, 0.36, 0.34, rnd() < 0.5 ? C.rescue : C.ropeAccent);
      if (rnd() < 0.35) f.person(-towels * 0.8 - 0.4, y, 1.4, Math.PI, 'stand', beachLook());
    });
  }
  for (const court of SANTA.courts) group('volleyball', 'beach', court.x, court.z, () => {
    if (!farSand(court, 8, true)) return;
    for (const side of [-1, 1]) for (const dz of [-1.8, 1.8]) person(court.x + side * (3 + rnd() * 1.5), ground, court.z + dz + (rnd() - 0.5), side > 0 ? -Math.PI / 2 : Math.PI / 2, rnd() < 0.3 ? 'cheer' : 'stand', beachLook());
    box(court.x + 1.4 * (rnd() < 0.5 ? -1 : 1), 3.1, court.z + (rnd() - 0.5) * 3, 0.24, 0.24, 0.24, C.yellow);
  });
  for (let k = 0, made = 0; k < 80 && made < 18; k++) {
    const x = rnd() < 0.5 ? -104.1 : -102.4, z = -56 + rnd() * 106, p = { x, z };
    if (!farSand(p, 0.5, true) || groups.some(q => q.id === 'walker' && Math.hypot(q.x - x, q.z - z) < 2)) continue;
    made++; group('walker', 'beach', x, z, () => person(x, ground + 0.07, z, rnd() < 0.5 ? 0 : Math.PI, 'stand', casualLook()));
  }
  const bike = layout.bike;
  for (let k = 0, made = 0; k < 40 && made < 5; k++) {
    const i = 2 + Math.floor(rnd() * (bike.length - 4)), a = bike[i], b = bike[i + 1], p = { x: a.x + (rnd() - 0.5) * 1.2, z: a.z };
    if (!farSand(p, 1.5, true) || groups.some(q => q.id === 'cyclist' && Math.hypot(q.x - p.x, q.z - p.z) < 12)) continue;
    made++;
    const heading = Math.atan2(b.x - a.x, b.z - a.z) + (rnd() < 0.5 ? Math.PI : 0), f = frame(p.x, p.z, heading), look = casualLook(), y = ground + 0.02;
    group('cyclist', 'beach', p.x, p.z, () => {
      for (const v of [-0.55, 0.55]) f.box(0, y, v, 0.05, 0.66, 0.66, C.dark);
      f.box(0, y + 0.42, 0, 0.06, 0.06, 1.0, pick(C.bike)); f.box(0, y + 0.42, 0.45, 0.06, 0.45, 0.06, C.dark); f.box(0, y + 0.85, 0.48, 0.5, 0.04, 0.04, C.dark);
      f.box(0, y + 0.42, -0.1, 0.3, 0.5, 0.16, look.bottom); f.box(0, y + 0.85, 0.05, 0.4, 0.52, 0.24, look.top, 0); f.box(0, y + 1.37, 0.12, 0.2, 0.24, 0.22, look.skin);
      f.box(0, y + 1.58, 0.11, 0.22, 0.08, 0.26, look.hair); people++;
    });
  }
  return { geometry: g, groups, people };
}
export type SantaBeachLife = ReturnType<typeof santaBeachLife>;

/** Builds the batch now (one draw call, cast shadows). The scene must already hold the venue's terrain. */
export function buildSantaBeachLife(scene: Scene, track: TrackDefinition, layout: SantaLayout, materials: Map<string, StandardMaterial>) {
  const life = santaBeachLife(track, layout), mesh = new Mesh('santa-beach-life', scene);
  life.geometry.toVertexData().applyToMesh(mesh);
  const material = new StandardMaterial('santa-beach-life', scene); material.diffuseColor.setAll(1); material.specularColor.setAll(0.05);
  material.backFaceCulling = false; material.twoSidedLighting = true; material.metadata = { absoluteVertexColors: true };
  materials.set('santa-beach-life', material); mesh.material = material; mesh.isPickable = false; mesh.receiveShadows = true;
  mesh.metadata = { santaBeachLife: { people: life.people, groups: life.groups.length } };
  return { mesh, material, life };
}
