import { assetUrl } from './urls';
import { VEHICLE_DIMENSIONS } from '../core/vehicle-size';

export const paintFinishes = [
  { id: 'glacier', name: 'Stainless steel gray', color: '#aeb4b8' },
  { id: 'crimson', name: 'Crimson', color: '#d51f35' },
  { id: 'cobalt', name: 'Cobalt blue', color: '#3b79e6' },
  { id: 'solar', name: 'Solar yellow', color: '#f1be37' },
  { id: 'verdant', name: 'Verdant green', color: '#45a77b' },
  { id: 'ultraviolet', name: 'Ultraviolet', color: '#a477e5' },
] as const;

/** Stable paint IDs preserve saved choices. Steel is the fresh-install/default finish. */
export const defaultPaintId = 'glacier';
/** Stable button identities keep the red interface independent of each driver's car paint. */
export const abilityControlColors = ['#d51f35', '#3b79e6', '#f1be37', '#45a77b'] as const;
export const vehicleMaterials = {
  steel: { metallic: .86, roughness: .28, coat: .32, coatRoughness: .2, brushing: .035 },
  painted: { metallic: .5, roughness: .23, coat: 1, coatRoughness: .1 },
  glass: { color: '#17252f', metallic: .18, roughness: .105, coat: .85 },
  carbon: { color: '#141a20', metallic: .3, roughness: .4 },
  metal: { color: '#aeb4b8', metallic: .86, roughness: .28 },
  wheels: { metallic: .65, roughness: .32 },
};

export interface PresentationTheme {
  id: 'coastal' | 'graphite';
  branding: { title: string; tagline: string; logo: string };
  typography: { body: string; display: string };
  /**
   * Interface tokens (CSS custom properties, kebab-cased by applyTheme). `fill` is the solid button colour and
   * `accentText` its label; `accent` marks selection and focus; `highlight` is small accent text (eyebrows);
   * `glass` is the translucent panel colour over the 3D scene or key art.
   */
  ui: { surface: string; glass: string; text: string; muted: string; accent: string; fill: string; accentText: string; highlight: string; border: string; radius: string };
  scene: { water: string; shallows: string; foam: string; terrain: string; embankment: string; asphalt: string; structure: string; shoulder: string; curb: string; paint: string; glass: string; foliage: string; foliageLight: string; rock: string; trunk: string; route: string; paceFast: string; sky: string; sunlight: number };
  players: string[];
  venue: { concrete: string; metal: string; accent: string; rubber: string; marking: string; repair: string };
  pace: { slow: string; medium: string; fast: string; width: number; outlineWidth: number; racingWidth: number; racingOutlineWidth: number };
}

export const themes: Record<string, PresentationTheme> = {
  coastal: {
    id: 'coastal',
    branding: { title: 'ROADSTER RACE', tagline: 'Your line. Your race.', logo: assetUrl('assets/mark.svg') },
    typography: { body: 'Barlow, system-ui, -apple-system, sans-serif', display: '"Barlow Condensed", Impact, sans-serif' },
    ui: { surface: '#111820', glass: 'rgb(12 17 24 / 86%)', text: '#f4f5f6', muted: '#a9b4be', accent: '#f0444b', fill: '#d9303a', accentText: '#ffffff', highlight: '#ff7a7f', border: 'rgb(255 255 255 / 12%)', radius: '14px' },
    scene: { water: '#216574', shallows: '#5a9e9c', foam: '#d1e5da', terrain: '#c7b78d', embankment: '#a7ae8a', asphalt: '#b0b6ba', structure: '#26313b', shoulder: '#9a9586', curb: '#ede9de', paint: '#aeb4b8', glass: '#13212c', foliage: '#344d36', foliageLight: '#687349', rock: '#b7b5a5', trunk: '#786b53', route: '#ff4c48', paceFast: '#4ce879', sky: '#a4b8c1', sunlight: 1.0 },
    players: ['#4caaff', '#ffac4c', '#ba91ff', '#56e0d2'],
    venue: { concrete: '#c6c8be', metal: '#7e8a8d', accent: '#bd303b', rubber: '#222c31', marking: '#e8e5d8', repair: '#41494a' },
    pace: { slow: '#ff4c48', medium: '#ffd15a', fast: '#4ce879', width: 10, outlineWidth: 14, racingWidth: 8, racingOutlineWidth: 11 },
  },
  graphite: {
    id: 'graphite',
    branding: { title: 'ROADSTER / RACE', tagline: 'Find your flow.', logo: assetUrl('assets/mark-graphite.svg') },
    typography: { body: 'Barlow, system-ui, -apple-system, sans-serif', display: 'Barlow, system-ui, sans-serif' },
    ui: { surface: '#172022', glass: 'rgb(20 31 32 / 88%)', text: '#f1f5e8', muted: '#b8c6bd', accent: '#d7f877', fill: '#d7f877', accentText: '#18291e', highlight: '#e3fba6', border: 'rgb(241 245 232 / 14%)', radius: '14px' },
    scene: { water: '#234d60', shallows: '#4a8e91', foam: '#b1dace', terrain: '#b8b69b', embankment: '#b7c5b1', asphalt: '#b3c0c7', structure: '#263b40', shoulder: '#919b86', curb: '#e4dfcb', paint: '#aeb4b8', glass: '#182e35', foliage: '#3a6357', foliageLight: '#839b73', rock: '#b1bdb4', trunk: '#81765f', route: '#dcf896', paceFast: '#f3aa6c', sky: '#739597', sunlight: 0.85 },
    players: ['#d7f877', '#f3aa6c', '#bea3e9', '#ec9cbe'],
    venue: { concrete: '#b8c1b6', metal: '#74898a', accent: '#bd303b', rubber: '#182b2e', marking: '#e7ecd9', repair: '#3b4b4c' },
    pace: { slow: '#ff4c48', medium: '#ffd15a', fast: '#4ce879', width: 10, outlineWidth: 14, racingWidth: 8, racingOutlineWidth: 11 },
  },
};

/** Presentation only: camera, lighting and quality never enter route compilation or physics. */
export const sceneTuning = {
  vehicle: { racingScale: 1.12 * VEHICLE_DIMENSIONS.scale, landingCompression: 0.09, contactCompression: 0.05, impactDuration: 0.22, groundLift:0.13, contactGap:.01,shadowGap:.008,shadowMaxScale:2.5,shadowTriangles:512,suspensionTravel:0.22, tireMarkLift:0.16,projectedMarkLift:.025 },
  camera: { elevationDegrees: 42, compactElevationDegrees: 65, terrainElevationDegrees: [50,58,65,72], terrainVerticalFov: 0.3, azimuthDegrees: 5, verticalFov: 0.5, fittingMargin: 1, clearancePixels: 6, phoneRunoffClearancePixels: 20, azimuthStep: 5 },
  grading: { exposure: 1.16, contrast: 1.1 },
  lighting: { ambient: 0.55, sunlight: 1.25, shadowDarkness: 0.32, contactHardening: 0.012 },
};

/**
 * Graphics tiers. Presentation only: no tier changes the fixed-step simulation, timing or input.
 * The draw-call targets (90 Time Trial / 150 four cars) are verified at Medium. Post-processing
 * passes and the ambient-occlusion pre-pass add screen passes on High/Ultra, not scene geometry.
 */
export type GraphicsLevel = 'low' | 'medium' | 'high' | 'ultra';
export const graphicsLevels: readonly GraphicsLevel[] = ['low', 'medium', 'high', 'ultra'];
export interface GraphicsTier {
  label: string;
  /** Rendered megapixels for the canvas; large tablets render below their native density. */
  pixelBudget: number;
  maxPixelRatio: number;
  shadowMapSize: number;
  /** PCSS gives contact-hardening soft shadows; PCF a uniform soft edge. */
  shadowFilter: 'pcf' | 'pcss';
  shadowQuality: 'low' | 'medium' | 'high';
  /** Real-sky (CC0 HDRI) image lighting and reflections; Low keeps the small procedural sky. */
  skyLighting: boolean;
  /** World-space procedural normal detail, tonal variation and animated water. */
  surfaceDetail: boolean;
  detailTextureSize: 128 | 256;
  postProcessing: false | { msaa: number; fxaa: boolean; bloom: boolean; sharpen: number };
  ambientOcclusion: false | { ratio: number; samples: number; radius: number; strength: number };
  screenReflections: boolean;
}
export const graphicsTiers: Record<GraphicsLevel, GraphicsTier> = {
  low: { label: 'Low', pixelBudget: 0.9, maxPixelRatio: 1, shadowMapSize: 1024, shadowFilter: 'pcf', shadowQuality: 'low', skyLighting: false, surfaceDetail: false, detailTextureSize: 128, postProcessing: false, ambientOcclusion: false, screenReflections: false },
  medium: { label: 'Medium', pixelBudget: 1.6, maxPixelRatio: 1.5, shadowMapSize: 2048, shadowFilter: 'pcf', shadowQuality: 'medium', skyLighting: true, surfaceDetail: true, detailTextureSize: 128, postProcessing: false, ambientOcclusion: false, screenReflections: false },
  high: { label: 'High', pixelBudget: 2.6, maxPixelRatio: 2, shadowMapSize: 2048, shadowFilter: 'pcss', shadowQuality: 'medium', skyLighting: true, surfaceDetail: true, detailTextureSize: 256, postProcessing: { msaa: 4, fxaa: false, bloom: true, sharpen: 0.18 }, ambientOcclusion: { ratio: 0.5, samples: 8, radius: 2.4, strength: 1.1 }, screenReflections: false },
  ultra: { label: 'Ultra', pixelBudget: 4.6, maxPixelRatio: 2.5, shadowMapSize: 4096, shadowFilter: 'pcss', shadowQuality: 'high', skyLighting: true, surfaceDetail: true, detailTextureSize: 256, postProcessing: { msaa: 4, fxaa: true, bloom: true, sharpen: 0.22 }, ambientOcclusion: { ratio: 0.75, samples: 16, radius: 2.4, strength: 1.2 }, screenReflections: true },
};
/** Automatic tier adaptation: step down when the measured frame time stays above budget. */
export const graphicsGovernor = { warmupSeconds: 3, windowSeconds: 4, frameBudgetMs: 1000 / 45, ignoreFrameMs: 250 };
export const postEffects = { bloomThreshold: 0.88, bloomWeight: 0.32, bloomKernel: 48, bloomScale: 0.5, ssrStrength: 0.55, ssrMaxDistance: 120 };
/** Film-style grade on High/Ultra (Babylon ColorCurves: hue in degrees, others -100..100): warm highlights, cool shadows. */
export const colorGrade = { saturation: 8, highlights: { hue: 38, density: 12, saturation: 14 }, shadows: { hue: 205, density: 14, saturation: 12 } };

/** Biome colors stay independent of interface branding and the driver's selected paint. */
export const sceneryPalettes = {
  yosemite:{terrain:'#61816a',embankment:'#859070',asphalt:'#8f826b',shoulder:'#a5a079',structure:'#5a6552',curb:'#ddd4b9',glass:'#39564b',foliage:'#254f3a',foliageLight:'#658351',rock:'#c5c2b3',trunk:'#795d40',water:'#367f84',foam:'#dfefdd',sky:'#afd5d9',sunlight:1.05},
  alpine: {terrain:'#dce7ee',embankment:'#b9cad6',asphalt:'#8ca6b9',shoulder:'#d2e0e9',structure:'#3b4f59',curb:'#edf5f7',glass:'#304f60',foliage:'#34564e',foliageLight:'#5e7970',rock:'#87959f',trunk:'#716357',water:'#23647f',foam:'#c4e3ec',sky:'#b1d3e3',sunlight:.96},
  'night-city': { terrain:'#253348',embankment:'#3a4960',asphalt:'#a6b5cf',shoulder:'#41506b',structure:'#24314b',curb:'#c2d4ec',glass:'#15243c',foliage:'#254455',foliageLight:'#416477',rock:'#45546c',trunk:'#4a4658',water:'#122b41',foam:'#668ca2',sky:'#0b1227',sunlight:.42 },
  coastal: { terrain: '#dec697', embankment: '#a2ae7c', water: '#277e8d', shallows: '#76b8af', foliage: '#3e644a', foliageLight: '#839757' },
  sunset: { terrain: '#e4c59d', embankment: '#c8a47e', asphalt: '#9ca4ad', shoulder: '#ba9c7c', structure: '#765d60', foliage: '#526e58', foliageLight: '#8d9e68', rock: '#c5ac92', trunk: '#9c735a', water: '#388ca2', shallows: '#6bb5b9', foam: '#f1dbc3', sky: '#e5a3a0', sunlight: 1.08 },
  bay: { terrain: '#b9c2a6', embankment: '#bdbea8', asphalt: '#a7b2b8', shoulder: '#b5aa8f', structure: '#34434d', foliage: '#4c6857', foliageLight: '#879873', rock: '#b4b8ae', trunk: '#7e7769', water: '#3b8196', shallows: '#689b9c', foam: '#d7e8df', sky: '#b1ccd1', sunlight: 1.05 },
  spaceport: { terrain: '#d1bc9b', embankment: '#a69a85', asphalt: '#aeb1ad', shoulder: '#a99c85',
    structure: '#33404b', curb: '#e8e8dd', glass: '#243746', foliage: '#68674b', foliageLight: '#8d8863',
    rock: '#a69883', trunk: '#7d715d', sky: '#cfae94', sunlight: 1.05 },
  canyon: { terrain:'#bd8963',embankment:'#c69c72',asphalt:'#805d43',shoulder:'#b58b62',rock:'#ae6344',foliage:'#68724b',foliageLight:'#8c9565',trunk:'#765640',water:'#98785d',sky:'#e5c6a5',sunlight:1.08 },
} satisfies Record<string, Partial<PresentationTheme['scene']>>;
export const sceneryLighting = {
  yosemite:{ambient:'#d9e7d9',ground:'#67775b',sun:'#ffdfaa'},
  alpine: {ambient:'#d6e8f5',ground:'#8299aa',sun:'#fff1d9'},
  'night-city': {ambient:'#a4bce8',ground:'#3e4768',sun:'#9bbaff'},
  coastal: { ambient: '#d6e5ed', ground: '#6e6957', sun: '#fff0cf' },
  sunset: { ambient: '#f7c9cb', ground: '#816c77', sun: '#ffd29b' },
  bay: { ambient: '#dcebf1', ground: '#717b6b', sun: '#fff1d5' },
  spaceport: { ambient: '#ddd6cf', ground: '#756755', sun: '#ffddb2' },
  canyon: { ambient:'#ead3b8',ground:'#836451',sun:'#ffdab0' },
};
/**
 * Real-sky lighting per venue: prefiltered CC0 HDRIs baked by `pnpm bake:env` into
 * public/assets/env/. The sky is turned so its brightest direction agrees with the sun.
 */
export const venueSkies = {
  yosemite:{file:'sky',intensity:.85,waterReflection:.7},
  alpine: {file:'sky',intensity:.8,waterReflection:.65},
  coastal: { file: 'sky', intensity: 0.85, waterReflection: 0.75 },
  spaceport: { file: 'dawn', intensity: 0.8, waterReflection: 0.7 },
  bay: { file: 'sky', intensity: 0.85, waterReflection: 0.8 },
  sunset: { file: 'sunset', intensity: 0.95, waterReflection: 0.6 },
  canyon: { file: 'dawn', intensity: 0.85, waterReflection: 0.6 },
  'night-city': { file: 'night', intensity: 0.7, waterReflection: 1 },
} satisfies Record<keyof typeof sceneryLighting, { file: string; intensity: number; waterReflection: number }>;
/**
 * Newport harbour dressing (presentation only; src/presentation/newport.ts). Angles and rings are
 * relative to the coastal island ellipse (85 × 62 m; ring 1 = shore, 1.25 = outer edge of its
 * shelf). Scales convert the CC0 Kenney models to metres (boats ~8 m, houses ~10 m).
 */
export const newportHarbour = {
  seed: 7, draft: 0.28, boatScale: 2.3, houseScale: 6, palmScale: 1.5, breeze: 2.3, berthStart: 5, berthGap: 0.9,
  dock: { length: 6, width: 2.2, deck: '#a8845d', piling: '#5c4636' },
  /** Marina piers run out from the beach at these ellipse angles (east end, west end, north shore). */
  piers: [
    { angle: 0.16, boats: ['boat-speed-a', 'boat-sail-a', 'boat-speed-c', 'boat-house-b'] },
    { angle: -0.22, boats: ['boat-sail-b', 'boat-speed-g', 'boat-fishing-small'] },
    { angle: Math.PI - 0.2, boats: ['boat-sail-a', 'boat-speed-i', 'boat-speed-b', 'boat-sail-b'] },
    { angle: Math.PI + 0.16, boats: ['boat-house-b', 'boat-speed-a', 'boat-speed-c'] },
    { angle: Math.PI + 0.48, boats: ['boat-fishing-small', 'boat-speed-g'] },
    { angle: -1.3, boats: ['boat-speed-b', 'boat-sail-a'] },
  ],
  islets: [
    { angle: 0.66, ring: 1.52, length: 34, width: 14, houses: ['house-b', 'house-n-blue', 'house-e'], boats: ['boat-speed-a', 'boat-sail-a', 'boat-speed-g'], palms: [-0.92, 0.9] },
    { angle: Math.PI - 0.66, ring: 1.52, length: 34, width: 14, houses: ['house-d', 'house-s', 'house-g'], boats: ['boat-sail-b', 'boat-speed-c', 'boat-speed-i'], palms: [-0.9, 0.92] },
    { angle: -0.62, ring: 1.54, length: 34, width: 14, houses: ['house-u', 'house-a', 'house-d-blue'], boats: ['boat-speed-b', 'boat-house-b', 'boat-speed-a'], palms: [-0.92, 0.9] },
    { angle: Math.PI + 0.64, ring: 1.54, length: 34, width: 14, houses: ['house-c', 'house-b-blue', 'house-h'], boats: ['boat-fishing-small', 'boat-speed-g', 'boat-sail-a'], palms: [-0.9, 0.92] },
  ],
  /** Moored boats in the shallows (rings beyond the shore), clear of piers, islets and the grandstand side. */
  moorings: { step: 0.15, pierClearance: 0.2, isletClearance: 0.3, avoid: [[1.2, 1.95]] as [number, number][], rings: [1.13, 1.21, 1.17], boats: ['boat-sail-a', 'boat-speed-c', 'boat-sail-b', 'boat-speed-i', 'boat-row-small', 'boat-speed-a', 'boat-sail-a', 'boat-speed-b', 'boat-fishing-small', 'boat-speed-g'] },
  buoys: { ring: 1.27, step: 0.5, offset: 0.25 },
  underWay: [
    { key: 'boat-sail-b', ring: 1.33, speed: 2.4, phase: 0.4 },
    { key: 'boat-speed-i', ring: 1.34, speed: 4.6, phase: 2.5 },
    { key: 'boat-fishing-small', ring: 1.33, speed: 3, phase: 4.5 },
  ],
};

/**
 * Home key art (public/assets/hero/<id>-wide.webp and -tall.webp; provenance in docs/ASSET_RIGHTS.md).
 * One picture is chosen at random each time the player arrives on Home. `wide`/`tall` are CSS
 * object-position focus points that keep the cars in frame when a screen crops the picture.
 */
export const heroImages = [
  { id: 'thruster-hop', wide: '78% 50%', tall: '50% 28%' },
  { id: 'drivers-grid', wide: '66% 60%', tall: '62% 58%' },
  { id: 'door-to-door', wide: '70% 50%', tall: '45% 50%' },
  { id: 'water-jump', wide: '45% 66%', tall: '68% 44%' },
  { id: 'canyon-jump', wide: '58% 30%', tall: '40% 50%' },
] as const;

/**
 * World-space surface detail by material role (scenery-specific roles override the shared ones).
 * kind selects a procedural tile; scale is metres per tile; normal is the bump strength;
 * variation the broad tonal mottling. Water adds animated waves and sky reflection.
 */
export type SurfaceKind = 'asphalt' | 'sand' | 'dirt' | 'concrete' | 'grass' | 'rock' | 'water';
export interface SurfaceFinish { kind: SurfaceKind; scale: number; normal: number; variation: number; walls?: boolean; reflection?: number; roughness?: number; specular?: number; gloss?: number }
export const surfaceFinishes: Record<string, SurfaceFinish> = {
  asphalt: { kind: 'asphalt', scale: 10, normal: 0.35, variation: 0.1, specular: 0.09, gloss: 28 },
  'asphalt-repair': { kind: 'asphalt', scale: 10, normal: 0.3, variation: 0.08 },
  'rubbered-racing-surface': { kind: 'asphalt', scale: 10, normal: 0.2, variation: 0.06 },
  shoulder: { kind: 'dirt', scale: 12, normal: 0.5, variation: 0.14 },
  terrain: { kind: 'sand', scale: 26, normal: 0.6, variation: 0.16 },
  'wet-sand': { kind: 'sand', scale: 20, normal: 0.3, variation: 0.12, reflection: 0.15, roughness: 0.5, specular: 0.2, gloss: 48 },
  embankment: { kind: 'grass', scale: 14, normal: 0.55, variation: 0.18 },
  'barrier-concrete': { kind: 'concrete', scale: 8, normal: 0.25, variation: 0.07 },
  'city-paving': { kind: 'concrete', scale: 10, normal: 0.3, variation: 0.1 },
  'pier-timber': { kind: 'concrete', scale: 8, normal: 0.2, variation: 0.1 },
  rock: { kind: 'rock', scale: 9, normal: 0.7, variation: 0.14, walls: true },
  'mesa-cap': { kind: 'rock', scale: 14, normal: 0.6, variation: 0.12, walls: true },
  'sandstone-*': { kind: 'rock', scale: 16, normal: 0.6, variation: 0.1, walls: true },
  // Procedural landscape (landscape/): colour lives in the vertices, the finish adds grain and relief.
  'landscape-rock': { kind: 'rock', scale: 5, normal: 0.55, variation: 0.08, walls: true },
  'canyon-trail-rock': { kind: 'rock', scale: 4, normal: 0.6, variation: 0.1, walls: true },
  'landscape-plants': { kind: 'grass', scale: 1.6, normal: 0.8, variation: 0.14, walls: true },
  foliage: { kind: 'grass', scale: 2.5, normal: 0.9, variation: 0.22, walls: true },
  foliageLight: { kind: 'grass', scale: 2.5, normal: 0.9, variation: 0.22, walls: true },
  trunk: { kind: 'rock', scale: 1.5, normal: 0.6, variation: 0.12, walls: true },
  architecture: { kind: 'concrete', scale: 6, normal: 0.15, variation: 0.06, walls: true },
  'city-facade': { kind: 'concrete', scale: 6, normal: 0.15, variation: 0.07, walls: true },
  water: { kind: 'water', scale: 30, normal: 0.5, variation: 0.08, reflection: 0.6, roughness: 0.16, specular: 0.3, gloss: 150 },
  shallows: { kind: 'water', scale: 24, normal: 0.35, variation: 0.08, reflection: 0.4, roughness: 0.25 },
  'architecture-glass': { kind: 'concrete', scale: 40, normal: 0, variation: 0, reflection: 0.65, roughness: 0.12 },
  'city-shopfront': { kind: 'concrete', scale: 40, normal: 0, variation: 0, reflection: 0.4, roughness: 0.2 },
  'galvanized-rail': { kind: 'concrete', scale: 40, normal: 0, variation: 0, reflection: 0.35, roughness: 0.35 },
  'orbital-metal': { kind: 'concrete', scale: 40, normal: 0, variation: 0, reflection: 0.35, roughness: 0.3 },
  'bay-metal': { kind: 'concrete', scale: 40, normal: 0, variation: 0, reflection: 0.3, roughness: 0.35 },
};
export const sceneryFinishes: Partial<Record<keyof typeof sceneryLighting, Record<string, SurfaceFinish>>> = {
  yosemite:{terrain:{kind:'dirt',scale:22,normal:.3,variation:.06},asphalt:{kind:'dirt',scale:12,normal:.4,variation:.1},shoulder:{kind:'dirt',scale:15,normal:.3,variation:.1},'yosemite-granite':{kind:'rock',scale:14,normal:.28,variation:.07,walls:true}},
  alpine: {terrain:{kind:'sand',scale:18,normal:.18,variation:.04},asphalt:{kind:'dirt',scale:10,normal:.15,variation:.045},shoulder:{kind:'sand',scale:14,normal:.2,variation:.04},'tahoe-granite':{kind:'rock',scale:5,normal:.5,variation:.08,walls:true}},
  // Golden Gate paints its land in full colour; the finish adds only fine grain. The shore carries vertex colour.
  bay: { terrain: { kind: 'grass', scale: 16, normal: 0.55, variation: 0.18 }, 'city-ground': { kind: 'dirt', scale: 6, normal: 0.3, variation: 0.05 }, 'golden-shore': { kind: 'dirt', scale: 14, normal: 0.5, variation: 0.1 } },
  // Launchsite paints its own ground; its sand keeps fine, low ripples so the paint reads.
  spaceport: { terrain: { kind: 'sand', scale: 11, normal: 0.4, variation: 0.1 } },
  // Newport and Santa Monica paint their beaches; fine, low ripples keep the paint readable.
  coastal: { terrain: { kind: 'sand', scale: 11, normal: 0.45, variation: 0.1 } },
  sunset: { terrain: { kind: 'sand', scale: 11, normal: 0.4, variation: 0.1 } },
  canyon: { terrain: { kind: 'dirt', scale: 22, normal: 0.7, variation: 0.18 }, asphalt: { kind: 'dirt', scale: 12, normal: 0.55, variation: 0.14 }, shoulder: { kind: 'dirt', scale: 16, normal: 0.6, variation: 0.16 } },
  'night-city': { terrain: { kind: 'concrete', scale: 12, normal: 0.3, variation: 0.12 }, 'la-ground': { kind: 'concrete', scale: 12, normal: 0.3, variation: 0.06 }, asphalt: { kind: 'asphalt', scale: 10, normal: 0.35, variation: 0.08, reflection: 0.2, roughness: 0.45, specular: 0.14, gloss: 60 } },
};

export const canyonAppearance={cliff:['#a85f43','#bc7850','#d39464','#e1ad79'],mesa:'#c6986b',road:'#aa895d',ruts:'#705c42',dryWash:'#d9b891',scrub:'#68724b',guard:'#96745a'};
/** Cosmetic trail geology: actual support edges/elevations stay authoritative. */
export const canyonIntegration = {
  floor: -2.6, bankLayers: 16, baseSpread: 1.65, bedHeight: 1.15,
  rimRoughness: 1.1, roadRoughness: 0.9, roadFeather: 1.8,
  cliffErosion: 0.55,
  strata: ['#a65d43', '#bf7852', '#d69b6c', '#bd7350', '#ddb48a', '#ac6347', '#c78b61'],
  cap: '#c49b72', dust: '#b98159', shade: '#6f4437',
  shoulderMapSize: 2048,
};
export const nightAppearance={facades:['#384863','#52445c','#354e5e','#61534f','#445c70','#655769'],neon:['#fa5ca8','#49d8ef','#d9a674'],window:'#ffdc9d',darkWindow:'#111d32',signBackground:'#11162b',poolOpacity:.48,glowIntensity:.4,glowTextureSize:256,glowKernel:24,ambientIntensity:.8,vehicleFill:.55,gameExposure:1.12,menuExposure:.65};
export function sceneryTheme(theme: PresentationTheme, scenery: keyof typeof sceneryPalettes): PresentationTheme {
  return { ...theme, scene: { ...theme.scene, ...sceneryPalettes[scenery] } };
}

export function applyTheme(theme: PresentationTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  for (const [key, value] of Object.entries(theme.ui)) root.style.setProperty(`--${key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}`, value);
  root.style.setProperty('--font-body', theme.typography.body);
  root.style.setProperty('--font-display', theme.typography.display);
  root.style.setProperty('--water', theme.scene.water);
  root.style.setProperty('--pace-slow', theme.pace.slow);
  root.style.setProperty('--pace-medium', theme.pace.medium);
  root.style.setProperty('--pace-fast', theme.pace.fast);
  applyPlayerColors(theme.players);
  setIdentityColors('control', abilityControlColors);
  document.title = `${theme.branding.title.replace(' / ', ' ')} — ${theme.branding.tagline}`;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme.scene.water);
}

export function applyPlayerColors(colors: readonly string[]) {
  setIdentityColors('player', colors);
}

function setIdentityColors(prefix: 'player' | 'control', colors: readonly string[]) {
  const root = document.documentElement;
  colors.forEach((color, i) => {
    root.style.setProperty(`--${prefix}-${i + 1}`, color);
    const rgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    root.style.setProperty(`--${prefix}-${i + 1}-ink`, luminance < 0.179 ? '#ffffff' : '#000000');
  });
}

export const thrustEffects = { capacity: 96, emission: 120, lifetime: 0.8, exhaustSpeed: 5, startSize: 0.45, expansion: 2.1, opacity: 0.66, color: "#e1eff3", coreColor: "#e6fbff", coreOpacity: 0.72 };
export const hopEffects = { pulse: 0.22, nozzleHeight: 0.20, puffs: 16, lifetime: 0.6, downwardSpeed: 18, size: 0.65, mounts: [{ x: -0.52, z: -1.8 }, { x: 0.52, z: -1.8 }, { x: -0.52, z: 1.8 }, { x: 0.52, z: 1.8 }], coreColor: '#eef8ff', maxBodyPitch: 0.12 };

/** Shared city materials; architecture placement is authored in content/golden-city.ts. */
export const cityAppearance = { bridge: '#cb4b36', facades: ['#caba91', '#8aa49a', '#bb8068', '#9daabb', '#d8be8d', '#9b8173'], paving: '#bbb7a6', roof: '#52616a', shop: '#354953', window: '#456575', warmWindow: '#b9bd9d' };
export const sunsetAppearance = { deck: '#a9866b', steel: '#465360', ivory: '#f6e4cc', glass: '#4a7e91', coral: '#e67b77', gold: '#eec575' };

/** Decorative density/scale only. All geometry is batched and stays on existing structures. */
export const venueDetail = { floorSpacing: 1.9, rockLayers: 7, mesaStones: 34, stoneScale: 1.15,
  strataContrast: .12, dirtWearOpacity: .12, dirtTextureScale: 3 };

export const ghostAppearance = { color: '#a6e5ed', opacity: 0.32 };

export const snowyTahoeAppearance = {
  surfaceOffsets:{road:.12,branch:.13,fringe:.045,branchFringe:.055},
  snow:'#dce7ee',packed:'#8ca6b9',ruts:'#7e99aa',powder:'#eef5f7',fir:'#304f46',firLight:'#526f63',bark:'#6d5a48',rock:'#87959f',timber:'#8e7254',lodge:'#a28869',roof:'#c9dbe5',window:'#dcb77b',lake:'#23647f',
  extent:{minX:-320,maxX:340,minZ:-270,maxZ:300},corridor:24,treeCount:460,
  cabin:'#a06c45',stone:'#89969f',lift:'#b73f46',steel:'#3e5361',cutTimber:'#cbb087',
  weather:{flakes:1050,groundWisps:48,size:.95,opacity:.72,fallSpeed:4.4,gustPeriod:19,wind:6,nearCourse:.74,wispSize:5.5,wispOpacity:.11},
  slopeGrooming:{spacing:6,width:.16,inset:2.3,minimumGrade:.25,surfaceGap:.018},
  liftSpeed:3.8,
};

/** Original granite-valley presentation; all physical heights/footprints come from the track. */
export const yosemiteAppearance={
 extent:{minX:-280,maxX:300,minZ:-220,maxZ:320},cameraElevation:58,road:'#8f8065',shoulder:'#a3936d',meadow:'#728363',dryMeadow:'#a69d71',forestFloor:'#56644c',forest:'#34553d',forestLight:'#70865a',bark:'#71563e',granite:['#aeb6b1','#c9c8b9','#e2ddce','#737f83'],lichen:'#727b4e',timber:'#896648',roof:'#495548',window:'#b9d5bf',water:'#438c8d',waterDeep:'#285b6c',foam:'#dcebdc',
 treeCount:580,treeHeight:[11,25],cedar:'#3c644c',fern:'#426c42',grass:'#8b995a',flowers:'#d4c37c',surfaceOffsets:{road:.12,branch:.13,fringe:.045,branchFringe:.055},mist:{count:18,opacity:.04,speed:.42},
 waterfall:{speed:.8,sprayCount:36,dropletCount:54,gravity:28,opacity:.92,sprayOpacity:.48,wetRock:'#657b7b',lipFraction:.84,lipRadius:.88,waterRadius:.89,halfAngle:.29,curtainWidth:7.2,basinWidth:8.6,basinDepth:3.6,basinHeight:.75,angle:Math.PI/2+.04},
 dressing:{roadWorn:'#b0a07d',roadEdge:'#857d60',barkDark:'#4d3a2c',cutWood:'#c8ab77',stonework:'#a2a18f',trim:'#d6cfac',roofSeam:'#687166'},
};
